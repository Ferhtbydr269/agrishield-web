/**
 * Bir senaryo dünyasında, verilen gün için parsel değerlendirmesi: üç tanık + oylama + hakem modeli.
 * Simülasyon motoru, testler, prova (dry-run) ve seed aynı fonksiyonu kullanır — tek gerçek.
 */
import { rain30Normal, spi30 } from "@/engine/climate";
import { autoDecisionFor, evaluateMeteo, evaluateSatellite, evaluateStation, loneWitness, vote, type DayVote } from "@/engine/decision";
import { criticalWindowEnd, getWindow } from "@/engine/phenology";
import { riskScore } from "@/engine/model";
import { scanReadings } from "@/engine/anomaly";
import { DEFAULT_THRESHOLDS } from "@/engine/thresholds";
import type { DecisionBasis, ParcelInfo, RiskModelOutput, StationFlag, StationReading, Thresholds, VoteResult, Witnesses } from "@/engine/types";
import { dayRange } from "@/lib/dates";
import { getWorld, normalsFor } from "./data";
import { PARCELS, STATION } from "./parcels";
import { SCENARIOS, SEASON, type ScenarioKey } from "./scenarios";

export interface ParcelEval {
  parcelId: string;
  date: string;
  witnesses: Witnesses;
  vote: VoteResult;
  window: ReturnType<typeof getWindow>;
  model: RiskModelOutput;
  lone: DayVote["lone"];
}

export interface EvalOptions {
  scenario: ScenarioKey;
  date: string;
  flags: StationFlag[];
  stationSource?: "senaryo" | "canli" | "simule";
  liveSoil?: number | null;
  liveRain30?: number | null;
  thresholds?: Thresholds;
}

/** Yerel gün başlangıcı (Türkiye, UTC+3) → ms */
export function dayStartMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00+03:00`);
}

export function evaluateParcel(parcel: ParcelInfo & { policy: { sumInsuredTl: number; payoutRate: number } }, o: EvalOptions): ParcelEval {
  const t = o.thresholds ?? DEFAULT_THRESHOLDS;
  const world = getWorld(o.scenario);
  const satellite = evaluateSatellite({ crop: parcel.crop, date: o.date, obs: world.obs[parcel.id] ?? [], normals: normalsFor(parcel.id), thresholds: t });
  const station = evaluateStation({
    date: o.date,
    stationId: STATION.id,
    days: world.station,
    soilType: parcel.soilType,
    thresholds: t,
    flags: o.flags,
    source: o.stationSource ?? "senaryo",
    liveSoilMoisture: o.liveSoil ?? null,
    liveRain30: o.liveRain30 ?? null,
    irrigated: parcel.irrigated,
  });
  const meteo = evaluateMeteo({ date: o.date, days: world.meteo, thresholds: t, spiFn: spi30, normalFn: rain30Normal, source: "ERA5-Land / MGM (bölgesel)" });
  const witnesses: Witnesses = { satellite, station, meteo };
  const window = getWindow(parcel.crop, o.date);
  const model = riskScore({
    rainRatio: meteo.ratio,
    ndviAnomaly: satellite.anomaly,
    soilMoisture: parcel.irrigated ? null : station.soilMoisture,
    soilThreshold: station.threshold,
    spi30: meteo.spi30,
    phenologyWeight: window.weight,
  });
  return { parcelId: parcel.id, date: o.date, witnesses, vote: vote(witnesses, parcel.policy), window, model, lone: loneWitness(witnesses) };
}

/** Senaryo dünyasının istasyon okuma akışı (günlük 12:00 + gün içi olaylar) */
export function worldReadings(scenario: ScenarioKey): StationReading[] {
  const w = getWorld(scenario);
  const daily: StationReading[] = w.station.map((d) => ({
    ts: Date.parse(`${d.date}T12:00:00+03:00`),
    soilMoisture: d.soilMoisture,
    rainMm: d.rainMm,
  }));
  const intra: StationReading[] = w.intraday.map((r) => ({ ts: Date.parse(r.ts), soilMoisture: r.soilMoisture, rainMm: r.rainMm }));
  return [...daily, ...intra].sort((a, b) => a.ts - b.ts);
}

const flagCache = new Map<ScenarioKey, StationFlag[]>();

/** Senaryodaki tüm şüphe bayrakları (zaman damgalı). Kural 1 ve 2. */
export function worldFlags(scenario: ScenarioKey): StationFlag[] {
  const hit = flagCache.get(scenario);
  if (hit) return hit;
  const flags = scanReadings(worldReadings(scenario));
  flagCache.set(scenario, flags);
  return flags;
}

/** T anında etkin (temizlenmemiş) bayraklar */
export function activeWorldFlags(scenario: ScenarioKey, atMs: number, clearedAtMs = 0): StationFlag[] {
  return worldFlags(scenario).filter((f) => f.ts <= atMs && f.ts > clearedAtMs);
}

export interface TimelinePoint {
  date: string;
  sat: string;
  station: string;
  meteo: string;
  yes: number;
  risk: number;
  anomaly: number | null;
  spi: number | null;
  rain30: number | null;
  soil: number | null;
  window: string;
}

const timelineCache = new Map<string, TimelinePoint[]>();

/** Parselin tüm sezon boyunca günlük tanık geçmişi (parsel sayfası ve grafikler için) */
export function seasonTimeline(scenario: ScenarioKey, parcelId: string): TimelinePoint[] {
  const key = `${scenario}|${parcelId}`;
  const hit = timelineCache.get(key);
  if (hit) return hit;
  const parcel = PARCELS.find((p) => p.id === parcelId)!;
  const out: TimelinePoint[] = [];
  for (const date of dayRange(SEASON.start, SEASON.end)) {
    const flags = activeWorldFlags(scenario, dayStartMs(date) + 86_399_000);
    const e = evaluateParcel(parcel, { scenario, date, flags });
    out.push({
      date,
      sat: e.witnesses.satellite.verdict,
      station: e.witnesses.station.verdict,
      meteo: e.witnesses.meteo.verdict,
      yes: e.vote.yesCount,
      risk: e.model.riskScore,
      anomaly: e.witnesses.satellite.anomaly,
      spi: e.witnesses.meteo.spi30,
      rain30: e.witnesses.station.rain30mm,
      soil: e.witnesses.station.soilMoisture,
      window: e.window.key,
    });
  }
  timelineCache.set(key, out);
  return out;
}

export interface ScenarioRunResult {
  decision: { outcome: VoteResult["outcome"]; basis: DecisionBasis; date: string; yesCount: number; amountTl: number; evaluation: ParcelEval } | null;
  timeline: { date: string; sat: string; station: string; meteo: string; yes: number; risk: number }[];
  earlyWarning: string | null;
}

/**
 * Senaryoyu gün gün koşturur (başsız): odak parsel için ilk otomatik kararı bulur.
 * Testler ve `npm run dry-run` bunu kullanır; sahnedeki simülasyon motoru aynı kuralları uygular.
 */
export function runScenario(scenario: ScenarioKey, parcelId = SCENARIOS[scenario].focusParcelId, until = SEASON.end): ScenarioRunResult {
  const parcel = PARCELS.find((p) => p.id === parcelId)!;
  const history: DayVote[] = [];
  const timeline: ScenarioRunResult["timeline"] = [];
  const lastCritical = `${SEASON.endYear}-${criticalWindowEnd(parcel.crop)}`;
  let earlyWarning: string | null = null;
  for (const date of dayRange(SEASON.start, until)) {
    const flags = activeWorldFlags(scenario, dayStartMs(date) + 86_399_000);
    const e = evaluateParcel(parcel, { scenario, date, flags });
    timeline.push({
      date,
      sat: e.witnesses.satellite.verdict,
      station: e.witnesses.station.verdict,
      meteo: e.witnesses.meteo.verdict,
      yes: e.vote.yesCount,
      risk: e.model.riskScore,
    });
    if (!earlyWarning && e.window.weight >= 0.8 && e.model.riskScore >= 0.6) earlyWarning = date;
    const today: DayVote = { date, yes: e.vote.yesCount, lone: e.lone, triggerEnabled: e.window.triggerEnabled, weight: e.window.weight };
    const auto = autoDecisionFor(history, today, date === lastCritical, DEFAULT_THRESHOLDS);
    if (auto) {
      return {
        decision: {
          outcome: auto.outcome,
          basis: auto.basis,
          date,
          yesCount: e.vote.yesCount,
          amountTl: auto.outcome === "ODE" ? e.vote.amountTl : 0,
          evaluation: e,
        },
        timeline,
        earlyWarning,
      };
    }
    history.push(today);
  }
  return { decision: null, timeline, earlyWarning };
}
