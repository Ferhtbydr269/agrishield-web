"use client";
/**
 * Store → 3D köprüsü. Veriler bir ref'e yazılır; useFrame her karede buradan okur.
 * Böylece SSE olayları (5 Hz) sahneyi React'e yeniden çizdirmez; sadece uniform'lar güncellenir.
 */
import { useEffect, useRef } from "react";
import type { Outcome, Verdict } from "@/engine/types";
import type { SimState } from "@/lib/live-types";
import { useDevice } from "@/store/device";
import { useLive } from "@/store/sim";

export interface SceneLive {
  ndvi: Record<string, number>;
  soil: { s10: number; s30: number; s60: number };
  wind: number;
  rainToday: number;
  tempC: number;
  batteryV: number;
  cloud: number;
  hour: number;
  speed: number;
  playing: boolean;
  date: string;
  satPass: SimState["satPass"];
  flags: number;
  deviceStatus: "canli" | "simule" | "sessiz";
  deviceSoil: number | null;
  deviceWind: number | null;
  readingTick: number;
  dayTick: number;
  witnesses: { sat: Verdict | null; station: Verdict | null; meteo: Verdict | null };
  outcome: Outcome | null;
  blocks: number;
  irrigated: Record<string, boolean>;
  latencies: Record<string, number>;
}

export function initialLive(): SceneLive {
  return {
    ndvi: { "P-1182": 0.45, "P-1207": 0.4, "P-1244": 0.55 },
    soil: { s10: 22, s30: 25, s60: 28 },
    wind: 2,
    rainToday: 0,
    tempC: 14,
    batteryV: 4.05,
    cloud: 0.1,
    hour: 11,
    speed: 0,
    playing: false,
    date: "2026-03-01",
    satPass: { active: false, date: null, cloudy: false, sensor: "S2", progress: 0 },
    flags: 0,
    deviceStatus: "simule",
    deviceSoil: null,
    deviceWind: null,
    readingTick: 0,
    dayTick: 0,
    witnesses: { sat: null, station: null, meteo: null },
    outcome: null,
    blocks: 0,
    irrigated: { "P-1244": true },
    latencies: {},
  };
}

function applySim(l: SceneLive, s: SimState) {
  for (const p of s.parcels) {
    if (p.ndvi != null) l.ndvi[p.id] = p.ndvi;
    l.irrigated[p.id] = p.irrigated;
  }
  const st = s.station;
  if (st.soil30 != null) l.soil = { s10: st.soil10 ?? st.soil30 - 2, s30: st.soil30, s60: st.soil60 ?? st.soil30 + 3 };
  l.wind = st.windMs ?? l.wind;
  if (l.date !== s.date) {
    l.dayTick++;
    l.readingTick++;
  }
  l.rainToday = st.rainToday;
  l.tempC = st.airTempC ?? l.tempC;
  l.batteryV = st.batteryV ?? l.batteryV;
  l.cloud = s.weather.cloudCover;
  l.hour = s.weather.hour;
  l.speed = s.speed;
  l.playing = s.playing;
  l.date = s.date;
  l.satPass = s.satPass;
  l.flags = st.flags.length;
  const f = s.parcels.find((p) => p.id === s.focusParcelId);
  if (f) {
    l.witnesses = { sat: f.witnesses.satellite.verdict, station: f.witnesses.station.verdict, meteo: f.witnesses.meteo.verdict };
    l.outcome = f.decision?.outcome ?? null;
    l.latencies = f.decision?.latencies ?? {};
  }
}

export function useSceneLive() {
  const ref = useRef<SceneLive>(initialLive());
  useEffect(() => {
    const l = ref.current;
    const s0 = useLive.getState();
    if (s0.sim) applySim(l, s0.sim);
    l.blocks = s0.blocks.length;
    const d0 = useDevice.getState();
    if (d0.state) l.deviceStatus = d0.state.status;
    const unsubSim = useLive.subscribe((s, prev) => {
      if (s.sim && s.sim !== prev.sim) applySim(l, s.sim);
      if (s.blocks !== prev.blocks) l.blocks = s.blocks.length;
    });
    const unsubDev = useDevice.subscribe((d, prev) => {
      if (d.state) {
        l.deviceStatus = d.state.status;
        if (d.state.flags.length) l.flags = Math.max(l.flags, d.state.flags.length);
      }
      if (d.readings !== prev.readings) {
        const last = d.readings[d.readings.length - 1];
        if (last) {
          l.deviceSoil = last.soilMoisture;
          l.deviceWind = last.windMs;
          l.readingTick++;
        }
      }
    });
    return () => {
      unsubSim();
      unsubDev();
    };
  }, []);
  return ref;
}
