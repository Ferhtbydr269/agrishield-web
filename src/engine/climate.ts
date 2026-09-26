import climate from "@data/climate-siverek.json";
import { doy365, spiFromGamma } from "./stats";

/**
 * Gerçek iklim normali (ERA5, 1991–2020, Siverek). SPI-30 gamma parametreleri ve 30 günlük yağış
 * ortalaması `npm run fetch:weather` ile üretildi. Karar motoru meteoroloji tanığını bu normale göre
 * değerlendirir — "normal" uydurulmuş değil, 30 yıllık gözlemden gelir.
 */
interface SpiParam {
  a: number;
  b: number;
  q: number;
}

const params = climate.spiParams as SpiParam[];
const rain30Mean = climate.rain30Mean as number[];

export function spi30(rain30mm: number, isoDate: string): number {
  const p = params[doy365(isoDate)];
  return spiFromGamma(rain30mm, { alpha: p.a, beta: p.b, q: p.q });
}

export function rain30Normal(isoDate: string): number {
  return rain30Mean[doy365(isoDate)];
}

export const CLIMATE_META = climate.meta;
export const CLIMATE_SUMMARY = climate.summary;
