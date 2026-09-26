/**
 * YAPAY ZEKÂ = HAKEM (tanık değil). Bu prototipte hakem modeli açıklanabilir bir lojistik skordur:
 *   logit = b0 + Σ wᵢ · xᵢ      riskScore = σ(logit)
 * Doğrusal modelde SHAP katkısı = wᵢ · (xᵢ − referans) olduğu için "en etkili faktörler" doğrudan
 * hesaplanır. Katsayılar UZMAN AYARIDIR (eğitilmiş model değildir) — arayüz bunu açıkça söyler.
 * Üretimde: açık verilerle (TÜİK verim + MODIS/Sentinel NDVI + ERA5/CHIRPS) eğitilmiş XGBoost + SHAP.
 *
 * Hakemin görevleri: eşiği ürüne/döneme göre ayarlamak (phenology.ts), primi hesaplamak (pricing.ts),
 * erken uyarı üretmek (earlyWarning), şüpheli veriyi işaretlemek (anomaly.ts). Ödeme kararı modele
 * değil, üç tanığın oylamasına bağlıdır.
 */
import { sigmoid } from "./stats";
import type { RiskModelOutput } from "./types";

export interface RiskFeatures {
  /** 30 günlük yağış / uzun yıllar 30 günlük ortalaması */
  rainRatio: number | null;
  /** NDVI anomalisi (−0,35 = normalin %35 altı) */
  ndviAnomaly: number | null;
  /** kök bölgesi nemi (%) */
  soilMoisture: number | null;
  /** toprak tipinin solma noktası (%) */
  soilThreshold: number;
  spi30: number | null;
  /** fenoloji ağırlığı (0–1) */
  phenologyWeight: number;
}

export const MODEL_NOTE =
  "Prototip hakem modeli: açıklanabilir lojistik skor, katsayılar uzman ayarı (eğitilmiş model değil). Katkılar SHAP mantığıyla (doğrusal modelde katkı = ağırlık × sapma). Üretimde XGBoost + SHAP.";

const B0 = -3.1;
const W = {
  rain: 2.3,
  ndvi: 1.7,
  soil: 1.9,
  spi: 0.7,
  phen: 0.6,
};

export function riskScore(f: RiskFeatures): RiskModelOutput {
  const contrib: [string, number][] = [];
  // 1 = hiç yağmadı, 0 = normal kadar yağdı (fazlası 0'a kırpılır)
  if (f.rainRatio != null) contrib.push(["30 günlük yağış", W.rain * Math.max(0, Math.min(1, 1 - f.rainRatio))]);
  // 1 = eşik kadar (−%25) düşüş
  if (f.ndviAnomaly != null) contrib.push(["NDVI anomalisi", W.ndvi * Math.max(0, Math.min(2, -f.ndviAnomaly / 0.25))]);
  // 1 = nem solma noktasının %30 altında; 0 = solma noktasında veya üstünde
  if (f.soilMoisture != null) contrib.push(["toprak nemi", W.soil * Math.max(0, Math.min(1.5, (f.soilThreshold * 1.25 - f.soilMoisture) / (f.soilThreshold * 0.55)))]);
  if (f.spi30 != null) contrib.push(["SPI-30 (meteoroloji)", W.spi * Math.max(0, Math.min(2, -f.spi30 / 1.5))]);
  contrib.push(["gelişim dönemi hassasiyeti", W.phen * f.phenologyWeight]);

  const logit = B0 + contrib.reduce((s, [, v]) => s + v, 0);
  const score = sigmoid(logit);
  const total = contrib.reduce((s, [, v]) => s + v, 0) || 1;
  const topFactors = contrib
    .filter(([, v]) => v > 0.001)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => [k, Math.round((v / total) * 100) / 100] as [string, number]);
  return { riskScore: Math.round(score * 100) / 100, topFactors, modelNote: MODEL_NOTE };
}

export const EARLY_WARNING_SCORE = 0.6;

/**
 * Erken uyarı: risk skoru eşiği geçerse ve kritik döneme girilmişse (ağırlık ≥ 0,8) çiftçiye
 * önlem mesajı. Tahmin ödeme kararı için KULLANILMAZ — gelecekte olabilecek bir şey için para ödenmez.
 */
export function shouldWarn(score: number, phenologyWeight: number, alreadyWarned: boolean, decided: boolean): boolean {
  return !alreadyWarned && !decided && phenologyWeight >= 0.8 && score >= EARLY_WARNING_SCORE;
}
