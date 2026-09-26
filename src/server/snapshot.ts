import type { Snapshot } from "@/lib/live-types";
import { chain } from "./chain";
import { config } from "./config";
import { recentDecisions } from "./decisions";
import { deviceState } from "./device";
import { ensureRuntime } from "./runtime";
import { sceneState } from "./scene";
import { simState } from "./sim-engine";

export async function buildSnapshot(): Promise<Snapshot> {
  await ensureRuntime();
  const ch = chain();
  const [status, blocks, decisions] = await Promise.all([ch.status(), ch.blocks(10), recentDecisions(12).catch(() => [])]);
  return {
    sim: simState(),
    device: deviceState(),
    chain: status,
    blocks,
    decisions,
    scene: sceneState(),
    modes: { offline: config.offline, chain: ch.mode, ai: config.aiMode, sms: config.smsMode },
  };
}
