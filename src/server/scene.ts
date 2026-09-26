/** Sunum sahnesi durumu — tüm ekranlar (/ ve /sunucu) SSE ile senkron kalır. */
import type { SceneState } from "@/lib/live-types";
import { publish } from "./bus";

const g = globalThis as unknown as { __agrishieldScene?: SceneState };
const DEFAULT: SceneState = { index: 0, present: false, blackout: false, origin: "server", startedAt: null, reloadNonce: 0 };

export function sceneState(): SceneState {
  // HMR sonrası eski şekilli durum kalmışsa eksik alanları varsayılanla tamamla
  g.__agrishieldScene = { ...DEFAULT, ...g.__agrishieldScene };
  if (!Number.isFinite(g.__agrishieldScene.reloadNonce)) g.__agrishieldScene.reloadNonce = 0;
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
