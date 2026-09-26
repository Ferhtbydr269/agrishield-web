import { rehashStored, sealedText } from "@/engine/evidence";
import type { Evidence } from "@/engine/types";
import { db } from "@/server/db";
import { toSummary } from "@/server/decisions";
import { fail, ok } from "@/server/http";
import { ensureRuntime } from "@/server/runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/decision/:code → kanıt paketi (herkese açık, kişisel veri içermez) */
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  await ensureRuntime();
  if (!/^[0-9A-Fa-f]{4}$/.test(code)) return fail("GECERSIZ_KOD", "Karar kodu 4 onaltılık karakterdir (ör. 7F3A).");
  const d = await db.decision.findUnique({ where: { code: code.toUpperCase() } });
  if (!d) return fail("BULUNAMADI", `Karar bulunamadı: ${code}`, 404);
  const evidence = JSON.parse(d.evidence) as Evidence;
  const recomputed = rehashStored(d.evidence);
  return ok(
    {
      decision: toSummary(d),
      evidence,
      sealedText: sealedText(evidence),
      evidenceHash: d.evidenceHash,
      verified: recomputed === d.evidenceHash,
    },
    { headers: { "cache-control": "no-store", "access-control-allow-origin": "*" } },
  );
}
