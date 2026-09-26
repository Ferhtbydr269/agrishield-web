/**
 * GERÇEK VERİ — ERA5 / ERA5-Land (Copernicus) günlük serisi, Open-Meteo arşiv API'si üzerinden.
 * İnternet ister; sadece hazırlık aşamasında bir kez çalışır. Çıktılar repoya girer, uygulama
 * çalışırken internete ihtiyaç yoktur.
 *
 *   npm run fetch:weather
 *
 * Çıktılar:
 *   data/era5-siverek-daily.json  → 1991-01-01'den itibaren günlük yağış + toprak nemi (backtest girdisi)
 *   data/climate-siverek.json     → SPI-30 gamma parametreleri (1991–2020), 30 günlük yağış normali,
 *                                   sezon toplamları, 2024–25 sezonunun günlük serisi (grafik için)
 */
import fs from "node:fs";
import path from "node:path";
import { doy365, fitGamma, mean, percentile } from "../src/engine/stats";
import { addDays, dayRange } from "../src/lib/dates";

const LAT = 37.75;
const LON = 39.32;
const START = "1991-01-01";
const END = "2026-06-30";
const API = "https://archive-api.open-meteo.com/v1/archive";

interface Chunk {
  time: string[];
  [k: string]: (number | null)[] | string[];
}

async function fetchChunk(start: string, end: string, daily: string[], model?: string): Promise<Chunk> {
  const u = new URL(API);
  u.searchParams.set("latitude", String(LAT));
  u.searchParams.set("longitude", String(LON));
  u.searchParams.set("start_date", start);
  u.searchParams.set("end_date", end);
  u.searchParams.set("daily", daily.join(","));
  u.searchParams.set("wind_speed_unit", "ms");
  u.searchParams.set("timezone", "Europe/Istanbul");
  if (model) u.searchParams.set("models", model);
  // Önbellek: yeniden çalıştırmada aynı parçayı tekrar indirme (ücretsiz API'nin dakika sınırı var)
  const cacheDir = path.join(process.cwd(), "scripts", ".cache");
  fs.mkdirSync(cacheDir, { recursive: true });
  const cacheFile = path.join(cacheDir, `om-${model ?? "best"}-${start}-${end}-${daily.length}.json`);
  if (fs.existsSync(cacheFile)) return JSON.parse(fs.readFileSync(cacheFile, "utf8")) as Chunk;
  for (let attempt = 1; attempt <= 8; attempt++) {
    const r = await fetch(u);
    if (r.ok) {
      const j = (await r.json()) as { daily: Chunk };
      fs.writeFileSync(cacheFile, JSON.stringify(j.daily));
      await new Promise((res) => setTimeout(res, 4000));
      return j.daily;
    }
    const wait = r.status === 429 ? 65_000 : 2000 * attempt;
    console.warn(`  deneme ${attempt} başarısız (${r.status}); ${Math.round(wait / 1000)} sn bekleniyor`);
    await new Promise((res) => setTimeout(res, wait));
  }
  throw new Error(`Open-Meteo isteği başarısız: ${start}..${end}`);
}

async function fetchAll(daily: string[], model?: string) {
  const out: Record<string, (number | null)[]> = {};
  const time: string[] = [];
  for (let y = 1991; y <= 2026; y += 6) {
    const s = `${y}-01-01`;
    const e = y + 5 >= 2026 ? END : `${y + 5}-12-31`;
    console.log(`  ${model ?? "best_match"} ${s} → ${e}`);
    const c = await fetchChunk(s, e, daily, model);
    time.push(...c.time);
    for (const k of daily) (out[k] ??= []).push(...(c[k] as (number | null)[]));
    if (e === END) break;
  }
  return { time, out };
}

const r1 = (v: number | null | undefined) => (v == null ? null : Math.round(v * 10) / 10);
const r3 = (v: number | null | undefined) => (v == null ? null : Math.round(v * 1000) / 1000);

async function main() {
  console.log("ERA5 (yağış, sıcaklık, rüzgâr, nem) indiriliyor…");
  const era5 = await fetchAll(
    ["precipitation_sum", "temperature_2m_max", "temperature_2m_mean", "wind_speed_10m_max", "relative_humidity_2m_mean", "et0_fao_evapotranspiration"],
    "era5",
  );
  console.log("ERA5-Land (toprak nemi) indiriliyor…");
  const land = await fetchAll(["soil_moisture_0_to_7cm_mean", "soil_moisture_7_to_28cm_mean", "soil_moisture_28_to_100cm_mean"]);

  const dates = dayRange(START, END);
  if (era5.time.length !== dates.length || land.time.length !== dates.length) {
    throw new Error(`Gün sayısı tutmuyor: ${era5.time.length} / ${land.time.length} / ${dates.length}`);
  }
  const precip = era5.out.precipitation_sum.map((v) => r1(v ?? 0) ?? 0);
  const sm7 = land.out.soil_moisture_0_to_7cm_mean.map(r3);
  const sm28 = land.out.soil_moisture_7_to_28cm_mean.map(r3);
  const sm100 = land.out.soil_moisture_28_to_100cm_mean.map(r3);

  // ── 30 günlük birikimler ve SPI-30 parametreleri (1991–2020 referans dönemi) ──
  const acc30: number[] = dates.map((_, i) => (i < 29 ? NaN : precip.slice(i - 29, i + 1).reduce((s, v) => s + v, 0)));
  const byDoy: number[][] = Array.from({ length: 365 }, () => []);
  dates.forEach((d, i) => {
    const y = Number(d.slice(0, 4));
    if (y < 1991 || y > 2020 || Number.isNaN(acc30[i])) return;
    byDoy[doy365(d)].push(acc30[i]);
  });
  // Komşu ±3 gün birleştirilerek daha kararlı uydurma (30 yıl × 7 gün ≈ 210 örnek)
  const spiParams = byDoy.map((_, doy) => {
    const pool: number[] = [];
    for (let k = -3; k <= 3; k++) pool.push(...byDoy[(doy + k + 365) % 365]);
    const g = fitGamma(pool);
    return { a: Math.round(g.alpha * 1e4) / 1e4, b: Math.round(g.beta * 1e3) / 1e3, q: Math.round(g.q * 1e4) / 1e4 };
  });
  const rain30Mean = byDoy.map((xs) => Math.round(mean(xs) * 10) / 10);
  const rain30P10 = byDoy.map((xs) => Math.round(percentile([...xs].sort((a, b) => a - b), 0.1) * 10) / 10);

  // Günlük yağış normali (grafik için, 1991–2020, ±7 gün yumuşatma)
  const dailyByDoy: number[][] = Array.from({ length: 365 }, () => []);
  dates.forEach((d, i) => {
    const y = Number(d.slice(0, 4));
    if (y >= 1991 && y <= 2020) dailyByDoy[doy365(d)].push(precip[i]);
  });
  const dailyNormal = dailyByDoy.map((_, doy) => {
    const pool: number[] = [];
    for (let k = -7; k <= 7; k++) pool.push(...dailyByDoy[(doy + k + 365) % 365]);
    return Math.round(mean(pool) * 100) / 100;
  });

  // Toprak nemi (7–28 cm) günlük normal + std (istasyon vekili için)
  const smByDoy: number[][] = Array.from({ length: 365 }, () => []);
  dates.forEach((d, i) => {
    const y = Number(d.slice(0, 4));
    if (y >= 1991 && y <= 2020 && sm28[i] != null) smByDoy[doy365(d)].push(sm28[i] as number);
  });
  const smNormal = smByDoy.map((xs) => Math.round(mean(xs) * 1000) / 1000);

  // ── Sezon toplamları (Kas–Haz) ──
  const seasons: { season: string; totalMm: number; springMm: number; aprMm: number }[] = [];
  for (let y = 1992; y <= 2026; y++) {
    const s = `${y - 1}-11-01`;
    const e = `${y}-06-30`;
    const i0 = dates.indexOf(s);
    const i1 = dates.indexOf(e);
    if (i0 < 0 || i1 < 0) continue;
    const seg = precip.slice(i0, i1 + 1);
    const spring = precip.slice(dates.indexOf(`${y}-03-01`), dates.indexOf(`${y}-05-31`) + 1);
    const apr = precip.slice(dates.indexOf(`${y}-04-01`), dates.indexOf(`${y}-04-30`) + 1);
    seasons.push({
      season: `${y - 1}-${y}`,
      totalMm: Math.round(seg.reduce((a, b) => a + b, 0)),
      springMm: Math.round(spring.reduce((a, b) => a + b, 0)),
      aprMm: Math.round(apr.reduce((a, b) => a + b, 0)),
    });
  }
  const normalSeasons = seasons.filter((s) => {
    const end = Number(s.season.slice(5));
    return end >= 1992 && end <= 2021;
  });
  const seasonNormal = Math.round(mean(normalSeasons.map((s) => s.totalMm)));
  const s2025 = seasons.find((s) => s.season === "2024-2025")!;
  const deficitPct = Math.round((1 - s2025.totalMm / seasonNormal) * 100);
  const rank = [...seasons].sort((a, b) => a.totalMm - b.totalMm).findIndex((s) => s.season === "2024-2025") + 1;

  // 2024–25 sezonu günlük (grafik): kümülatif gerçek vs kümülatif normal
  const sDates = dayRange("2024-11-01", "2025-06-30");
  let cumReal = 0;
  let cumNorm = 0;
  const season2025 = sDates.map((d) => {
    const i = dates.indexOf(d);
    cumReal += precip[i];
    cumNorm += dailyNormal[doy365(d)];
    return { d, p: precip[i], c: Math.round(cumReal * 10) / 10, n: Math.round(cumNorm * 10) / 10 };
  });

  const meta = {
    source: "ERA5 (yağış, sıcaklık, rüzgâr) + ERA5-Land (toprak nemi) — Copernicus/ECMWF, Open-Meteo arşiv API'si",
    url: "https://open-meteo.com/en/docs/historical-weather-api",
    lat: LAT,
    lon: LON,
    gridNote: "Open-Meteo en yakın ızgara hücresi: 37,72°K 39,34°D, rakım 776 m",
    period: `${START} → ${END}`,
    referencePeriod: "1991–2020 (SPI ve günlük normal); sezon normali 1991/92–2020/21",
    fetchedAt: new Date().toISOString(),
    synthetic: false,
  };

  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, "era5-siverek-daily.json"),
    JSON.stringify({ meta, start: START, precip, sm7, sm28, sm100, tmax: era5.out.temperature_2m_max.map(r1), wind: era5.out.wind_speed_10m_max.map(r1) }),
  );
  fs.writeFileSync(
    path.join(dataDir, "climate-siverek.json"),
    JSON.stringify(
      {
        meta,
        spiParams,
        rain30Mean,
        rain30P10,
        dailyNormal,
        smNormal,
        seasons,
        summary: { season2025Mm: s2025.totalMm, seasonNormalMm: seasonNormal, deficitPct, driestRank: rank, seasonCount: seasons.length },
        season2025,
      },
      null,
      0,
    ),
  );

  console.log("\nÖzet (facts.ts'e işlenecek):");
  console.log(`  2024–25 sezonu: ${s2025.totalMm} mm · normal: ${seasonNormal} mm · açık: %${deficitPct} · ${seasons.length} sezon içinde en kurak ${rank}.`);
  console.log(`  Örnek SPI parametresi (28 Nisan): ${JSON.stringify(spiParams[doy365("2026-04-28")])} · 30g normal: ${rain30Mean[doy365("2026-04-28")]} mm`);
  void addDays;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
