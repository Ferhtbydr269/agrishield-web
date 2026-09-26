"use client";
import { useEffect, useState } from "react";
import type { NormalPoint, SatelliteObs } from "@/engine/types";
import type { ParcelDetail } from "@/server/parcel-detail";

export interface FocusSeries {
  obs: SatelliteObs[];
  normals: NormalPoint[];
  station: { date: string; rainMm: number; soil: number }[];
  meteo: { date: string; rainMm: number }[];
  crop: ParcelDetail["parcel"]["crop"];
  timeline: ParcelDetail["timeline"];
}

const cache = new Map<string, FocusSeries>();

/** Seçili senaryodaki bir parselin sezon serileri (NDVI, normal, yağış, tanık geçmişi) */
export function useFocusSeries(scenario: string | undefined, parcelId: string | undefined): FocusSeries | null {
  const key = scenario && parcelId ? `${scenario}|${parcelId}` : null;
  const [data, setData] = useState<FocusSeries | null>(key ? cache.get(key) ?? null : null);
  useEffect(() => {
    if (!key || !scenario || !parcelId) return;
    const hit = cache.get(key);
    if (hit) {
      setData(hit);
      return;
    }
    let alive = true;
    fetch(`/api/parcel/${parcelId}?senaryo=${scenario}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: ParcelDetail) => {
        const s: FocusSeries = { ...d.series, crop: d.parcel.crop, timeline: d.timeline };
        cache.set(key, s);
        if (alive) setData(s);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [key, scenario, parcelId]);
  return data;
}
