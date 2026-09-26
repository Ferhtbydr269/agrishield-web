/**
 * ÖRNEK VERİ ÜRETECİ (deterministik). Çıktılar "synthetic": true bayrağı taşır ve arayüzde
 * "örnek veri" rozetiyle gösterilir. GERÇEK DİYE SUNULMAZ.
 *
 *   npm run data:generate
 *
 * Gerçekçilik için kış yağışları gerçek ERA5 günlük normalinden (data/climate-siverek.json)
 * türetilir; ilkbahar olayları her senaryonun hikâyesine göre tek tek tasarlanmıştır.
 * Çıktılar:
 *   data/parcels.geojson  · data/ndvi-2025.json  · data/weather-2025.json
 */
import fs from "node:fs";
import path from "node:path";
import climate from "../data/climate-siverek.json";
import { doy365 } from "../src/engine/stats";
import { addDays, dayRange, diffDays } from "../src/lib/dates";
import { PARCELS } from "../src/sim/parcels";
import { SEASON, SCENARIO_KEYS, type ScenarioKey } from "../src/sim/scenarios";

/* ───────────── yardımcılar ───────────── */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type KP = [string, number][]; // ["MM-DD", değer] — sezon sırasıyla

/** Sezon tarihinden anahtar noktalara göre kosinüs yumuşatmalı ara değer */
function interp(kp: KP, iso: string): number {
  const toDate = (md: string) => (md >= "07-01" ? `${SEASON.endYear - 1}-${md}` : `${SEASON.endYear}-${md}`);
  const pts = kp.map(([md, v]) => [toDate(md), v] as [string, number]);
  if (iso <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (iso <= pts[i][0]) {
      const [d0, v0] = pts[i - 1];
      const [d1, v1] = pts[i];
      const span = diffDays(d1, d0);
      const t = span > 0 ? diffDays(iso, d0) / span : 0;
      const s = (1 - Math.cos(Math.PI * t)) / 2;
      return v0 + (v1 - v0) * s;
    }
  }
  return pts[pts.length - 1][1];
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;
const r3 = (v: number) => Math.round(v * 1000) / 1000;

const DAYS = dayRange(SEASON.start, SEASON.end);
const dailyNormal = climate.dailyNormal as number[];

/** Kış yağışı: gerçek günlük normalden, verilen çarpanla (deterministik) */
function winterRain(seed: number, factor: number, until: string): Record<string, number> {
  const rnd = mulberry32(seed);
  const out: Record<string, number> = {};
  // ay bazında hedef toplamı tut
  const byMonth: Record<string, string[]> = {};
  for (const d of DAYS) if (d < until) (byMonth[d.slice(0, 7)] ??= []).push(d);
  for (const [, days] of Object.entries(byMonth)) {
    const target = days.reduce((s, d) => s + dailyNormal[doy365(d)], 0) * factor;
    const raw: Record<string, number> = {};
    let sum = 0;
    for (const d of days) {
      const n = dailyNormal[doy365(d)];
      const pWet = Math.min(0.55, n / 5.5);
      if (rnd() < pWet) {
        const v = -Math.log(1 - rnd()) * (n / Math.max(pWet, 0.05));
        raw[d] = v;
        sum += v;
      }
    }
    const k = sum > 0 ? target / sum : 0;
    for (const [d, v] of Object.entries(raw)) {
      const x = r1(v * k);
      if (x >= 0.2) out[d] = x;
    }
  }
  return out;
}

/* ───────────── NDVI normal eğrileri (p50) ───────────── */

const NORMAL_P50: Record<"kirac_bugday" | "mercimek" | "sulu_bugday", KP> = {
  kirac_bugday: [
    ["11-01", 0.14], ["11-25", 0.17], ["12-15", 0.22], ["01-15", 0.27], ["02-15", 0.33], ["03-10", 0.45],
    ["04-01", 0.56], ["04-18", 0.6], ["04-28", 0.59], ["05-10", 0.53], ["05-20", 0.45], ["06-05", 0.3], ["06-20", 0.22], ["06-30", 0.19],
  ],
  mercimek: [
    ["11-01", 0.13], ["12-01", 0.16], ["01-15", 0.21], ["02-15", 0.28], ["03-10", 0.4], ["03-25", 0.47],
    ["04-10", 0.5], ["04-20", 0.48], ["05-01", 0.41], ["05-10", 0.34], ["05-25", 0.23], ["06-10", 0.17], ["06-30", 0.14],
  ],
  sulu_bugday: [
    ["11-01", 0.15], ["12-01", 0.2], ["01-15", 0.3], ["02-15", 0.4], ["03-10", 0.55], ["04-01", 0.68],
    ["04-25", 0.78], ["05-10", 0.74], ["05-25", 0.62], ["06-10", 0.42], ["06-25", 0.25], ["06-30", 0.22],
  ],
};

function spreadFor(p50: number) {
  return 0.035 + 0.075 * Math.max(0, Math.min(1, (p50 - 0.13) / 0.5));
}

/* ───────────── senaryo tasarımı ───────────── */

interface World {
  /** istasyon (köy) yağışı: kış üreteci + ilkbahar olayları */
  winterFactor: number;
  winterSeed: number;
  springFrom: string; // bu tarihten sonra sadece açık olaylar
  stationEvents: Record<string, number>;
  regionalEvents: Record<string, number>;
  regionalScale: number; // kış bölge yağışı = istasyon × ölçek (+ küçük sapma)
  soil30: KP;
  /** parsel → NDVI anomali anahtar noktaları */
  anomaly: Record<string, KP>;
  /** tam değer sabitleme (tarih → parsel → ndvi) */
  pinned?: Record<string, Record<string, number>>;
  cloudy: Record<string, number>; // gözlem tarihi → bulutluluk
  s1: KP; // Sentinel-1 yüzey nemi z-skoru
  tempAnom: KP;
  intraday?: { ts: string; soilMoisture: number; rainMm: number }[];
}

const COMMON_CLOUDS: Record<string, number> = {
  "2025-12-09": 0.62,
  "2026-01-03": 0.86,
  "2026-01-08": 0.91,
  "2026-01-13": 0.78,
  "2026-01-18": 0.83,
  "2026-01-23": 0.72,
  "2026-02-12": 0.58,
  "2026-03-14": 0.66,
};

const WORLDS: Record<ScenarioKey, World> = {
  "kuraklik-2025": {
    winterFactor: 0.62,
    winterSeed: 20251,
    springFrom: "2026-03-01",
    stationEvents: {
      "2026-03-03": 14.2, "2026-03-04": 6.1, "2026-03-10": 9.4, "2026-03-17": 7.8, "2026-03-18": 3.2,
      "2026-03-22": 4.1, "2026-03-29": 12.4, "2026-04-09": 1.8, "2026-04-19": 1.2, "2026-04-24": 3.0,
      "2026-05-06": 2.2, "2026-05-15": 4.0,
    },
    regionalEvents: {
      "2026-03-03": 11.0, "2026-03-04": 4.2, "2026-03-10": 7.9, "2026-03-17": 6.1, "2026-03-22": 3.5,
      "2026-03-29": 8.8, "2026-04-09": 1.2, "2026-04-19": 0.8, "2026-04-24": 2.2, "2026-05-06": 1.9, "2026-05-15": 3.1,
    },
    regionalScale: 0.9,
    soil30: [
      ["11-01", 19.0], ["11-20", 22.5], ["12-10", 25.0], ["01-05", 26.5], ["02-01", 26.8], ["02-20", 26.0],
      ["03-02", 25.2], ["03-04", 26.8], ["03-09", 25.6], ["03-11", 26.4], ["03-16", 25.1], ["03-18", 26.0],
      ["03-21", 25.0], ["03-22", 25.4], ["03-28", 23.9], ["03-29", 25.6], ["04-09", 21.9], ["04-20", 18.0],
      ["04-27", 15.6], ["04-28", 15.2], ["05-06", 12.8], ["05-15", 11.4], ["05-25", 10.1], ["06-10", 8.9], ["06-30", 8.1],
    ],
    anomaly: {
      "P-1182": [
        ["11-01", -0.03], ["12-15", -0.06], ["01-20", -0.08], ["02-20", -0.08], ["03-04", -0.1], ["03-24", -0.12],
        ["04-03", -0.14], ["04-08", -0.16], ["04-13", -0.19], ["04-18", -0.21], ["04-23", -0.24], ["04-28", -0.356],
        ["05-08", -0.43], ["05-20", -0.46], ["06-30", -0.42],
      ],
      "P-1207": [
        ["11-01", -0.02], ["01-15", -0.05], ["03-01", -0.08], ["04-01", -0.12], ["04-28", -0.18], ["05-10", -0.2], ["06-30", -0.18],
      ],
      "P-1244": [["11-01", 0.01], ["02-01", 0.02], ["04-01", 0.01], ["05-01", 0.02], ["06-30", 0.0]],
    },
    pinned: { "2026-04-28": { "P-1182": 0.38 } },
    cloudy: { ...COMMON_CLOUDS, "2026-04-13": 0.57, "2026-04-18": 0.61 },
    s1: [["11-01", -0.2], ["01-01", -0.4], ["02-01", -0.5], ["03-15", -0.4], ["04-15", -0.8], ["05-15", -1.2], ["06-30", -1.4]],
    tempAnom: [["11-01", 0.8], ["02-01", 1.0], ["04-01", 1.8], ["05-01", 2.4], ["06-30", 2.0]],
  },
  "gri-bolge": {
    winterFactor: 0.95,
    winterSeed: 3307,
    springFrom: "2026-03-01",
    stationEvents: {
      "2026-03-02": 6.4, "2026-03-08": 14.0, "2026-03-11": 3.0, "2026-03-20": 1.1, "2026-03-28": 2.0,
      "2026-04-15": 1.5, "2026-04-22": 3.0, "2026-05-04": 2.5, "2026-05-18": 1.2,
    },
    regionalEvents: {
      "2026-03-02": 9.0, "2026-03-08": 12.0, "2026-03-14": 9.0, "2026-03-21": 11.0, "2026-03-27": 8.0,
      "2026-04-04": 10.0, "2026-04-12": 7.5, "2026-04-19": 9.0, "2026-04-26": 6.5, "2026-05-03": 8.0,
      "2026-05-11": 5.5, "2026-05-19": 4.0,
    },
    regionalScale: 1.0,
    soil30: [
      ["11-01", 20.0], ["12-01", 24.0], ["01-10", 27.0], ["02-10", 27.5], ["03-01", 26.0], ["03-02", 26.6],
      ["03-08", 27.4], ["03-12", 25.4], ["03-25", 18.2], ["04-03", 14.3], ["04-08", 13.4], ["04-15", 12.6],
      ["04-22", 12.4], ["05-01", 11.1], ["05-10", 10.2], ["06-01", 9.0], ["06-30", 8.0],
    ],
    anomaly: {
      "P-1182": [["11-01", 0.0], ["03-01", -0.04], ["04-10", -0.1], ["05-10", -0.12], ["06-30", -0.1]],
      "P-1207": [["11-01", 0.0], ["03-01", -0.05], ["04-01", -0.11], ["04-20", -0.15], ["05-10", -0.17], ["06-30", -0.15]],
      "P-1244": [["11-01", 0.02], ["04-01", 0.01], ["06-30", 0.01]],
    },
    cloudy: { ...COMMON_CLOUDS, "2026-03-29": 0.52 },
    s1: [["11-01", 0.1], ["03-01", 0.2], ["04-15", -0.3], ["06-30", -0.6]],
    tempAnom: [["11-01", 0.2], ["04-01", 0.6], ["06-30", 0.8]],
  },
  saglikli: {
    winterFactor: 1.08,
    winterSeed: 9127,
    springFrom: "2026-03-01",
    stationEvents: {
      "2026-03-01": 8.0, "2026-03-05": 12.5, "2026-03-11": 9.8, "2026-03-16": 6.0, "2026-03-22": 14.1,
      "2026-03-27": 7.4, "2026-04-02": 11.2, "2026-04-07": 6.8, "2026-04-13": 13.5, "2026-04-18": 5.2,
      "2026-04-24": 9.9, "2026-04-29": 7.1, "2026-05-05": 10.4, "2026-05-11": 6.3, "2026-05-17": 8.8,
      "2026-05-26": 3.5, "2026-06-08": 2.0,
    },
    regionalEvents: {
      "2026-03-01": 7.2, "2026-03-05": 11.8, "2026-03-11": 10.3, "2026-03-16": 5.4, "2026-03-22": 13.0,
      "2026-03-27": 8.1, "2026-04-02": 10.0, "2026-04-07": 7.5, "2026-04-13": 12.2, "2026-04-18": 6.0,
      "2026-04-24": 9.1, "2026-04-29": 7.8, "2026-05-05": 9.6, "2026-05-11": 7.0, "2026-05-17": 8.2,
      "2026-05-26": 3.0, "2026-06-08": 1.8,
    },
    regionalScale: 1.0,
    soil30: [
      ["11-01", 21.0], ["12-01", 26.0], ["01-10", 29.5], ["02-10", 30.5], ["03-10", 29.8], ["04-01", 28.6],
      ["04-20", 27.0], ["05-01", 25.2], ["05-20", 21.5], ["06-05", 17.0], ["06-30", 12.5],
    ],
    anomaly: {
      "P-1182": [["11-01", 0.01], ["02-01", 0.03], ["04-01", 0.02], ["05-01", 0.03], ["06-30", 0.01]],
      "P-1207": [["11-01", 0.0], ["03-01", 0.02], ["04-15", 0.03], ["06-30", 0.01]],
      "P-1244": [["11-01", 0.02], ["02-01", 0.03], ["04-15", 0.04], ["05-20", 0.03], ["06-30", 0.02]],
    },
    cloudy: { ...COMMON_CLOUDS, "2026-03-04": 0.7, "2026-04-13": 0.66, "2026-05-08": 0.55 },
    s1: [["11-01", 0.3], ["03-01", 0.5], ["05-01", 0.3], ["06-30", -0.2]],
    tempAnom: [["11-01", -0.2], ["04-01", 0.0], ["06-30", 0.3]],
  },
  manipulasyon: {
    winterFactor: 0.9,
    winterSeed: 4471,
    springFrom: "2026-03-01",
    stationEvents: {
      "2026-03-02": 11.0, "2026-03-08": 9.0, "2026-03-15": 18.0, "2026-03-20": 10.0, "2026-03-26": 2.0,
      "2026-04-02": 1.5, "2026-05-02": 1.0, "2026-05-14": 2.4,
    },
    regionalEvents: {
      "2026-03-02": 10.0, "2026-03-08": 8.0, "2026-03-15": 20.0, "2026-03-20": 12.0, "2026-03-26": 3.0,
      "2026-04-02": 2.0, "2026-05-02": 1.5, "2026-05-14": 2.0,
    },
    regionalScale: 0.95,
    soil30: [
      ["11-01", 20.0], ["12-01", 24.5], ["01-10", 27.0], ["02-10", 27.2], ["03-01", 25.0], ["03-02", 26.5],
      ["03-08", 25.9], ["03-15", 27.5], ["03-20", 26.4], ["03-26", 23.8], ["04-02", 21.2], ["04-10", 18.3],
      ["04-15", 16.0], ["04-16", 31.0], ["04-17", 29.4], ["04-20", 26.1], ["04-25", 22.0], ["05-01", 18.5],
      ["05-10", 15.0], ["05-20", 12.5], ["06-30", 8.5],
    ],
    anomaly: {
      "P-1182": [["11-01", 0.0], ["03-01", -0.05], ["04-01", -0.09], ["04-18", -0.12], ["05-15", -0.2], ["05-20", -0.21], ["06-30", -0.2]],
      "P-1207": [["11-01", 0.0], ["03-01", -0.04], ["04-15", -0.1], ["05-10", -0.14], ["06-30", -0.12]],
      "P-1244": [["11-01", 0.02], ["04-01", 0.02], ["06-30", 0.01]],
    },
    cloudy: { ...COMMON_CLOUDS },
    s1: [["11-01", 0.0], ["03-01", 0.1], ["04-10", -0.5], ["05-20", -0.8], ["06-30", -1.0]],
    tempAnom: [["11-01", 0.4], ["04-01", 1.0], ["06-30", 1.2]],
    intraday: [
      { ts: "2026-04-16T09:00:00+03:00", soilMoisture: 15.9, rainMm: 0 },
      { ts: "2026-04-16T10:00:00+03:00", soilMoisture: 15.8, rainMm: 0 },
      { ts: "2026-04-16T10:20:00+03:00", soilMoisture: 22.4, rainMm: 0 },
      { ts: "2026-04-16T10:40:00+03:00", soilMoisture: 29.7, rainMm: 0 },
      { ts: "2026-04-16T11:00:00+03:00", soilMoisture: 31.4, rainMm: 0 },
    ],
  },
};

/* ───────────── üretim ───────────── */

// Sentinel-2 geçiş günleri: 4 Kasım'dan 5 günde bir (28 Nisan dahil)
const OBS_DATES: string[] = [];
for (let d = "2025-11-04"; d <= SEASON.end; d = addDays(d, 5)) OBS_DATES.push(d);

const TEMP_NORMAL: KP = [
  ["11-01", 12.5], ["12-01", 6.5], ["01-15", 3.5], ["02-15", 5.5], ["03-15", 10.0], ["04-15", 15.0],
  ["05-15", 21.0], ["06-15", 27.5], ["06-30", 29.5],
];

function buildWorld(key: ScenarioKey, w: World) {
  const rnd = mulberry32(w.winterSeed * 7 + 11);
  const winter = winterRain(w.winterSeed, w.winterFactor, w.springFrom);
  const stationRain: Record<string, number> = { ...winter, ...w.stationEvents };
  const regionalRain: Record<string, number> = {};
  for (const [d, v] of Object.entries(winter)) {
    const jitter = 0.85 + rnd() * 0.3;
    const x = r1(v * w.regionalScale * jitter);
    if (x >= 0.2) regionalRain[d] = x;
  }
  Object.assign(regionalRain, w.regionalEvents);

  const station = DAYS.map((d, i) => {
    const soil = interp(w.soil30, d);
    const soilPrev = i > 6 ? interp(w.soil30, DAYS[i - 7]) : soil;
    const rain = stationRain[d] ?? 0;
    const tmean = interp(TEMP_NORMAL, d) + interp(w.tempAnom, d) + (rnd() - 0.5) * 3;
    const wet = rain > 0.5;
    const hum = Math.max(12, Math.min(96, 78 - (tmean - 8) * 1.9 + (wet ? 14 : 0) + (rnd() - 0.5) * 10));
    const calm = rnd() < 0.12;
    const wind = calm ? 0.2 + rnd() * 0.4 : 1.2 + rnd() * 4.6 + (wet ? 1.5 : 0);
    return {
      date: d,
      rainMm: r1(rain),
      soilMoisture: r1(soil),
      soil10: r1(Math.max(4, soil * 0.86 - 0.8 + (wet ? 3 : 0))),
      soil60: r1(Math.min(40, (soil + soilPrev) / 2 + 4.2)),
      airTempC: r1(tmean),
      humidity: Math.round(hum),
      windMs: r1(wind),
      batteryV: r2(3.96 + rnd() * 0.18),
    };
  });

  const meteo = DAYS.map((d) => ({ date: d, rainMm: r1(regionalRain[d] ?? 0) }));

  const normals: Record<string, { date: string; p10: number; p50: number; p90: number }[]> = {};
  const obs: Record<string, { date: string; ndvi: number | null; ndmi: number | null; cloud: number; s1z: number }[]> = {};
  for (const p of PARCELS) {
    const kind = p.crop === "kirmizi_mercimek" ? "mercimek" : p.irrigated ? "sulu_bugday" : "kirac_bugday";
    normals[p.id] = OBS_DATES.map((d) => {
      const p50 = interp(NORMAL_P50[kind], d);
      const s = spreadFor(p50);
      return { date: d, p10: r3(p50 - s), p50: r3(p50), p90: r3(p50 + s) };
    });
    const prnd = mulberry32(w.winterSeed + p.id.charCodeAt(4) * 131);
    obs[p.id] = OBS_DATES.map((d, idx) => {
      const cloud = w.cloudy[d] ?? r2(prnd() * 0.18);
      const p50 = normals[p.id][idx].p50;
      const pinned = w.pinned?.[d]?.[p.id];
      const anom = interp(w.anomaly[p.id], d);
      const noise = (prnd() - 0.5) * 0.012;
      const ndvi = pinned ?? r3(Math.max(0.06, p50 * (1 + anom) + noise));
      const ndmi = r3(ndvi * 0.62 - 0.12 + (prnd() - 0.5) * 0.02);
      const s1z = r2(interp(w.s1, d) + (prnd() - 0.5) * 0.2);
      return { date: d, ndvi: cloud >= 0.4 ? null : ndvi, ndmi: cloud >= 0.4 ? null : ndmi, cloud, s1z };
    });
  }

  return { station, meteo, intraday: w.intraday ?? [], normals, obs };
}

function geo() {
  // Yerel metre koordinatlarından WGS84'e (örnek konum: Siverek doğusu; parsel sınırları temsilidir)
  const lat0 = 37.7985;
  const lon0 = 39.3895;
  const rot = (-8 * Math.PI) / 180;
  const toLL = ([x, y]: [number, number]): [number, number] => {
    const xr = x * Math.cos(rot) - y * Math.sin(rot);
    const yr = x * Math.sin(rot) + y * Math.cos(rot);
    return [
      Math.round((lon0 + xr / (111320 * Math.cos((lat0 * Math.PI) / 180))) * 1e6) / 1e6,
      Math.round((lat0 + yr / 111320) * 1e6) / 1e6,
    ];
  };
  const poly = (pts: [number, number][]) => [[...pts, pts[0]].map(toLL)];
  const shapes: Record<string, [number, number][]> = {
    // 400 × 200 m ≈ 80 dönüm
    "P-1182": [[-200, -200], [201, -203], [199, 0], [-199, 2]],
    // 197 × 228 m ≈ 45 dönüm
    "P-1207": [[3, 6], [200, 5], [199, 232], [4, 235]],
    // 197 × 609 m ≈ 120 dönüm
    "P-1244": [[-200, 8], [-3, 6], [-2, 614], [-199, 617]],
  };
  const area = (pts: [number, number][]) => {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % pts.length];
      a += x1 * y2 - x2 * y1;
    }
    return Math.abs(a / 2);
  };
  const features: unknown[] = PARCELS.map((p) => ({
    type: "Feature",
    properties: {
      id: p.id,
      name: p.name,
      crop: p.crop,
      areaDonum: p.areaDonum,
      areaM2Polygon: Math.round(area(shapes[p.id])),
      soilType: p.soilType,
      irrigated: p.irrigated,
      kind: "parcel",
    },
    geometry: { type: "Polygon", coordinates: poly(shapes[p.id]) },
  }));
  features.push(
    { type: "Feature", properties: { id: "IST-SVK-01", kind: "station", name: "Köy referans istasyonu" }, geometry: { type: "Point", coordinates: toLL([0, 3]) } },
    { type: "Feature", properties: { id: "KOY", kind: "village", name: "Karakoyun (örnek köy)" }, geometry: { type: "Point", coordinates: toLL([-900, -700]) } },
    { type: "Feature", properties: { id: "GW-01", kind: "gateway", name: "Kooperatif gateway" }, geometry: { type: "Point", coordinates: toLL([-880, -690]) } },
  );
  return {
    type: "FeatureCollection",
    properties: {
      note: "Örnek parsel sınırları — takma adlı, temsilidir. Gerçek tapu/ÇKS sınırı değildir.",
      origin: [lon0, lat0],
      synthetic: true,
    },
    features,
  };
}

function main() {
  const dataDir = path.join(process.cwd(), "data");
  const meta = {
    synthetic: true,
    season: SEASON.label,
    generatedBy: "scripts/generate-data.ts (deterministik)",
    note: "Örnek veri — gerçekçi senaryolar için üretildi; kış yağışları gerçek ERA5 günlük normalinden türetildi. Gerçek diye sunulmaz.",
    climateSource: climate.meta.source,
  };
  const ndvi: Record<string, unknown> = { meta: { ...meta, sensor: "Sentinel-2 L2A (temsili)", obsDates: OBS_DATES }, normals: {}, scenarios: {} };
  const weather: Record<string, unknown> = { meta: { ...meta, stationId: "IST-SVK-01" }, scenarios: {} };
  for (const key of SCENARIO_KEYS) {
    const w = buildWorld(key, WORLDS[key]);
    (ndvi.normals as Record<string, unknown>) = w.normals;
    (ndvi.scenarios as Record<string, unknown>)[key] = w.obs;
    (weather.scenarios as Record<string, unknown>)[key] = { station: w.station, meteo: w.meteo, intraday: w.intraday };
  }
  const g = JSON.stringify(geo(), null, 1);
  fs.writeFileSync(path.join(dataDir, "parcels.geojson"), g);
  // Aynı içerik; paketleyiciler .geojson uzantısını JSON olarak içe aktaramadığı için kod bunu kullanır
  fs.writeFileSync(path.join(dataDir, "parcels.json"), g);
  fs.writeFileSync(path.join(dataDir, "ndvi-2025.json"), JSON.stringify(ndvi));
  fs.writeFileSync(path.join(dataDir, "weather-2025.json"), JSON.stringify(weather));
  console.log(`Üretildi: ${SCENARIO_KEYS.length} senaryo × ${PARCELS.length} parsel, ${DAYS.length} gün, ${OBS_DATES.length} uydu geçişi.`);
}

main();
