/**
 * Senaryo verisine tipli erişim. Veri dosyaları derleme zamanında pakete girer (internet gerekmez).
 */
import ndviJson from "@data/ndvi-2025.json";
import weatherJson from "@data/weather-2025.json";
import type { NormalPoint, SatelliteObs, StationDay } from "@/engine/types";
import type { ScenarioKey } from "./scenarios";

export interface IntradayReading {
  ts: string;
  soilMoisture: number;
  rainMm: number;
}

export interface WorldData {
  station: StationDay[];
  meteo: { date: string; rainMm: number }[];
  intraday: IntradayReading[];
  obs: Record<string, SatelliteObs[]>;
}

type NdviFile = {
  meta: { synthetic: boolean; note: string; obsDates: string[]; sensor: string };
  normals: Record<string, NormalPoint[]>;
  scenarios: Record<string, Record<string, SatelliteObs[]>>;
};
type WeatherFile = {
  meta: { synthetic: boolean; note: string; stationId: string };
  scenarios: Record<string, { station: StationDay[]; meteo: { date: string; rainMm: number }[]; intraday: IntradayReading[] }>;
};

const ndvi = ndviJson as unknown as NdviFile;
const weather = weatherJson as unknown as WeatherFile;

export const DATA_META = {
  synthetic: ndvi.meta.synthetic && weather.meta.synthetic,
  note: ndvi.meta.note,
  obsDates: ndvi.meta.obsDates,
};

export function normalsFor(parcelId: string): NormalPoint[] {
  return ndvi.normals[parcelId] ?? [];
}

const cache = new Map<ScenarioKey, WorldData>();

export function getWorld(key: ScenarioKey): WorldData {
  const hit = cache.get(key);
  if (hit) return hit;
  const w = weather.scenarios[key];
  const o = ndvi.scenarios[key];
  if (!w || !o) throw new Error(`Senaryo verisi yok: ${key}`);
  const world: WorldData = { station: w.station, meteo: w.meteo, intraday: w.intraday ?? [], obs: o };
  cache.set(key, world);
  return world;
}
