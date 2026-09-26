/**
 * FİYATLAMA (AGRISHIELD_PROMPT.md 8.6) — sigortacının gözüyle prim:
 *   beklenenHasar = tetikOlasiligi × (sigortaBedeli × odemeOrani)
 *   brutPrim      = beklenenHasar × (1 + giderVeGuvenlikPayi)      (varsayılan 0,25)
 *   ciftciOdemesi = brutPrim × (1 − destekOrani)                   (varsayılan 0,70)
 * tetikOlasiligi geçmiş seriden backtest ile gelir (kaç sezonda tetiklenirdi / toplam sezon).
 * Bu bir varsayım hesabıdır.
 */
export interface PricingInput {
  sumInsuredTl: number;
  payoutRate: number;
  triggerProbability: number;
  subsidyRate: number;
  loadRate: number;
}

export interface PricingOutput {
  payoutTl: number;
  expectedLossTl: number;
  grossPremiumTl: number;
  subsidyTl: number;
  farmerPaysTl: number;
  /** brüt primin sigorta bedeline oranı */
  rateOnLine: number;
}

export const DEFAULT_PRICING: PricingInput = {
  sumInsuredTl: 100_000,
  payoutRate: 0.5,
  triggerProbability: 0.1,
  subsidyRate: 0.7,
  loadRate: 0.25,
};

export function price(p: PricingInput): PricingOutput {
  const payoutTl = p.sumInsuredTl * p.payoutRate;
  const expectedLossTl = p.triggerProbability * payoutTl;
  const grossPremiumTl = expectedLossTl * (1 + p.loadRate);
  const farmerPaysTl = grossPremiumTl * (1 - p.subsidyRate);
  return {
    payoutTl: Math.round(payoutTl),
    expectedLossTl: Math.round(expectedLossTl),
    grossPremiumTl: Math.round(grossPremiumTl),
    subsidyTl: Math.round(grossPremiumTl - farmerPaysTl),
    farmerPaysTl: Math.round(farmerPaysTl),
    rateOnLine: p.sumInsuredTl > 0 ? grossPremiumTl / p.sumInsuredTl : 0,
  };
}

/** Backtest: sezon listesinde kaçı tetiklenirdi? */
export function triggerProbabilityFromBacktest(seasons: { triggered: boolean }[]): number {
  if (!seasons.length) return 0;
  return seasons.filter((s) => s.triggered).length / seasons.length;
}
