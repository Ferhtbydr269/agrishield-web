/** Parsel detayı: poliçe, kararlar, seçili senaryodaki sezon serileri ve tanık geçmişi. */
import { phenologyTable } from "@/engine/phenology";
import type { Crop } from "@/engine/types";
import { getWorld, normalsFor, DATA_META } from "@/sim/data";
import { seasonTimeline } from "@/sim/evaluate";
import { getParcel } from "@/sim/parcels";
import { SCENARIOS, SEASON, type ScenarioKey } from "@/sim/scenarios";
import { db } from "./db";
import { toSummary } from "./decisions";
import { ensureRuntime } from "./runtime";
import { simState } from "./sim-engine";

export async function getParcelDetail(id: string, scenarioParam?: ScenarioKey) {
  await ensureRuntime();
  const info = getParcel(id);
  if (!info) return null;
  const scenario = scenarioParam ?? simState().scenario;
  const [row, policy, decisions] = await Promise.all([
    db.parcel.findUnique({ where: { id } }),
    db.policy.findFirst({ where: { parcelId: id, season: SEASON.label } }),
    db.decision.findMany({ where: { parcelId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  const world = getWorld(scenario);
  return {
    parcel: {
      ...info,
      centroidLat: row?.centroidLat ?? null,
      centroidLng: row?.centroidLng ?? null,
      geojson: row?.geojson ? JSON.parse(row.geojson) : null,
    },
    policy: policy
      ? {
          id: policy.id,
          season: policy.season,
          sumInsuredTl: policy.sumInsuredTl,
          payoutRate: policy.payoutRate,
          premiumTl: policy.premiumTl,
          subsidyRate: policy.subsidyRate,
          status: policy.status,
          thresholds: JSON.parse(policy.thresholds),
        }
      : null,
    decisions: decisions.map(toSummary),
    scenario: { key: scenario, label: SCENARIOS[scenario].label, focus: SCENARIOS[scenario].focusParcelId === id, description: SCENARIOS[scenario].description },
    synthetic: DATA_META.synthetic,
    dataNote: DATA_META.note,
    series: {
      obs: world.obs[id],
      normals: normalsFor(id),
      station: world.station.map((d) => ({ date: d.date, rainMm: d.rainMm, soil: d.soilMoisture })),
      meteo: world.meteo,
    },
    timeline: seasonTimeline(scenario, id),
    phenology: phenologyTable(info.crop as Crop),
    season: SEASON,
  };
}

export type ParcelDetail = NonNullable<Awaited<ReturnType<typeof getParcelDetail>>>;
