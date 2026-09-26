/**
 * KARAR MOTORU — projenin kalbi (AGRISHIELD_PROMPT.md Bölüm 8).
 *
 * Üç bağımsız tanık, üç bağımsız değerlendirme:
 *   TANIK 1 — UYDU (parsel):      NDVI anomalisi ≤ −0,25/ağırlık, fenolojik pencere içinde, bulut < 0,4
 *                                 15 gündür bulut → Sentinel-1 yedeği (yüzey nemi z ≤ −1,0 → EVET)
 *   TANIK 2 — YER İSTASYONU (köy): 30 günlük yağış ≤ 10 mm VE kök bölgesi nemi < solma noktası
 *                                 (killi %18, tınlı %14, kumlu %9); şüpheli veri → VERİ YOK
 *   TANIK 3 — METEOROLOJİ (bölge): SPI-30 ≤ −1,5 VEYA 30 günlük yağış < uzun yıllar ortalamasının %40'ı
 *
 * Oylama: ≥2 EVET → ÖDE · 1 → GRİ BÖLGE (eksper) · 0 → ÖDEME YOK (itiraz hakkı korunur)
 * Yapay zekâ tanık değildir; hakemdir (bkz. model.ts).
 */
import { addDays, diffDays } from "@/lib/dates";
import { effectiveNdviThreshold, getWindow } from "./phenology";
import type {
  Crop,
  DecisionBasis,
  MeteoWitness,
  NormalPoint,
  Outcome,
  SafeguardResult,
  SatelliteObs,
  SatelliteWitness,
  SoilType,
  StationDay,
  StationFlag,
  StationWitness,
  Thresholds,
  VoteResult,
  Witnesses,
} from "./types";

const r = (v: number, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
const pct = (v: number) => `%${(Math.abs(v) * 100).toFixed(1).replace(".", ",")}`;
const num = (v: number, d = 1) => v.toFixed(d).replace(".", ",");

/* ───────────────────────────── TANIK 1 — UYDU ───────────────────────────── */

export interface SatelliteInput {
  crop: Crop;
  date: string;
  /** tarih sırasına göre gözlemler (en az bugüne kadar olanlar) */
  obs: SatelliteObs[];
  normals: NormalPoint[];
  thresholds: Thresholds;
}

export function normalAt(normals: NormalPoint[], date: string): NormalPoint | null {
  if (!normals.length) return null;
  const exact = normals.find((n) => n.date === date);
  if (exact) return exact;
  let prev: NormalPoint | null = null;
  for (const n of normals) {
    if (n.date > date) {
      if (!prev) return n;
      const span = diffDays(n.date, prev.date);
      const t = span > 0 ? diffDays(date, prev.date) / span : 0;
      const lerp = (a: number, b: number) => a + (b - a) * t;
      return { date, p10: lerp(prev.p10, n.p10), p50: lerp(prev.p50, n.p50), p90: lerp(prev.p90, n.p90) };
    }
    prev = n;
  }
  return prev;
}

export function evaluateSatellite(input: SatelliteInput): SatelliteWitness {
  const { crop, date, thresholds: t } = input;
  const w = getWindow(crop, date);
  const threshold = effectiveNdviThreshold(t.ndviAnomaly, w.weight);
  const window = { key: w.key, label: w.label, weight: w.weight, triggerEnabled: w.triggerEnabled };
  const base: Omit<SatelliteWitness, "verdict" | "reason"> = {
    source: "—",
    obsDate: null,
    ndvi: null,
    normalMedian: null,
    anomaly: null,
    threshold: Number.isFinite(threshold) ? r(threshold) : -99,
    cloud: null,
    s1z: null,
    window,
  };

  const past = input.obs.filter((o) => o.date <= date && diffDays(date, o.date) <= 30);
  const lastClear = [...past].reverse().find((o) => o.ndvi != null && o.cloud < t.cloudMax) ?? null;
  const lastAny = past.length ? past[past.length - 1] : null;

  // Bilgi amaçlı son geçerli ölçüm (pencere kapalı olsa da gösterilir)
  const describe = (o: SatelliteObs) => {
    const n = normalAt(input.normals, o.date);
    const anomaly = n && o.ndvi != null ? (o.ndvi - n.p50) / n.p50 : null;
    return { n, anomaly };
  };

  // Hasat / dönem dışı: uydu tanığı daima HAYIR (hasadı kuraklık sanma hatasına karşı koruma)
  if (!w.triggerEnabled) {
    const info = lastClear ? describe(lastClear) : null;
    return {
      ...base,
      source: lastClear ? "Sentinel-2 / Copernicus" : "—",
      obsDate: lastClear?.date ?? null,
      ndvi: lastClear?.ndvi != null ? r(lastClear.ndvi) : null,
      normalMedian: info?.n ? r(info.n.p50) : null,
      anomaly: info?.anomaly != null ? r(info.anomaly) : null,
      cloud: lastClear ? r(lastClear.cloud, 2) : null,
      verdict: "HAYIR",
      reason:
        w.key === "olgunlasma"
          ? "Hasat penceresi: NDVI düşüşü normaldir, uydu tetiği kapalı."
          : `${w.label}: bu dönemde tetik kapalı.`,
    };
  }

  if (lastClear && diffDays(date, lastClear.date) <= t.satStaleDays) {
    const { n, anomaly } = describe(lastClear);
    if (!n || anomaly == null) {
      return { ...base, verdict: "VERI_YOK", reason: "Bu tarih için normal aralık tanımlı değil." };
    }
    const yes = anomaly <= threshold;
    return {
      ...base,
      source: "Sentinel-2 / Copernicus",
      obsDate: lastClear.date,
      ndvi: r(lastClear.ndvi!),
      normalMedian: r(n.p50),
      anomaly: r(anomaly),
      cloud: r(lastClear.cloud, 2),
      verdict: yes ? "EVET" : "HAYIR",
      reason: yes
        ? `NDVI normalin ${pct(anomaly)} altında; eşik −${pct(threshold)} (${w.label}, ağırlık ${num(w.weight)}).`
        : `NDVI normalin ${pct(anomaly)} ${anomaly < 0 ? "altında" : "üstünde"}; eşik (−${pct(threshold)}) aşılmadı.`,
    };
  }

  // 15 gündür bulutsuz geçiş yok → Sentinel-1 radar yedeği
  const s1 = [...past].reverse().find((o) => o.s1z != null && diffDays(date, o.date) <= 12) ?? null;
  if (s1 && s1.s1z != null) {
    const yes = s1.s1z <= t.s1ZThreshold;
    return {
      ...base,
      source: "Sentinel-1 radar (yedek)",
      obsDate: s1.date,
      cloud: lastAny ? r(lastAny.cloud, 2) : null,
      s1z: r(s1.s1z, 2),
      verdict: yes ? "EVET" : "HAYIR",
      reason: `${t.satStaleDays} gündür bulutsuz optik geçiş yok; radar yüzey nemi z = ${num(s1.s1z, 2)} (eşik ${num(t.s1ZThreshold, 1)}). Radar bulutu deler; ama sadece yüzey nemini görür.`,
    };
  }

  return {
    ...base,
    cloud: lastAny ? r(lastAny.cloud, 2) : null,
    verdict: "VERI_YOK",
    reason: "Son 15 günde bulutsuz geçiş ve radar yedeği yok.",
  };
}

/* ───────────────────────────── TANIK 2 — YER İSTASYONU ───────────────────────────── */

export interface StationInput {
  date: string;
  stationId: string;
  days: StationDay[];
  soilType: SoilType;
  thresholds: Thresholds;
  /** etkin (temizlenmemiş) şüphe bayrakları */
  flags: StationFlag[];
  source: StationWitness["source"];
  /** canlı cihaz bağlıysa kök bölgesi nemi buradan gelir */
  liveSoilMoisture?: number | null;
  /** canlı cihazın kendi yağış ölçümü (varsa) — yoksa senaryo/istasyon yağışı kullanılır */
  liveRain30?: number | null;
  /**
   * Sulu parsel: köy istasyonu kıraç arazidedir ve sulanan parselin kök bölgesi nemini temsil etmez.
   * Bu poliçelerde istasyon tanığı kullanılmaz (karar uydu + meteoroloji ile verilir); aksi hâlde
   * sağlıklı sulu parsel yağış açığı yüzünden ödeme alırdı (kasa zararı).
   */
  irrigated?: boolean;
}

export function sumRain30(days: { date: string; rainMm: number }[], date: string): { sum: number; n: number } {
  const from = addDays(date, -29);
  let sum = 0;
  let n = 0;
  for (const d of days) {
    if (d.date >= from && d.date <= date) {
      sum += d.rainMm;
      n++;
    }
  }
  return { sum: r(sum, 1), n };
}

export function evaluateStation(input: StationInput): StationWitness {
  const { date, thresholds: t, soilType } = input;
  const threshold = t.soilWilting[soilType];
  const base = {
    stationId: input.stationId,
    threshold,
    soilType,
    flags: input.flags,
    source: input.source,
  };

  const today = [...input.days].reverse().find((d) => d.date <= date) ?? null;
  const { sum: scenRain30, n } = sumRain30(input.days, date);
  const rain30 = input.liveRain30 ?? scenRain30;
  const soil = input.liveSoilMoisture ?? today?.soilMoisture ?? null;

  if (input.irrigated) {
    return {
      ...base,
      rain30mm: n >= 25 ? rain30 : null,
      soilMoisture: soil != null ? r(soil, 1) : null,
      verdict: "VERI_YOK",
      reason: "Sulu parsel: köy istasyonu kıraç arazide, bu parselin kök bölgesi nemini temsil etmez. Karar uydu + meteoroloji ile verilir.",
    };
  }
  if (input.flags.length > 0) {
    const f = input.flags[input.flags.length - 1];
    return {
      ...base,
      rain30mm: n >= 25 ? rain30 : null,
      soilMoisture: soil != null ? r(soil, 1) : null,
      verdict: "VERI_YOK",
      reason: `Şüpheli veri: ${f.label}. İstasyon tanığı inceleme yapılana kadar sayılmaz.`,
    };
  }
  if (input.liveRain30 == null && n < 25) {
    return { ...base, rain30mm: null, soilMoisture: soil, verdict: "VERI_YOK", reason: "Son 30 günde yeterli ölçüm yok." };
  }
  if (!today && input.liveSoilMoisture == null) {
    return { ...base, rain30mm: rain30, soilMoisture: null, verdict: "VERI_YOK", reason: "İstasyon sessiz." };
  }
  if (soil == null) {
    return { ...base, rain30mm: rain30, soilMoisture: null, verdict: "VERI_YOK", reason: "Toprak nemi ölçümü yok." };
  }

  const dryRain = rain30 <= t.rain30Max;
  const drySoil = soil < threshold;
  const yes = dryRain && drySoil;
  let reason: string;
  if (yes) reason = `30 günde ${num(rain30)} mm yağış (≤ ${t.rain30Max}) ve kök bölgesi nemi %${num(soil)} < solma noktası %${threshold} (${soilType}).`;
  else if (!dryRain && !drySoil) reason = `30 günde ${num(rain30)} mm yağış ve nem %${num(soil)}: kuraklık koşulu yok.`;
  else if (!dryRain) reason = `Nem %${num(soil)} düşük ama 30 günde ${num(rain30)} mm yağış var (> ${t.rain30Max}).`;
  else reason = `Yağış az (${num(rain30)} mm) ama nem %${num(soil)} ≥ %${threshold}: ${soilType} toprak için henüz solma noktasında değil.`;

  return { ...base, rain30mm: rain30, soilMoisture: r(soil, 1), verdict: yes ? "EVET" : "HAYIR", reason };
}

/* ───────────────────────────── TANIK 3 — RESMİ METEOROLOJİ ───────────────────────────── */

export interface MeteoInput {
  date: string;
  days: { date: string; rainMm: number }[];
  thresholds: Thresholds;
  spiFn: (rain30: number, date: string) => number;
  normalFn: (date: string) => number;
  source?: string;
}

export function evaluateMeteo(input: MeteoInput): MeteoWitness {
  const { date, thresholds: t } = input;
  const source = input.source ?? "ERA5-Land / MGM";
  const { sum, n } = sumRain30(input.days, date);
  if (n < 28) {
    return { verdict: "VERI_YOK", spi30: null, rain30mm: null, rain30Normal: null, ratio: null, source, reason: "Bölgesel yağış serisi eksik." };
  }
  const spi = input.spiFn(sum, date);
  const normal = input.normalFn(date);
  const ratio = normal > 0 ? sum / normal : null;
  const bySpi = spi <= t.spiThreshold;
  const byRatio = ratio != null && normal >= t.rainRatioMinNormal && ratio < t.rainRatioMax;
  const yes = bySpi || byRatio;
  let reason: string;
  if (bySpi) reason = `SPI-30 = ${num(spi, 2)} ≤ ${num(t.spiThreshold, 1)} (çok kurak).`;
  else if (byRatio) reason = `30 günlük yağış ${num(sum)} mm, uzun yıllar ortalamasının %${Math.round((ratio ?? 0) * 100)}'i (< %${Math.round(t.rainRatioMax * 100)}).`;
  else reason = `SPI-30 = ${num(spi, 2)}; yağış normalin %${Math.round((ratio ?? 0) * 100)}'i: kuraklık eşiği aşılmadı.`;
  return {
    verdict: yes ? "EVET" : "HAYIR",
    spi30: r(spi, 2),
    rain30mm: sum,
    rain30Normal: r(normal, 1),
    ratio: ratio != null ? r(ratio, 2) : null,
    source,
    reason,
  };
}

/* ───────────────────────────── OYLAMA ───────────────────────────── */

export function countYes(w: Pick<Witnesses, "satellite" | "station" | "meteo">): number {
  return [w.satellite.verdict, w.station.verdict, w.meteo.verdict].filter((v) => v === "EVET").length;
}

export function outcomeFor(yes: number): Outcome {
  if (yes >= 2) return "ODE";
  if (yes === 1) return "GRI_BOLGE";
  return "ODEME_YOK";
}

export function vote(w: Witnesses, policy: { sumInsuredTl: number; payoutRate: number }): VoteResult {
  const yesCount = countYes(w);
  const outcome = outcomeFor(yesCount);
  return { yesCount, outcome, amountTl: outcome === "ODE" ? Math.round(policy.sumInsuredTl * policy.payoutRate) : 0 };
}

/* ───────────────────────────── EMNİYETLER ───────────────────────────── */

export interface DecisionLite {
  parcelId: string;
  policyId: string;
  village: string;
  outcome: Outcome;
  /** kararın ait olduğu (simülasyon) günü */
  date: string;
  /** aynı dünyada mı? (simülasyon koşusu / seed) */
  context: string;
}

export interface SafeguardInput {
  outcome: Outcome;
  parcelId: string;
  policyId: string;
  village: string;
  date: string;
  context: string;
  history: DecisionLite[];
  thresholds: Thresholds;
  villageDailyCap: number;
  paused: boolean;
  windowTriggerEnabled: boolean;
  force?: boolean;
}

/**
 * Ek emniyetler (kanıt sayfasında da gösterilir):
 *  - Ödeme tavanı: poliçe başına sezonda 1 tetik
 *  - Karantina: aynı parsel 7 gün içinde ikinci kez karar üretemez
 *  - Devre kesici: köy başına günde en fazla N parsel ödemesi; ayrıca manuel duraklatma
 */
export function checkSafeguards(s: SafeguardInput): SafeguardResult {
  if (s.paused) return { ok: false, code: "DURAKLATILDI", message: "Devre kesici açık: sistem duraklatıldı." };
  if (!s.windowTriggerEnabled) return { ok: false, code: "PENCERE_KAPALI", message: "Bu fenolojik dönemde karar penceresi kapalı." };
  const same = s.history.filter((h) => h.context === s.context);
  if (!s.force) {
    if (s.outcome === "ODE") {
      const paid = same.filter((h) => h.policyId === s.policyId && h.outcome === "ODE").length;
      if (paid >= s.thresholds.seasonTriggerCap) {
        return { ok: false, code: "SEZON_TAVANI", message: "Bu poliçe bu sezon zaten tetiklendi (sezonda 1 tetik)." };
      }
    }
    const recent = same.find((h) => h.parcelId === s.parcelId && Math.abs(diffDays(s.date, h.date)) < s.thresholds.quarantineDays);
    if (recent) {
      return { ok: false, code: "KARANTINA", message: `Karantina: bu parsel için ${s.thresholds.quarantineDays} gün içinde karar üretildi.` };
    }
  }
  if (s.outcome === "ODE") {
    const today = same.filter((h) => h.village === s.village && h.date === s.date && h.outcome === "ODE").length;
    if (today >= s.villageDailyCap) {
      return { ok: false, code: "DEVRE_KESICI", message: `Devre kesici: köyde bugün ${s.villageDailyCap} ödeme sınırına ulaşıldı.` };
    }
  }
  return { ok: true };
}

/* ───────────────────────────── GRİ BÖLGE / SEZON SONU ───────────────────────────── */

export interface DayVote {
  date: string;
  yes: number;
  lone: "satellite" | "station" | "meteo" | null;
  triggerEnabled: boolean;
  /** fenoloji ağırlığı; 1,0 = kritik dönem */
  weight: number;
}

/**
 * Otomatik karar zamanlaması (simülasyon ve gölge mod için):
 *  - ≥2 EVET ve pencere açık → ÖDE (hemen)
 *  - Parsel ölçeğindeki tek tanık (uydu veya istasyon) ≥ greyLocalPersistDays gün ısrar ederse → GRİ BÖLGE (erken eksper)
 *    (bölgesel meteoroloji tek başına parsel incelemesi açtırmaz)
 *  - Kritik dönem kapanırken: kritik dönem boyunca en fazla 1 EVET görüldüyse → GRİ BÖLGE, hiç görülmediyse → ÖDEME YOK
 */
export function autoDecisionFor(
  history: DayVote[],
  today: DayVote,
  isLastCriticalDay: boolean,
  t: Thresholds,
): { outcome: Outcome; basis: DecisionBasis } | null {
  if (!today.triggerEnabled) return null;
  if (today.yes >= 2) return { outcome: "ODE", basis: "anlik_oylama" };
  if (today.yes === 1 && (today.lone === "satellite" || today.lone === "station")) {
    let streak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      const d = history[i];
      if (d.yes === 1 && d.lone === today.lone && d.triggerEnabled) streak++;
      else break;
    }
    if (streak + 1 >= t.greyLocalPersistDays) return { outcome: "GRI_BOLGE", basis: "tek_tanik_israri" };
  }
  if (isLastCriticalDay) {
    const critical = history.filter((d) => d.triggerEnabled && d.weight >= 1).map((d) => d.yes);
    const maxYes = Math.max(today.yes, ...critical);
    return { outcome: maxYes >= 1 ? "GRI_BOLGE" : "ODEME_YOK", basis: "donem_sonu" };
  }
  return null;
}

export function loneWitness(w: Witnesses): DayVote["lone"] {
  const yes = (["satellite", "station", "meteo"] as const).filter((k) => w[k].verdict === "EVET");
  return yes.length === 1 ? yes[0] : null;
}
