/**
 * CANLI DONANIM (HIL) — ESP32 istasyonu → POST /api/ingest → burada işlenir → SSE.
 * Cihaz 20 sn veri göndermezse "simüle cihaz" devreye girer (sahnede kimse fark etmez, rozet değişir).
 * Simüle cihaz, operatör/sunucu ekranından "kuru saksı / ıslak saksı" komutlarıyla sürülür.
 */
import { detectMoistureSpike, detectSeqRegression, detectTamper, signatureFlag } from "@/engine/anomaly";
import { evaluateStation } from "@/engine/decision";
import { DEFAULT_THRESHOLDS } from "@/engine/thresholds";
import type { StationFlag, StationReading } from "@/engine/types";
import type { DeviceState, LiveReading } from "@/lib/live-types";
import { STATION } from "@/sim/parcels";
import { audit } from "./audit";
import { publish } from "./bus";
import { db } from "./db";

export const SILENT_MS = 20_000;
const HOST_SOIL = "killi" as const; // istasyonun bulunduğu P-1182 toprağı

interface DeviceMem {
  lastRealMs: number | null;
  lastSeq: number | null;
  readings: LiveReading[];
  flags: StationFlag[];
  simPot: "islak" | "kuru";
  simValue: number;
  simTimer: ReturnType<typeof setInterval> | null;
  simEnabled: boolean;
  lastLatencyMs: number | null;
  lastPublishedStatus: DeviceState["status"] | null;
  simSeq: number;
  watchdog: ReturnType<typeof setInterval> | null;
  /** bu zamana kadar simüle cihaz hızlı ölçer (saksı değişimi sonrası) */
  fastUntil: number;
  lastSimStep: number;
}

const g = globalThis as unknown as { __agrishieldDevice?: DeviceMem };

function mem(): DeviceMem {
  if (!g.__agrishieldDevice) {
    g.__agrishieldDevice = {
      lastRealMs: null,
      lastSeq: null,
      readings: [],
      flags: [],
      simPot: "islak",
      simValue: 34.2,
      simTimer: null,
      simEnabled: process.env.DEVICE_SIM !== "0",
      lastLatencyMs: null,
      lastPublishedStatus: null,
      simSeq: 0,
      watchdog: null,
      fastUntil: 0,
      lastSimStep: 0,
    };
  }
  return g.__agrishieldDevice;
}

export function deviceStatus(): DeviceState["status"] {
  const m = mem();
  if (m.lastRealMs && Date.now() - m.lastRealMs < SILENT_MS) return "canli";
  return m.simEnabled ? "simule" : "sessiz";
}

function liveRain30(): number {
  const from = Date.now() - 30 * 86_400_000;
  return Math.round(mem().readings.filter((r) => r.receivedAt >= from).reduce((s, r) => s + (r.rainMm ?? 0), 0) * 10) / 10;
}

export function liveSoil(): number | null {
  const last = mem().readings[mem().readings.length - 1];
  return last?.soilMoisture ?? null;
}

export function liveFlags(): StationFlag[] {
  return [...mem().flags];
}

export function liveRain30Mm(): number {
  return liveRain30();
}

export function deviceState(): DeviceState {
  const m = mem();
  const last = m.readings[m.readings.length - 1] ?? null;
  const today = new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);
  const liveWitness = last
    ? evaluateStation({
        date: today,
        stationId: STATION.id,
        days: [],
        soilType: HOST_SOIL,
        thresholds: DEFAULT_THRESHOLDS,
        flags: m.flags,
        source: deviceStatus() === "canli" ? "canli" : "simule",
        liveSoilMoisture: last.soilMoisture,
        liveRain30: liveRain30(),
      })
    : null;
  return {
    status: deviceStatus(),
    deviceId: STATION.id,
    lastSeenMs: last?.receivedAt ?? null,
    seq: last?.seq ?? null,
    batteryV: last?.batteryV ?? null,
    lastReading: last,
    flags: [...m.flags],
    liveWitness,
    simPot: m.simPot,
    lastLatencyMs: m.lastLatencyMs,
  };
}

export function recentReadings(limit = 120): LiveReading[] {
  return mem().readings.slice(-limit);
}

function toStationReadings(): StationReading[] {
  return mem().readings.map((r) => ({ ts: r.receivedAt, soilMoisture: r.soilMoisture, rainMm: r.rainMm }));
}

/** Okumayı işler: anti-manipülasyon kuralları → canlı tanık → SSE */
function accept(r: LiveReading, tamper: boolean) {
  const m = mem();
  m.readings.push(r);
  if (m.readings.length > 600) m.readings.shift();
  const newFlags: StationFlag[] = [];
  const t = detectTamper({ ts: r.receivedAt, soilMoisture: r.soilMoisture, rainMm: r.rainMm, tamper });
  if (t) newFlags.push(t);
  const spike = detectMoistureSpike(toStationReadings());
  if (spike && !m.flags.some((f) => f.code === "supheli_nem_artisi" && r.receivedAt - f.ts < 60_000)) newFlags.push(spike);
  for (const f of newFlags) {
    m.flags.push(f);
    r.flags.push(f.code);
    void audit("device", `supheli_veri:${f.code}`, f.detail);
  }
  publish("reading", r);
  const st = deviceState();
  if (st.liveWitness) publish("witness", { scope: "live", witness: st.liveWitness });
  publish("device", st);
  m.lastPublishedStatus = st.status;
}

export interface IngestPacket {
  ts?: number;
  soilMoisture?: number;
  airTempC?: number;
  humidity?: number;
  rainMm?: number;
  windMs?: number;
  batteryV?: number;
  tamper?: boolean;
  seq?: number;
}

export async function ingestReal(p: IngestPacket, receivedAt: number, raw: string): Promise<{ flags: string[] }> {
  const m = mem();
  const wasLive = deviceStatus() === "canli";
  const seqFlag = detectSeqRegression(m.lastSeq, p.seq, receivedAt);
  const r: LiveReading = {
    source: "device",
    ts: p.ts ? p.ts * 1000 : receivedAt,
    receivedAt,
    soilMoisture: p.soilMoisture ?? null,
    airTempC: p.airTempC ?? null,
    humidity: p.humidity ?? null,
    rainMm: p.rainMm ?? 0,
    windMs: p.windMs ?? null,
    batteryV: p.batteryV ?? null,
    seq: p.seq ?? null,
    flags: [],
  };
  if (seqFlag) {
    m.flags.push(seqFlag);
    r.flags.push(seqFlag.code);
    await audit("device", "tekrar_saldirisi_suphesi", seqFlag.detail);
  } else if (p.seq != null) {
    m.lastSeq = p.seq;
  }
  m.lastRealMs = receivedAt;
  accept(r, Boolean(p.tamper));
  // gecikme: paket alındıktan SSE'ye verilene kadar (sunucu tarafı)
  m.lastLatencyMs = Date.now() - receivedAt;
  if (!wasLive) await audit("device", "cihaz_baglandi", `${STATION.id} canlı veri göndermeye başladı`);
  try {
    await db.reading.create({
      data: {
        ts: new Date(receivedAt),
        source: "device",
        stationId: STATION.id,
        soilMoisture: r.soilMoisture,
        airTempC: r.airTempC,
        humidity: r.humidity,
        rainMm: r.rainMm,
        windMs: r.windMs,
        flags: r.flags.length ? JSON.stringify(r.flags) : null,
        raw: raw.slice(0, 1000),
      },
    });
    await db.station.update({ where: { id: STATION.id }, data: { lastSeenAt: new Date(receivedAt), batteryV: r.batteryV ?? undefined, tamper: Boolean(p.tamper) } });
  } catch {
    /* veritabanı yazılamasa da canlı akış sürer */
  }
  return { flags: r.flags };
}

export async function recordSignatureFailure(detail: string) {
  const f = signatureFlag(Date.now());
  mem().flags.push(f);
  await audit("device", "imza_hatasi", detail.slice(0, 300));
  publish("device", deviceState());
}

/* ───────────── simüle cihaz (sahne yedeği) ───────────── */

const POT_VALUE = { islak: 34.2, kuru: 7.6 };

function simStep() {
  const m = mem();
  if (deviceStatus() === "canli" || !m.simEnabled) return;
  const target = POT_VALUE[m.simPot];
  const moving = Math.abs(target - m.simValue) > 0.3;
  // kapasitif prob yeni toprağa ~1–2 sn'de oturur
  m.simValue = moving ? m.simValue + (target - m.simValue) * 0.6 : target + (Math.random() - 0.5) * 0.4;
  const now = Date.now();
  const r: LiveReading = {
    source: "sim-device",
    ts: now,
    receivedAt: now,
    soilMoisture: Math.round(m.simValue * 10) / 10,
    airTempC: Math.round((24 + Math.random() * 0.6) * 10) / 10,
    humidity: Math.round(38 + Math.random() * 3),
    rainMm: 0,
    windMs: Math.round((1.2 + Math.random()) * 10) / 10,
    batteryV: 4.02,
    seq: ++m.simSeq,
    flags: [],
  };
  accept(r, false);
  m.lastLatencyMs = Date.now() - now;
}

export function ensureDeviceLoop() {
  const m = mem();
  if (m.simTimer) return;
  m.simTimer = setInterval(() => {
    const mm = mem();
    const now = Date.now();
    const interval = now < mm.fastUntil ? 400 : 3000;
    if (now - mm.lastSimStep >= interval) {
      mm.lastSimStep = now;
      simStep();
    }
  }, 100);
  m.watchdog = setInterval(() => {
    const st = deviceStatus();
    if (st !== m.lastPublishedStatus) {
      m.lastPublishedStatus = st;
      if (st !== "canli") void audit("device", "cihaz_sessiz", "20 sn veri yok → simüle cihaz");
      publish("device", deviceState());
    }
  }, 1000);
}

export function setSimPot(pot: "islak" | "kuru") {
  const m = mem();
  m.simPot = pot;
  m.fastUntil = Date.now() + 4000;
  // ilk ölçüm hemen: saksı değişimi ekranda gecikmesiz başlasın
  m.lastSimStep = Date.now();
  simStep();
  void audit("operator", "simule_cihaz", `saksı: ${pot}`);
}

export function setSimEnabled(on: boolean) {
  mem().simEnabled = on;
  publish("device", deviceState());
}

export function clearDeviceFlags(actor: "operator" | "sim" = "operator") {
  const m = mem();
  if (m.flags.length) void audit(actor, "istasyon_bayraklari_temizlendi", m.flags.map((f) => f.code).join(","));
  m.flags = [];
  publish("device", deviceState());
}

/** Sahne öncesi: simüle cihazı ıslak saksıya koy ve bayrakları temizle (sıçrama yüzünden bayrak düşmesin) */
export function resetDevice() {
  const m = mem();
  m.simPot = "islak";
  m.simValue = POT_VALUE.islak;
  // Geçmiş okumalar silinir: kurulum sırasında sensörün havadan toprağa geçmesi "ani artış" sayılmasın
  m.readings = [];
  m.flags = [];
  publish("device", deviceState());
}
