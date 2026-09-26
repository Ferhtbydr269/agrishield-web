import { z } from "zod";
import { payoutNow } from "@/server/decisions";
import { fail, guardMutation, ok, parseBody } from "@/server/http";
import { ensureRuntime } from "@/server/runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/payout { decisionId } → { paymentRef: "FAST-SIM-8831", amountTl, simulated: true } — TAKLİT */
export async function POST(req: Request) {
  await ensureRuntime();
  const denied = guardMutation(req);
  if (denied) return denied;
  const b = await parseBody(req, z.object({ decisionId: z.string().min(4).max(40) }));
  if (!b.ok) return b.res;
  const r = await payoutNow(b.data.decisionId);
  if ("error" in r) return fail("ODEME", r.error ?? "Ödeme yapılamadı", 409);
  return ok(r);
}
