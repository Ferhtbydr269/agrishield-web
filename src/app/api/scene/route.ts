import { z } from "zod";
import { guardMutation, noStore, ok, parseBody } from "@/server/http";
import { ensureRuntime } from "@/server/runtime";
import { sceneState, updateScene } from "@/server/scene";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  await ensureRuntime();
  return ok(sceneState(), noStore);
}

/** POST /api/scene { index?, present?, blackout?, resetTimer?, origin } — /sunucu ↔ / senkronu */
export async function POST(req: Request) {
  await ensureRuntime();
  const denied = guardMutation(req);
  if (denied) return denied;
  const b = await parseBody(
    req,
    z.object({
      index: z.number().int().min(0).max(9).optional(),
      present: z.boolean().optional(),
      blackout: z.boolean().optional(),
      resetTimer: z.boolean().optional(),
      reload: z.boolean().optional(),
      origin: z.string().max(40).default("api"),
    }),
  );
  if (!b.ok) return b.res;
  const { resetTimer, reload, origin, ...patch } = b.data;
  return ok(updateScene({ ...patch, ...(resetTimer ? { startedAt: Date.now() } : {}), ...(reload ? { reloadNonce: sceneState().reloadNonce + 1 } : {}) }, origin));
}
