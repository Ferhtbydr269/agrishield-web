/**
 * GERİYE DÖNÜK TEST (GERÇEK VERİ) — ERA5, Siverek, 1991/92 → 2025/26 (35 sezon).
 *
 * Karar motorunun GERÇEK fonksiyonlarıyla, kıraç buğdayın kritik döneminde (1 Nis – 20 May):
 *   (a) Meteoroloji tanığı:  SPI-30 ≤ −1,5 VEYA 30 günlük yağış < normalin %40'ı  (evaluateMeteo, birebir)
 *   (b) İstasyonun yağış kuralı: 30 günlük yağış ≤ 10 mm   (köy yağış ölçeri yerine ERA5 yağışı vekil)
 *   (c) Aynı gün (a) VE (b) → "iki tanıklı tetik" yaklaşımı
 * SINIR: Uydu (NDVI) ve istasyonun toprak nemi koşulu bu testte YOK — geçmiş için yer ölçümü yok.
 * Bu nedenle sonuç "tetik olasılığı için yağışa dayalı bir üst yaklaşım"dır; arayüz bunu açıkça söyler.
 *
 *   npx tsx scripts/backtest.ts   → data/backtest.json
 */
import fs from "node:fs";
import path from "node:path";
import daily from "../data/era5-siverek-daily.json";
import { rain30Normal, spi30 } from "../src/engine/climate";
import { evaluateMeteo, sumRain30 } from "../src/engine/decision";
import { DEFAULT_THRESHOLDS } from "../src/engine/thresholds";
import { addDays, dayRange } from "../src/lib/dates";

const start = daily.start as string;
const precip = daily.precip as number[];
const days = precip.map((p, i) => ({ date: addDays(start, i), rainMm: p }));
const idx = new Map(days.map((d, i) => [d.date, i]));

const seasons: {
  season: string;
  meteoDays: number;
  rainRuleDays: number;
  bothDays: number;
  firstBoth: string | null;
  triggered: boolean;
  aprMayRainMm: number;
}[] = [];

for (let y = 1992; y <= 2026; y++) {
  const window = dayRange(`${y}-04-01`, `${y}-05-20`);
  let meteoDays = 0;
  let rainRuleDays = 0;
  let bothDays = 0;
  let firstBoth: string | null = null;
  for (const date of window) {
    const i = idx.get(date)!;
    const slice = days.slice(Math.max(0, i - 40), i + 1);
    const m = evaluateMeteo({ date, days: slice, thresholds: DEFAULT_THRESHOLDS, spiFn: spi30, normalFn: rain30Normal });
    const r30 = sumRain30(slice, date).sum;
    const a = m.verdict === "EVET";
    const b = r30 <= DEFAULT_THRESHOLDS.rain30Max;
    if (a) meteoDays++;
    if (b) rainRuleDays++;
    if (a && b) {
      bothDays++;
      firstBoth ??= date;
    }
  }
  const aprMay = dayRange(`${y}-04-01`, `${y}-05-31`).reduce((s, d) => s + days[idx.get(d)!].rainMm, 0);
  seasons.push({
    season: `${y - 1}-${y}`,
    meteoDays,
    rainRuleDays,
    bothDays,
    firstBoth,
    triggered: bothDays > 0,
    aprMayRainMm: Math.round(aprMay),
  });
}

const n = seasons.length;
const triggered = seasons.filter((s) => s.triggered);
const meteoAny = seasons.filter((s) => s.meteoDays > 0);
const out = {
  meta: {
    source: "ERA5 (Copernicus/ECMWF) — Open-Meteo arşiv API'si; Siverek 37,75°K 39,32°D",
    method:
      "Kritik dönem (1 Nis–20 May) boyunca günlük: (a) meteoroloji tanığı motorun kuralıyla, (b) 30 günlük yağış ≤ 10 mm (istasyon yağış kuralı, ERA5 vekil). Aynı gün (a)+(b) = iki tanıklı tetik yaklaşımı.",
    limitation:
      "Uydu (NDVI) ve istasyon toprak nemi koşulu geçmiş için ölçülemediğinden teste dahil değil; sonuç yağışa dayalı bir üst yaklaşımdır. Pilotta gerçek verimle doğrulanacak.",
    generatedAt: new Date().toISOString(),
    synthetic: false,
  },
  seasons,
  summary: {
    n,
    triggered: triggered.length,
    probability: Math.round((triggered.length / n) * 1000) / 1000,
    meteoAnySeasons: meteoAny.length,
    triggeredSeasons: triggered.map((s) => s.season),
  },
};

fs.writeFileSync(path.join(process.cwd(), "data", "backtest.json"), JSON.stringify(out, null, 1));
console.log(`35 sezon: meteoroloji tanığı ${meteoAny.length} sezonda en az bir gün EVET; iki tanıklı tetik ${triggered.length} sezonda (${(out.summary.probability * 100).toFixed(1)}%).`);
console.log("Tetiklenen sezonlar:", out.summary.triggeredSeasons.join(", "));
for (const s of seasons) console.log(`  ${s.season}: meteo ${s.meteoDays} gün · yağış kuralı ${s.rainRuleDays} gün · ikisi ${s.bothDays} gün · Nis–May ${s.aprMayRainMm} mm${s.firstBoth ? ` · ilk ${s.firstBoth}` : ""}`);
