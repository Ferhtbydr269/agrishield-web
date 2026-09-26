/**
 * KANIT PAKETİ (AGRISHIELD_PROMPT.md 9.3)
 *   evidenceHash = sha256(JSON.stringify(evidence − chain − payment))
 * Anahtar sırası sabittir; aynı kanıt her zaman aynı hash'i verir, tek bir alan değişince hash değişir.
 */
import { sha256Hex0x } from "@/lib/sha256";
import { effectiveNdviThreshold } from "./phenology";
import type { DecisionBasis, Evidence, Outcome, RiskModelOutput, Thresholds, VoteResult, Witnesses } from "./types";

export interface EvidenceInput {
  decisionCode: string;
  parcelId: string;
  season: string;
  ts: string;
  witnesses: Witnesses;
  thresholds: Thresholds;
  model: RiskModelOutput;
  vote: VoteResult;
  /** oylamadan farklıysa (ör. dönem sonu gri bölge) nihai sonuç */
  outcome?: Outcome;
  basis: DecisionBasis;
  scenario: string;
  dataNote: string;
}

export function buildEvidence(i: EvidenceInput): Evidence {
  const s = i.witnesses.satellite;
  const st = i.witnesses.station;
  const m = i.witnesses.meteo;
  return {
    decisionCode: i.decisionCode,
    parcel: i.parcelId,
    policy: i.season,
    ts: i.ts,
    witnesses: {
      satellite: {
        verdict: s.verdict,
        ndvi: s.ndvi,
        normalMedian: s.normalMedian,
        anomaly: s.anomaly,
        cloud: s.cloud,
        obsDate: s.obsDate,
        s1z: s.s1z,
        source: s.source,
      },
      station: {
        verdict: st.verdict,
        rain30mm: st.rain30mm,
        soilMoisture: st.soilMoisture,
        threshold: st.threshold,
        soilType: st.soilType,
        stationId: st.stationId,
        flags: st.flags.map((f) => f.code),
        source: st.source,
      },
      meteo: {
        verdict: m.verdict,
        spi30: m.spi30,
        rain30mm: m.rain30mm,
        rain30Normal: m.rain30Normal,
        source: m.source,
      },
    },
    rules: {
      window: s.window.key,
      windowLabel: s.window.label,
      weight: s.window.weight,
      ndviThreshold: Number.isFinite(effectiveNdviThreshold(i.thresholds.ndviAnomaly, s.window.weight))
        ? Math.round(effectiveNdviThreshold(i.thresholds.ndviAnomaly, s.window.weight) * 1000) / 1000
        : null,
      ndviBaseThreshold: i.thresholds.ndviAnomaly,
      soilThreshold: st.threshold,
      rain30Max: i.thresholds.rain30Max,
      spiThreshold: i.thresholds.spiThreshold,
      rainRatioMax: i.thresholds.rainRatioMax,
      vote: "≥2 EVET → ÖDE · 1 → GRİ BÖLGE · 0 → ÖDEME YOK",
    },
    model: { riskScore: i.model.riskScore, topFactors: i.model.topFactors, note: "hakem modeli, tanık değil" },
    decision: {
      yesCount: i.vote.yesCount,
      outcome: i.outcome ?? i.vote.outcome,
      amountTl: (i.outcome ?? i.vote.outcome) === "ODE" ? i.vote.amountTl : 0,
      basis: i.basis,
    },
    context: { scenario: i.scenario, dataNote: i.dataNote },
  };
}

/** Hash'lenen metin: zincir ve ödeme alanları hariç, sabit sıralı JSON. */
export function sealedText(e: Evidence): string {
  const { chain: _c, payment: _p, ...rest } = e;
  void _c;
  void _p;
  return JSON.stringify(rest);
}

export function hashEvidence(e: Evidence): string {
  return sha256Hex0x(sealedText(e));
}

/** Veritabanından okunan kanıt JSON'unu yeniden hash'ler (JSON.parse anahtar sırasını korur). */
export function rehashStored(evidenceJson: string): string {
  return hashEvidence(JSON.parse(evidenceJson) as Evidence);
}
