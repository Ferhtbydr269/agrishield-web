import { EventEmitter } from "node:events";
import type { LiveEvent, LiveEventType } from "@/lib/live-types";

/**
 * Süreç içi olay yolu → SSE. Tek sunucu süreci (next start) olduğu için bellekte yeterli.
 * Geliştirmede sıcak yeniden yüklemede kaybolmasın diye globalThis üzerinde tutulur.
 */
interface BusState {
  emitter: EventEmitter;
  seq: number;
  recent: LiveEvent[];
}

const g = globalThis as unknown as { __agrishieldBus?: BusState };

function state(): BusState {
  if (!g.__agrishieldBus) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(200);
    g.__agrishieldBus = { emitter, seq: 0, recent: [] };
  }
  return g.__agrishieldBus;
}

export function publish<T extends LiveEventType>(type: T, data: Extract<LiveEvent, { type: T }>["data"]): LiveEvent {
  const s = state();
  const ev = { id: ++s.seq, type, ts: Date.now(), data } as LiveEvent;
  if (type !== "sim") {
    s.recent.push(ev);
    if (s.recent.length > 80) s.recent.shift();
  }
  s.emitter.emit("event", ev);
  return ev;
}

export function subscribe(fn: (ev: LiveEvent) => void): () => void {
  const s = state();
  s.emitter.on("event", fn);
  return () => s.emitter.off("event", fn);
}

export function recentEvents(): LiveEvent[] {
  return [...state().recent];
}

export function listenerCount(): number {
  return state().emitter.listenerCount("event");
}
