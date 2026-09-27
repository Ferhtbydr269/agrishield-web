/**
 * ANTİ-MANİPÜLASYON (AGRISHIELD_PROMPT.md 8.4). Yer istasyonu ölçümü şu durumlarda "şüpheli"
 * işaretlenir ve tanık VERİ YOK olur (bayrak, inceleme yapılıp temizlenene kadar kalır):
 *   1. Bölgede yağış yokken 1 saatte nem artışı > 8 puan ("biri sensörü suladı")
 *   2. Kurcalama sensörü (tamper=true) ya da eğim/konum değişimi
 *   3. Uydu ve meteoroloji "kurak değil" derken istasyon aşırı kuru okuyor (çapraz tutarsızlık > 3σ)
 *   4. Paket sıra numarası geri gidiyor veya imza tutarsız
 * Her işaret AuditLog'a yazılır ve kanıt sayfasında görünür.
 */
import { mean, std } from "./stats";
import { FLAG_LABEL, type FlagCode, type StationFlag, type StationReading, type Verdict } from "./types";

export const SPIKE_POINTS = 8;
export const SPIKE_WINDOW_MS = 60 * 60 * 1000;
export const CROSS_SIGMA = 3;

/** Türkçe ondalık (virgül), 1 basamak — kanıt metinleri ekranda ve zincirde aynı görünür. */
const tr1 = (v: number) => v.toFixed(1).replace(".", ",");

export function makeFlag(code: FlagCode, ts: number, detail: string): StationFlag {
  return { code, ts, label: FLAG_LABEL[code], detail };
}

/** Kural 1 — yağışsız ani nem artışı. `readings` zaman sırasına göre; son okuma değerlendirilir. */
export function detectMoistureSpike(readings: StationReading[], regionalRainLastHourMm = 0): StationFlag | null {
  if (readings.length < 2) return null;
  const last = readings[readings.length - 1];
  if (last.soilMoisture == null) return null;
  const windowStart = last.ts - SPIKE_WINDOW_MS;
  const inWindow = readings.filter((r) => r.ts >= windowStart && r.ts < last.ts && r.soilMoisture != null);
  if (!inWindow.length) return null;
  const minBefore = Math.min(...inWindow.map((r) => r.soilMoisture as number));
  const rise = last.soilMoisture - minBefore;
  const localRain = readings.filter((r) => r.ts >= windowStart).reduce((s, r) => s + (r.rainMm ?? 0), 0);
  if (rise > SPIKE_POINTS && localRain <= 0.2 && regionalRainLastHourMm <= 0.2) {
    return makeFlag(
      "supheli_nem_artisi",
      last.ts,
      `1 saat içinde nem %${tr1(minBefore)} → %${tr1(last.soilMoisture)} (+${tr1(rise)} puan), yağış 0 mm.`,
    );
  }
  return null;
}

/** Kural 2 — kurcalama / eğim */
export function detectTamper(reading: StationReading): StationFlag | null {
  return reading.tamper ? makeFlag("kurcalama", reading.ts, "Kutu açılma/eğim sensörü tetiklendi.") : null;
}

/**
 * Kural 3 — çapraz tutarsızlık: uydu ve meteoroloji kurak DEMİYORKEN istasyon kendi
 * yakın geçmişine göre 3σ'dan fazla kuru okuyorsa (ör. prob topraktan çekildi / kuru saksıya taşındı).
 */
export function detectCrossInconsistency(
  current: number,
  baseline: number[],
  satellite: Verdict,
  meteo: Verdict,
  ts: number,
): StationFlag | null {
  if (satellite !== "HAYIR" || meteo !== "HAYIR") return null;
  if (baseline.length < 5) return null;
  const m = mean(baseline);
  const s = Math.max(std(baseline), 1.5); // çok kararlı serilerde aşırı hassasiyeti önle
  const z = (current - m) / s;
  if (z < -CROSS_SIGMA) {
    return makeFlag(
      "capraz_tutarsizlik",
      ts,
      `İstasyon %${tr1(current)} okuyor (yakın geçmiş ort. %${tr1(m)}, z = ${tr1(z)}); uydu ve meteoroloji kuraklık görmüyor.`,
    );
  }
  return null;
}

/** Kural 4 — paket sırası geri gidiyor (tekrar saldırısı) */
export function detectSeqRegression(prevSeq: number | null, seq: number | undefined, ts: number): StationFlag | null {
  if (prevSeq == null || seq == null) return null;
  if (seq <= prevSeq) {
    return makeFlag("sira_geri", ts, `Sıra no ${seq} ≤ önceki ${prevSeq}: tekrar saldırısı şüphesi.`);
  }
  return null;
}

export function signatureFlag(ts: number): StationFlag {
  return makeFlag("imza_hatasi", ts, "HMAC imzası tutmadı; paket reddedildi.");
}

/** Bir okuma dizisine kural 1 ve 2'yi uygular (senaryo/replay ve testler için). */
export function scanReadings(readings: StationReading[]): StationFlag[] {
  const flags: StationFlag[] = [];
  const sorted = [...readings].sort((a, b) => a.ts - b.ts);
  for (let i = 0; i < sorted.length; i++) {
    const t = detectTamper(sorted[i]);
    if (t) flags.push(t);
    const s = detectMoistureSpike(sorted.slice(0, i + 1));
    if (s) flags.push(s);
  }
  return flags;
}
