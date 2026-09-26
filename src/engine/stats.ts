/**
 * İstatistik yardımcıları: gamma dağılımı (SPI için), standart normal ters CDF, yüzdelikler.
 * Dış kütüphane yok; SPI hesabı McKee vd. (1993) yöntemini izler:
 *   H(x) = q + (1 − q)·G(x; α, β),  SPI = Φ⁻¹(H(x))
 *   q = sıfır yağış olasılığı, G = gamma CDF, α/β Thom (1958) MLE yaklaşımı.
 */

/** ln Γ(x) — Lanczos yaklaşımı */
export function lnGamma(x: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Düzenlenmiş alt tamamlanmamış gamma P(a, x) */
export function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    // seri açılımı
    let sum = 1 / a;
    let del = sum;
    let ap = a;
    for (let n = 0; n < 500; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-12) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }
  // sürekli kesir (Lentz)
  let b = x + 1 - a;
  let c = 1 / 1e-300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

/** Standart normal ters CDF — Acklam algoritması (|hata| < 1.15e-9) */
export function normInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  let q: number;
  let r: number;
  if (p < pl) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= 1 - pl) {
    q = p - 0.5;
    r = q * q;
    return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

export interface GammaParams {
  alpha: number;
  beta: number;
  /** sıfır yağış olasılığı */
  q: number;
}

/** Thom (1958) MLE yaklaşımıyla gamma uydurma; sıfırlar ayrı olasılık olarak tutulur. */
export function fitGamma(values: number[]): GammaParams {
  const nonZero = values.filter((v) => v > 0.05);
  const q = (values.length - nonZero.length) / Math.max(1, values.length);
  if (nonZero.length < 3) return { alpha: 1, beta: 1, q };
  const mean = nonZero.reduce((s, v) => s + v, 0) / nonZero.length;
  const meanLn = nonZero.reduce((s, v) => s + Math.log(v), 0) / nonZero.length;
  const A = Math.log(mean) - meanLn;
  const alpha = A > 0 ? (1 + Math.sqrt(1 + (4 * A) / 3)) / (4 * A) : 50;
  const beta = mean / alpha;
  return { alpha, beta, q };
}

/** SPI değeri; ±3 ile sınırlanır (literatürdeki uygulama). */
export function spiFromGamma(x: number, p: GammaParams): number {
  const g = x > 0.05 ? gammaP(p.alpha, x / p.beta) : 0;
  const h = p.q + (1 - p.q) * g;
  const clamped = Math.min(0.99865, Math.max(0.00135, h));
  return Math.max(-3, Math.min(3, normInv(clamped)));
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : NaN;
}

export function std(xs: number[]): number {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1));
}

/** 365 günlük takvimde yılın günü (29 Şubat, 28 Şubat'a katlanır). 0..364 */
export function doy365(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const day = m === 2 && d === 29 ? 28 : d;
  void y;
  return cum[m - 1] + day - 1;
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}
