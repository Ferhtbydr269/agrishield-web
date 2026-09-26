import { getParcelDetail } from "@/server/parcel-detail";
import { fail, ok } from "@/server/http";
import { isScenarioKey } from "@/sim/scenarios";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/parcel/:id?senaryo=kuraklik-2025 → seri + poliçe + kararlar */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sp = new URL(req.url).searchParams.get("senaryo");
  const detail = await getParcelDetail(id, isScenarioKey(sp) ? sp : undefined);
  if (!detail) return fail("BULUNAMADI", `Parsel bulunamadı: ${id}`, 404);
  return ok(detail, { headers: { "cache-control": "no-store" } });
}
