import { z } from "zod";
import { chain, chainFallbackReason, mockChain } from "@/server/chain";
import { anchorNow } from "@/server/decisions";
import { fail, guardMutation, noStore, ok, parseBody } from "@/server/http";
import { ensureRuntime } from "@/server/runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/chain/status → { mode, network, contract, lastTx, balance } */
export async function GET(_req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  await ensureRuntime();
  if (action === "status") {
    const c = chain();
    const s = await c.status();
    const integrity = c.mode === "mock" ? await mockChain().verify() : null;
    return ok({ ...s, integrity, fallbackReason: chainFallbackReason(), blocks: await c.blocks(12) }, noStore);
  }
  return fail("BULUNAMADI", "Bilinmeyen uç: /api/chain/" + action, 404);
}

/** POST /api/chain/anchor { decisionId } → { txHash, blockNumber, explorerUrl, mode } */
export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  await ensureRuntime();
  if (action !== "anchor") return fail("BULUNAMADI", "Bilinmeyen uç: /api/chain/" + action, 404);
  const denied = guardMutation(req);
  if (denied) return denied;
  const b = await parseBody(req, z.object({ decisionId: z.string().min(4).max(40) }));
  if (!b.ok) return b.res;
  const r = await anchorNow(b.data.decisionId);
  if ("error" in r) return fail("ZINCIR", r.error ?? "Zincire yazılamadı", 409);
  return ok(r);
}
