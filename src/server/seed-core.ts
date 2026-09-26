/**
 * Tohum verisi (AGRISHIELD_PROMPT.md 6.2): üç parsel, tek köy, tek istasyon, 2025–2026 sezonu.
 * scripts/seed.ts ve boş veritabanında otomatik ön kontrol (preflight) bunu çağırır.
 */
import type { Prisma } from "@prisma/client";
import geo from "@data/parcels.json";
import backtest from "@data/backtest.json";
import { rain30Normal, spi30 } from "@/engine/climate";
import { sumRain30 } from "@/engine/decision";
import { price } from "@/engine/pricing";
import { DEFAULT_THRESHOLDS } from "@/engine/thresholds";
import { getWorld } from "@/sim/data";
import { runScenario } from "@/sim/evaluate";
import { PARCELS, STATION } from "@/sim/parcels";
import { SCENARIOS, SCENARIO_KEYS, SEASON } from "@/sim/scenarios";
import { db } from "./db";
import { createDecision, runPipeline, SEED_CODES } from "./decisions";

type Feature = { type: "Feature"; properties: { id: string; kind: string }; geometry: { type: string; coordinates: unknown } };

function centroid(coords: [number, number][]): [number, number] {
  const pts = coords.slice(0, -1);
  const lon = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const lat = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return [Math.round(lon * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6];
}

export async function seedDatabase(log: (m: string) => void = () => {}): Promise<{ decisions: string[] }> {
  const features = (geo as unknown as { features: Feature[] }).features;

  log("Tablolar temizleniyor…");
  await db.$transaction([
    db.decision.deleteMany(),
    db.chainBlock.deleteMany(),
    db.reading.deleteMany(),
    db.policy.deleteMany(),
    db.station.deleteMany(),
    db.parcel.deleteMany(),
    db.auditLog.deleteMany(),
  ]);

  log("Parseller ve istasyon…");
  for (const p of PARCELS) {
    const f = features.find((x) => x.properties.id === p.id)!;
    const ring = (f.geometry.coordinates as [number, number][][])[0];
    const [lng, lat] = centroid(ring);
    await db.parcel.create({
      data: {
        id: p.id,
        name: p.name,
        village: p.village,
        district: p.district,
        crop: p.crop,
        areaDonum: p.areaDonum,
        soilType: p.soilType,
        irrigated: p.irrigated,
        geojson: JSON.stringify(f),
        centroidLat: lat,
        centroidLng: lng,
      },
    });
  }
  const st = features.find((x) => x.properties.kind === "station")!;
  const [slng, slat] = st.geometry.coordinates as [number, number];
  await db.station.create({ data: { id: STATION.id, village: STATION.village, lat: slat, lng: slng, batteryV: 4.05, lastSeenAt: null } });

  log("Poliçeler (prim: ERA5 backtest tetik olasılığıyla)…");
  const p = backtest.summary.probability;
  for (const parcel of PARCELS) {
    const pr = price({ sumInsuredTl: parcel.policy.sumInsuredTl, payoutRate: parcel.policy.payoutRate, triggerProbability: p, subsidyRate: parcel.policy.subsidyRate, loadRate: 0.25 });
    await db.policy.create({
      data: {
        parcelId: parcel.id,
        season: SEASON.label,
        sumInsuredTl: parcel.policy.sumInsuredTl,
        payoutRate: parcel.policy.payoutRate,
        premiumTl: pr.grossPremiumTl,
        subsidyRate: parcel.policy.subsidyRate,
        thresholds: JSON.stringify(DEFAULT_THRESHOLDS),
      },
    });
  }

  log("Sezon okumaları (kuraklık dünyası)…");
  const w = getWorld("kuraklik-2025");
  const rows: Prisma.ReadingCreateManyInput[] = [];
  for (const d of w.station) {
    rows.push({
      ts: new Date(`${d.date}T12:00:00+03:00`),
      source: "station",
      stationId: STATION.id,
      soilMoisture: d.soilMoisture,
      airTempC: d.airTempC ?? null,
      humidity: d.humidity ?? null,
      rainMm: d.rainMm,
      windMs: d.windMs ?? null,
      scenario: "kuraklik-2025",
      raw: JSON.stringify({ soil10: d.soil10, soil60: d.soil60, batteryV: d.batteryV, synthetic: true }),
    });
  }
  for (const d of w.meteo) {
    const r30 = sumRain30(w.meteo, d.date);
    rows.push({
      ts: new Date(`${d.date}T06:00:00+03:00`),
      source: "meteo",
      rainMm: d.rainMm,
      spi30: r30.n >= 28 ? Math.round(spi30(r30.sum, d.date) * 100) / 100 : null,
      scenario: "kuraklik-2025",
      raw: JSON.stringify({ rain30: r30.sum, normal30: rain30Normal(d.date), synthetic: true }),
    });
  }
  for (const parcel of PARCELS) {
    for (const o of w.obs[parcel.id]) {
      rows.push({
        ts: new Date(`${o.date}T10:40:00+03:00`),
        source: "satellite",
        parcelId: parcel.id,
        ndvi: o.ndvi,
        ndmi: o.ndmi,
        cloudCover: o.cloud,
        scenario: "kuraklik-2025",
        raw: JSON.stringify({ s1z: o.s1z, sensor: "Sentinel-2 L2A (temsili)", synthetic: true }),
      });
    }
  }
  await db.reading.createMany({ data: rows });

  log("Örnek kararlar (her sonuç türü için kalıcı kanıt sayfası)…");
  const codes: string[] = [];
  for (const key of SCENARIO_KEYS) {
    const run = runScenario(key);
    if (!run.decision) throw new Error(`Senaryo kararı üretmedi: ${key}`);
    const simMs = Date.parse(`${run.decision.date}T09:12:03+03:00`);
    const row = await createDecision({
      evaluation: run.decision.evaluation,
      outcome: run.decision.outcome,
      basis: run.decision.basis,
      scenario: key,
      simDate: run.decision.date,
      simMs,
      runId: "seed",
      status: "kesinlesti",
      code: SEED_CODES[key],
    });
    await runPipeline(row.id, { holdPayment: () => false, instant: true });
    codes.push(`${row.code} (${SCENARIOS[key].short}: ${row.outcome})`);
  }
  await db.auditLog.create({ data: { actor: "engine", action: "seed_tamamlandi", detail: `${codes.join(", ")}` } });
  return { decisions: codes };
}

export async function isSeeded(): Promise<boolean> {
  try {
    return (await db.parcel.count()) >= PARCELS.length && (await db.decision.count({ where: { runId: "seed" } })) >= SCENARIO_KEYS.length;
  } catch {
    return false;
  }
}
