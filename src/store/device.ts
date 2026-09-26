"use client";
/** Canlı donanım (HIL) durumu ve son okumalar — canlı nem grafiği ve 3D toprak kesiti bunu kullanır. */
import { create } from "zustand";
import type { DeviceState, LiveReading } from "@/lib/live-types";
import type { StationWitness } from "@/engine/types";

interface DeviceStore {
  state: DeviceState | null;
  readings: LiveReading[];
  liveWitness: StationWitness | null;
  /** son okumanın ekrana ulaşma gecikmesi (ms, sunucu alımından ekrana) */
  displayLatencyMs: number | null;
  setState: (s: DeviceState) => void;
  addReading: (r: LiveReading, clockSkew: number) => void;
  setWitness: (w: StationWitness) => void;
  seed: (readings: LiveReading[]) => void;
}

export const useDevice = create<DeviceStore>((set, get) => ({
  state: null,
  readings: [],
  liveWitness: null,
  displayLatencyMs: null,
  setState: (s) => set({ state: s, liveWitness: s.liveWitness ?? get().liveWitness }),
  addReading: (r, skew) => {
    const serverNow = Date.now() - skew;
    set({ readings: [...get().readings, r].slice(-150), displayLatencyMs: Math.max(0, serverNow - r.receivedAt) });
  },
  setWitness: (w) => set({ liveWitness: w }),
  seed: (readings) => set({ readings: readings.slice(-150) }),
}));
