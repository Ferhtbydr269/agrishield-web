"use client";
/**
 * Tek SSE bağlantısı (/api/stream) — tüm canlı bileşenler Zustand store'larından okur.
 * Bağlantı koparsa EventSource kendiliğinden yeniden bağlanır; her bağlantıda tam anlık görüntü gelir.
 */
import { useEffect } from "react";
import type { LiveEvent, LiveReading, Snapshot } from "@/lib/live-types";
import { useDevice } from "@/store/device";
import { usePresentation } from "@/store/presentation";
import { useLive } from "@/store/sim";

const TYPES: LiveEvent["type"][] = ["sim", "reading", "witness", "decision", "chain", "payment", "sms", "device", "scene", "early", "breaker"];

export function LiveProvider() {
  useEffect(() => {
    // hata ayıklama ve e2e testleri için store'lara erişim
    (window as unknown as Record<string, unknown>).__agrishield = { live: useLive, device: useDevice, presentation: usePresentation };
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      es = new EventSource("/api/stream");
      es.onopen = () => useLive.getState().setConnected(true);
      es.onerror = () => {
        useLive.getState().setConnected(false);
        if (es?.readyState === EventSource.CLOSED && !closed) {
          retry = setTimeout(connect, 2000);
        }
      };
      es.addEventListener("snapshot", (e) => {
        const s = JSON.parse((e as MessageEvent).data) as Snapshot & { serverTs?: number };
        useLive.getState().applySnapshot(s);
        useDevice.getState().setState(s.device);
        usePresentation.getState().applyRemote(s.scene);
        useLive.getState().setConnected(true);
        // son okumaları doldur (canlı grafik boş başlamasın)
        fetch("/api/device", { cache: "no-store" })
          .then((r) => r.json())
          .then((j: { readings: LiveReading[] }) => useDevice.getState().seed(j.readings ?? []))
          .catch(() => undefined);
      });
      for (const type of TYPES) {
        es.addEventListener(type, (e) => {
          const raw = JSON.parse((e as MessageEvent).data) as Record<string, unknown> & { __ts?: number };
          const { __ts, ...data } = raw;
          void __ts;
          if (type === "reading") {
            useDevice.getState().addReading(data as unknown as LiveReading, useLive.getState().clockSkew);
            return;
          }
          if (type === "witness") {
            useDevice.getState().setWitness((data as { witness: never }).witness);
            return;
          }
          if (type === "device") {
            useDevice.getState().setState(data as never);
            return;
          }
          if (type === "scene") {
            usePresentation.getState().applyRemote(data as never);
            return;
          }
          useLive.getState().apply({ type, data } as never);
        });
      }
    };
    connect();
    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      es?.close();
    };
  }, []);
  return null;
}
