import { z } from "zod";
import { ask } from "@/server/ai";
import { audit } from "@/server/audit";
import { clientIp, fail, ok, parseBody, rateLimit } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/ask { q } → { answer, sources[], confidence, mode } */
export async function POST(req: Request) {
  const ip = clientIp(req);
  // yerelde tüm stant ziyaretçileri tek kovayı paylaşır → sınır daha geniş
  if (!rateLimit(`ask:${ip}`, ip === "yerel" ? 90 : 30)) return fail("HIZ_SINIRI", "Çok fazla soru; bir dakika sonra tekrar deneyin.", 429);
  const b = await parseBody(req, z.object({ q: z.string().trim().min(2, "Soru çok kısa").max(600, "Soru en fazla 600 karakter") }));
  if (!b.ok) return b.res;
  const r = await ask(b.data.q);
  // Kullanıcı girdisi loglara kısaltılarak yazılır
  void audit("ai", "soru", { q: b.data.q.slice(0, 120), match: r.matchedId, mode: r.mode, confidence: r.confidence });
  return ok(r);
}
