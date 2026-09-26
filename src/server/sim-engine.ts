/**
 * ZAMAN MAKİNESİ — sunucu tarafında tek gerçeğin kaynağı (AGRISHIELD_PROMPT.md 7.3).
 * Tüm ekranlar SSE'den beslenir; sahnede 2 ekran / 2 cihaz senkron kalır.
 *
 * Oynarken her gün geçişinde odak parsel için: tanıklar → erken uyarı → otomatik karar kuralı →
 * emniyetler → karar (itiraz penceresi) → zincir → ödeme → SMS. Karar anında zaman durur.
 */
import { autoDecisionFor, checkSafeguards, type DayVote, type DecisionLite } from "@/engine/decision";
import { criticalWindowEnd } from "@/engine/phenology";
import { shouldWarn } from "@/engine/model";
import { DEFAULT_THRESHOLDS } from "@/engine/thresholds";
import type { Outcome } from "@/engine/types";
import type { DecisionSummary, SimParcelState, SimState, StationLive } from "@/lib/live-types";
import { addDays, dayRange, diffDays } from "@/lib/dates";
import { DATA_META, getWorld, normalsFor } from "@/sim/data";
import { activeWorldFlags, dayStartMs, evaluateParcel, type ParcelEval } from "@/sim/evaluate";
import { PARCELS } from "@/sim/parcels";
import { SCENARIOS, SEASON, type ScenarioKey } from "@/sim/scenarios";
import { audit } from "./audit";
import { publish } from "./bus";
import { config } from "./config";
import { db } from "./db";
import { createDecision, runPipeline, toSummary, releasePayment, stopDecision } from "./decisions";
import { deviceStatus, liveFlags, liveRain30Mm, liveSoil } from "./device";
import { sendSms, smsTextFor } from "./sms";

const DAY = 86_400_000;
const TZ = 3 * 3_600_000;

export const localDate = (ms: number) => new Date(ms + TZ).toISOString().slice(0, 10);
const localHour = (ms: number) => ((ms + TZ) % DAY) / 3_600_000;

interface Engine {
  scenario: ScenarioKey;
  runId: string;
  simMs: number;
  speed: number;
  playing: boolean;
  lastTick: number;
  history: DayVote[];
  processedDay: string;
  decided: Map<string, DecisionSummary>;
  runDecisions: DecisionLite[];
  earlyWarned: boolean;
  flagsClearedAt: number;
  stationSource: "senaryo" | "canli";
  holdPayment: boolean;
  breaker: { paused: boolean; reason: string | null };
  timer: ReturnType<typeof setInterval> | null;
  lastPublish: number;
  dirty: boolean;
}

const g = globalThis as unknown as { __agrishieldSim?: Engine };

const newRunId = () => `run-${Date.now().toString(36)}`;

function focus() {
  return PARCELS.find((p) => p.id === SCENARIOS[engine().scenario].focusParcelId)!;
}

function engine(): Engine {
  if (!g.__agrishieldSim) {
    const s = SCENARIOS["kuraklik-2025"];
    g.__agrishieldSim = {
      scenario: s.key,
      runId: newRunId(),
      simMs: dayStartMs(s.stageStart) + 10 * 3_600_000,
      speed: 0,
      playing: false,
      lastTick: Date.now(),
      history: [],
      processedDay: addDays(s.stageStart, -1),
      decided: new Map(),
      runDecisions: [],
      earlyWarned: false,
      flagsClearedAt: 0,
      stationSource: "senaryo",
      holdPayment: false,
      breaker: { paused: false, reason: null },
      timer: null,
      lastPublish: 0,
      dirty: true,
    };
    rebuildHistory();
  }
  return g.__agrishieldSim;
}

/* ───────────── değerlendirme ───────────── */

function liveOverrides() {
  const e = engine();
  const dev = deviceStatus();
  if (e.stationSource === "canli" && dev !== "sessiz") {
    return { stationSource: dev === "canli" ? ("canli" as const) : ("simule" as const), liveSoil: liveSoil(), liveRain30: liveRain30Mm(), extraFlags: liveFlags() };
  }
  return { stationSource: "senaryo" as const, liveSoil: null, liveRain30: null, extraFlags: [] };
}

function evalAt(parcelId: string, date: string, atMs: number): ParcelEval {
  const e = engine();
  const p = PARCELS.find((x) => x.id === parcelId)!;
  const live = liveOverrides();
  const flags = [...activeWorldFlags(e.scenario, atMs, e.flagsClearedAt), ...live.extraFlags];
  return evaluateParcel(p, { scenario: e.scenario, date, flags, stationSource: live.stationSource, liveSoil: live.liveSoil, liveRain30: live.liveRain30 });
}

/** Odak parsel için sezon başından verilen güne kadar oy geçmişi (otomatik karar kuralı için) */
function rebuildHistory() {
  const e = engine();
  const p = focus();
  const upto = addDays(localDate(e.simMs), -1);
  e.history = [];
  e.earlyWarned = false;
  for (const d of dayRange(SEASON.start, upto)) {
    const ev = evalAt(p.id, d, dayStartMs(d) + DAY - 1000);
    e.history.push({ date: d, yes: ev.vote.yesCount, lone: ev.lone, triggerEnabled: ev.window.triggerEnabled, weight: ev.window.weight });
  }
  e.processedDay = upto;
}

/* ───────────── gün işleme ───────────── */

async function processDay(date: string): Promise<boolean> {
  const e = engine();
  const p = focus();
  const at = dayStartMs(date) + 10 * 3_600_000; // karar anı: sabah ölçümleri geldikten sonra
  const ev = evalAt(p.id, date, dayStartMs(date) + DAY - 1000);

  // Erken uyarı (hakem) — ödeme kararı DEĞİL
  if (shouldWarn(ev.model.riskScore, ev.window.weight, e.earlyWarned, e.decided.has(p.id))) {
    e.earlyWarned = true;
    const text = `AgriShield erken uyarı: ${p.id} için önümüzdeki günlerde kuraklık riski yüksek (risk skoru ${ev.model.riskScore.toFixed(2).replace(".", ",")}). Üst gübreyi erteleyin, varsa sulamayı planlayın.`;
    publish("early", { parcelId: p.id, date, score: ev.model.riskScore, text });
    const sms = await sendSms(text);
    publish("sms", { code: "ERKEN", to: sms.to, text, mode: sms.mode, kind: "erken" });
    void audit("ai", "erken_uyari", { parcel: p.id, date, score: ev.model.riskScore, factors: ev.model.topFactors });
  }

  const today: DayVote = { date, yes: ev.vote.yesCount, lone: ev.lone, triggerEnabled: ev.window.triggerEnabled, weight: ev.window.weight };
  const isLastCritical = date === `${SEASON.endYear}-${criticalWindowEnd(p.crop)}`;
  const auto = e.decided.has(p.id) ? null : autoDecisionFor(e.history, today, isLastCritical, DEFAULT_THRESHOLDS);
  e.history.push(today);
  e.processedDay = date;
  if (!auto) return false;

  const guard = checkSafeguards({
    outcome: auto.outcome,
    parcelId: p.id,
    policyId: p.id,
    village: p.village,
    date,
    context: e.runId,
    history: e.runDecisions,
    thresholds: DEFAULT_THRESHOLDS,
    villageDailyCap: config.villageDailyCap,
    paused: e.breaker.paused,
    windowTriggerEnabled: ev.window.triggerEnabled,
  });
  if (!guard.ok) {
    publish("decision", { phase: "rejected", decision: null, message: guard.message });
    void audit("engine", `karar_reddedildi:${guard.code}`, guard.message ?? "");
    if (guard.code === "DURAKLATILDI") return false;
    return false;
  }

  // Zamanı karar anında durdur
  e.playing = false;
  e.speed = 0;
  e.simMs = at;
  await makeDecision(p.id, ev, auto.outcome, auto.basis, date, at);
  return true;
}

async function makeDecision(parcelId: string, ev: ParcelEval, outcome: Outcome, basis: Parameters<typeof createDecision>[0]["basis"], date: string, at: number) {
  const e = engine();
  const p = PARCELS.find((x) => x.id === parcelId)!;
  const row = await createDecision({
    evaluation: ev,
    outcome,
    basis,
    scenario: e.scenario,
    simDate: date,
    simMs: at,
    runId: e.runId,
    status: "itiraz_penceresi",
    windowSec: config.itirazSn,
  });
  const sum = toSummary(row);
  e.decided.set(parcelId, sum);
  e.runDecisions.push({ parcelId, policyId: parcelId, village: p.village, outcome, date, context: e.runId });
  publish("decision", { phase: "created", decision: sum });
  e.dirty = true;
  const runId = e.runId;
  void runPipeline(row.id, { holdPayment: () => engine().holdPayment }).then((final) => {
    if (final && engine().runId === runId) {
      engine().decided.set(parcelId, toSummary(final));
      engine().dirty = true;
    }
  });
}

/* ───────────── döngü ───────────── */

let busy = false;

async function tick() {
  const e = engine();
  const now = Date.now();
  const dt = now - e.lastTick;
  e.lastTick = now;
  if (busy) return;
  if (e.playing && e.speed > 0) {
    busy = true;
    try {
      const endMs = dayStartMs(SEASON.end) + 18 * 3_600_000;
      const target = Math.min(endMs, e.simMs + e.speed * (dt / 1000) * DAY);
      const targetDay = localDate(target);
      let stopped = false;
      while (e.processedDay < targetDay) {
        const next = addDays(e.processedDay, 1);
        // gün geçişini görünür kıl
        e.simMs = Math.max(e.simMs, dayStartMs(next));
        if (await processDay(next)) {
          stopped = true;
          break;
        }
      }
      if (!stopped) e.simMs = target;
      if (target >= endMs) {
        e.playing = false;
        e.speed = 0;
      }
      e.dirty = true;
    } finally {
      busy = false;
    }
  }
  const interval = e.playing ? 200 : 1000;
  if (e.dirty || now - e.lastPublish >= interval * 5) {
    if (now - e.lastPublish >= interval || !e.playing) {
      e.lastPublish = now;
      e.dirty = false;
      publish("sim", simState());
    }
  }
}

export function ensureSimEngine() {
  const e = engine();
  if (!e.timer) {
    e.lastTick = Date.now();
    e.timer = setInterval(() => void tick(), 100);
  }
}

/* ───────────── durum ───────────── */

function interpNdvi(parcelId: string, ms: number): number | null {
  const obs = getWorld(engine().scenario).obs[parcelId].filter((o) => o.ndvi != null);
  const t = (d: string) => dayStartMs(d) + 10.7 * 3_600_000;
  let prev = obs[0];
  if (!prev) return null;
  if (ms <= t(prev.date)) return prev.ndvi;
  for (const o of obs) {
    if (t(o.date) >= ms) {
      const span = t(o.date) - t(prev.date);
      const k = span > 0 ? (ms - t(prev.date)) / span : 0;
      return Math.round(((prev.ndvi as number) + ((o.ndvi as number) - (prev.ndvi as number)) * k) * 1000) / 1000;
    }
    prev = o;
  }
  return prev.ndvi;
}

function interpNormal(parcelId: string, date: string): number | null {
  const ns = normalsFor(parcelId);
  const after = ns.find((n) => n.date >= date);
  const before = [...ns].reverse().find((n) => n.date <= date);
  if (!after || !before) return (after ?? before)?.p50 ?? null;
  const span = diffDays(after.date, before.date);
  const k = span > 0 ? diffDays(date, before.date) / span : 0;
  return Math.round((before.p50 + (after.p50 - before.p50) * k) * 1000) / 1000;
}

export function simState(): SimState {
  const e = engine();
  const date = localDate(e.simMs);
  const world = getWorld(e.scenario);
  const day = world.station.find((d) => d.date === date) ?? world.station[world.station.length - 1];
  const live = liveOverrides();
  const flags = [...activeWorldFlags(e.scenario, e.simMs, e.flagsClearedAt), ...live.extraFlags];

  const parcels: SimParcelState[] = PARCELS.map((p) => {
    const ev = evalAt(p.id, date, e.simMs);
    const lastObs = [...world.obs[p.id]].reverse().find((o) => o.date <= date) ?? null;
    return {
      id: p.id,
      crop: p.crop,
      soilType: p.soilType,
      irrigated: p.irrigated,
      ndvi: interpNdvi(p.id, e.simMs),
      ndviNormal: interpNormal(p.id, date),
      anomaly: ev.witnesses.satellite.anomaly,
      lastObs: lastObs ? { date: lastObs.date, ndvi: lastObs.ndvi, cloud: lastObs.cloud } : null,
      window: { key: ev.window.key, label: ev.window.label, weight: ev.window.weight, triggerEnabled: ev.window.triggerEnabled },
      witnesses: ev.witnesses,
      yesCount: ev.vote.yesCount,
      projected: ev.vote.outcome,
      riskScore: ev.model.riskScore,
      topFactors: ev.model.topFactors,
      decision: e.decided.get(p.id) ?? null,
    };
  });

  const focusEval = parcels.find((x) => x.id === SCENARIOS[e.scenario].focusParcelId)!;
  const liveSoilNow = live.liveSoil;
  const station: StationLive = {
    soil10: liveSoilNow != null ? null : day.soil10 ?? null,
    soil30: liveSoilNow ?? day.soilMoisture,
    soil60: liveSoilNow != null ? null : day.soil60 ?? null,
    rainToday: day.rainMm,
    rain30: focusEval.witnesses.station.rain30mm,
    airTempC: day.airTempC ?? null,
    humidity: day.humidity ?? null,
    windMs: day.windMs ?? null,
    batteryV: day.batteryV ?? null,
    source: live.stationSource,
    flags,
  };

  // Uydu geçişi (3D tarama konisi): geçiş günü 10:40'tan itibaren ~1,2 sn gerçek zamana yayılır
  const obsDates = DATA_META.obsDates;
  const lastPass = [...obsDates].reverse().find((d) => d <= date) ?? null;
  let satPass: SimState["satPass"] = { active: false, date: lastPass, cloudy: false, sensor: "S2", progress: 0 };
  if (lastPass) {
    const passStart = dayStartMs(lastPass) + 10.7 * 3_600_000;
    const durDays = Math.max(0.12, e.speed * 1.4);
    const progress = (e.simMs - passStart) / (durDays * DAY);
    const cloud = world.obs[focusEval.id].find((o) => o.date === lastPass)?.cloud ?? 0;
    satPass = { active: progress >= 0 && progress <= 1, date: lastPass, cloudy: cloud >= 0.4, sensor: focusEval.witnesses.satellite.source.startsWith("Sentinel-1") ? "S1" : "S2", progress: Math.max(0, Math.min(1, progress)) };
  }
  const nearObs = world.obs[focusEval.id].find((o) => Math.abs(diffDays(o.date, date)) <= 1);
  const cloudCover = Math.max(nearObs?.cloud ?? 0, day.rainMm > 0.5 ? 0.75 : 0.1);

  return {
    scenario: e.scenario,
    scenarioLabel: SCENARIOS[e.scenario].label,
    focusParcelId: SCENARIOS[e.scenario].focusParcelId,
    synthetic: DATA_META.synthetic,
    date,
    simMs: e.simMs,
    speed: e.speed,
    playing: e.playing,
    seasonStart: SEASON.start,
    seasonEnd: SEASON.end,
    station,
    meteo: {
      spi30: focusEval.witnesses.meteo.spi30,
      rain30: focusEval.witnesses.meteo.rain30mm,
      rain30Normal: focusEval.witnesses.meteo.rain30Normal,
      ratio: focusEval.witnesses.meteo.ratio,
    },
    weather: { cloudCover, raining: day.rainMm > 0.5, hour: localHour(e.simMs) },
    satPass,
    parcels,
    stationSource: e.stationSource,
    holdPayment: e.holdPayment,
    runId: e.runId,
    breaker: e.breaker,
    earlyWarned: e.earlyWarned,
    serverTs: Date.now(),
  };
}

function changed(publishNow = true) {
  const e = engine();
  e.dirty = true;
  if (publishNow) {
    e.lastPublish = Date.now();
    e.dirty = false;
    publish("sim", simState());
  }
}

/* ───────────── komutlar (API) ───────────── */

export function loadScenario(key: ScenarioKey, actor = "operator") {
  const e = engine();
  const s = SCENARIOS[key];
  e.scenario = key;
  e.runId = newRunId();
  e.simMs = dayStartMs(s.stageStart) + 10 * 3_600_000;
  e.speed = 0;
  e.playing = false;
  e.decided = new Map();
  e.runDecisions = [];
  e.flagsClearedAt = 0;
  e.breaker = { paused: false, reason: null };
  rebuildHistory();
  void audit(actor === "operator" ? "operator" : "sim", "senaryo_yuklendi", { scenario: key, runId: e.runId });
  changed();
  return simState();
}

export function play(speed: number) {
  const e = engine();
  const sp = Math.max(0, Math.min(60, speed));
  e.speed = sp;
  e.playing = sp > 0;
  e.lastTick = Date.now();
  // Bu koşuda odak parsel zaten karar aldıysa oynatma serbest (gözlem), yeni karar üretilmez
  changed();
  return simState();
}

export function seek(date: string) {
  const e = engine();
  const d = date < SEASON.start ? SEASON.start : date > SEASON.end ? SEASON.end : date;
  e.simMs = dayStartMs(d) + 10 * 3_600_000;
  rebuildHistory();
  changed();
  return simState();
}

export function resetSim() {
  return loadScenario(engine().scenario, "operator");
}

export function setStationSource(src: "senaryo" | "canli") {
  engine().stationSource = src;
  rebuildHistory();
  changed();
}

export function setHoldPayment(on: boolean) {
  const e = engine();
  e.holdPayment = on;
  if (!on) for (const d of e.decided.values()) releasePayment(d.id);
  changed();
}

export function clearWorldFlags() {
  const e = engine();
  e.flagsClearedAt = e.simMs;
  void audit("operator", "senaryo_bayraklari_temizlendi", { at: localDate(e.simMs) });
  rebuildHistory();
  changed();
}

export async function tripBreaker(reason: string) {
  const e = engine();
  e.breaker = { paused: true, reason };
  const { mockChain } = await import("./chain");
  await mockChain().breaker(reason);
  publish("breaker", e.breaker);
  void audit("operator", "devre_kesici", reason);
  changed();
}

export function resetBreaker() {
  const e = engine();
  e.breaker = { paused: false, reason: null };
  publish("breaker", e.breaker);
  void audit("operator", "devre_kesici_kapandi", "");
  changed();
}

export async function manualDecide(parcelId: string, force: boolean): Promise<{ ok: boolean; message?: string; decision?: DecisionSummary }> {
  const e = engine();
  const p = PARCELS.find((x) => x.id === parcelId);
  if (!p) return { ok: false, message: "Parsel bulunamadı" };
  if (e.decided.get(parcelId)?.status === "itiraz_penceresi") return { ok: false, message: "Bu parsel için itiraz penceresi sürüyor." };
  const date = localDate(e.simMs);
  const ev = evalAt(parcelId, date, e.simMs);
  const guard = checkSafeguards({
    outcome: ev.vote.outcome,
    parcelId,
    policyId: parcelId,
    village: p.village,
    date,
    context: e.runId,
    history: e.runDecisions,
    thresholds: DEFAULT_THRESHOLDS,
    villageDailyCap: config.villageDailyCap,
    paused: e.breaker.paused,
    windowTriggerEnabled: ev.window.triggerEnabled || force,
    force,
  });
  if (!guard.ok) {
    void audit("operator", `manuel_karar_reddedildi:${guard.code}`, guard.message ?? "");
    publish("decision", { phase: "rejected", decision: null, message: guard.message });
    return { ok: false, message: guard.message };
  }
  e.playing = false;
  e.speed = 0;
  void audit("operator", "manuel_karar", { parcel: parcelId, date, force });
  await makeDecision(parcelId, ev, ev.vote.outcome, "operator", date, e.simMs);
  changed();
  return { ok: true, decision: e.decided.get(parcelId) };
}

export function stopPending(decisionId: string) {
  return stopDecision(decisionId);
}

export async function currentRunDecisions(): Promise<DecisionSummary[]> {
  const rows = await db.decision.findMany({ where: { runId: engine().runId }, orderBy: { createdAt: "desc" } });
  return rows.map(toSummary);
}

export function simSnapshot() {
  return simState();
}

export function smsPreview(parcelId: string, code: string, amount: number) {
  return smsTextFor("odeme", parcelId, code, amount);
}
