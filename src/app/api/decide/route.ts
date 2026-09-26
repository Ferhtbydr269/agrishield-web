import { z } from "zod";
import { PARCELS } from "@/sim/parcels";
import { guardMutation, isOperator, ok, fail, parseBody } from "@/server/http";
import { ensureRuntime } from "@/server/runtime";
import { manualDecide } from "@/server/sim-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  parcelId: z.enum(PARCELS.map((p) => p.id) as [string, ...string[]]),
  force: z.boolean().optional().default(false),
});

/** POST /api/decide { parcelId, force } → Decision. force (emniyetleri atlama) yalnız operatör. */
export async function POST(req: Request) {
  await ensureRuntime();
  const denied = guardMutation(req);
  if (denied) return denied;
  const b = await parseBody(req, schema);
  if (!b.ok) return b.res;
  if (b.data.force && !isOperator(req)) return fail("YETKI", "force=true yalnız operatör girişiyle kullanılabilir.", 401);
  const r = await manualDecide(b.data.parcelId, b.data.force);
  if (!r.ok) return fail("EMNIYET", r.message ?? "Karar üretilemedi", 409);
  return ok(r.decision);
}
