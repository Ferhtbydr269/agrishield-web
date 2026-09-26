/** Sunum sahnesi durumu — tüm ekranlar (/ ve /sunucu) SSE ile senkron kalır. */
import type { SceneState } from "@/lib/live-types";
import { publish } from "./bus";

const g = globalThis as unknown as { __agrishieldScene?: SceneState };

export function sceneState(): SceneState {
  if (!g.__agrishieldScene) g.__agrishieldScene = { index: 0, present: false, blackout: false, origin: "server", startedAt: null };
  return g.__agrishieldScene;
}

export function updateScene(patch: Partial<Omit<SceneState, "origin">>, origin: string): SceneState {
  const s = sceneState();
  const next: SceneState = { ...s, ...patch, origin };
  if (patch.present === true && !s.present) next.startedAt = Date.now();
  if (patch.present === false) next.startedAt = s.startedAt;
  if (patch.startedAt === null) next.startedAt = null;
  g.__agrishieldScene = next;
  publish("scene", next);
  return next;
}
