import { z } from "zod";
import { smsNow } from "@/server/decisions";
import { fail, guardMutation, ok, parseBody } from "@/server/http";
import { ensureRuntime } from "@/server/runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/sms { decisionId } → gönderilen metin (mock: yalnız ekranda) */
export async function POST(req: Request) {
  await ensureRuntime();
  const denied = guardMutation(req);
  if (denied) return denied;
  const b = await parseBody(req, z.object({ decisionId: z.string().min(4).max(40) }));
  if (!b.ok) return b.res;
  const r = await smsNow(b.data.decisionId);
  if ("error" in r) return fail("SMS", r.error ?? "SMS gönderilemedi", 404);
  return ok(r);
}
