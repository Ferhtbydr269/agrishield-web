import type { SoilType, Thresholds } from "./types";

/** Solma noktası (hacimsel %). "Aynı %15 nem kumlu toprakta iyi, killi toprakta kuraklıktır." */
export const SOLMA_NOKTASI: Record<SoilType, number> = { killi: 18, tinli: 14, kumlu: 9 };

/** Poliçe varsayılan eşikleri — AGRISHIELD_PROMPT.md Bölüm 8. */
export const DEFAULT_THRESHOLDS: Thresholds = {
  ndviAnomaly: -0.25,
  cloudMax: 0.4,
  satStaleDays: 15,
  s1ZThreshold: -1.0,
  rain30Max: 10,
  soilWilting: SOLMA_NOKTASI,
  spiThreshold: -1.5,
  rainRatioMax: 0.4,
  rainRatioMinNormal: 15,
  greyLocalPersistDays: 10,
  quarantineDays: 7,
  seasonTriggerCap: 1,
};

export function parseThresholds(json: string | null | undefined): Thresholds {
  if (!json) return DEFAULT_THRESHOLDS;
  try {
    const t = JSON.parse(json) as Partial<Thresholds>;
    return { ...DEFAULT_THRESHOLDS, ...t, soilWilting: { ...SOLMA_NOKTASI, ...(t.soilWilting ?? {}) } };
  } catch {
    return DEFAULT_THRESHOLDS;
  }
}
