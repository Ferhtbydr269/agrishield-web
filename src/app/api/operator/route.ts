import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { audit } from "@/server/audit";
import { config } from "@/server/config";
import { db } from "@/server/db";
import { clientIp, fail, isOperator, OPERATOR_COOKIE, ok, operatorToken, parseBody, rateLimit } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/operator → oturum durumu + son denetim kayıtları (yalnız operatör) */
export async function GET(req: Request) {
  if (config.publicDeploy) return fail("KAPALI", "Operatör paneli herkese açık sürümde kapalıdır.", 403);
  if (!isOperator(req)) return ok({ authed: false });
  const logs = await db.auditLog.findMany({ orderBy: { ts: "desc" }, take: 60 });
  return ok({ authed: true, logs: logs.map((l) => ({ ...l, ts: l.ts.getTime() })) }, { headers: { "cache-control": "no-store" } });
}

/** POST /api/operator { pin } → PIN ile giriş (dakikada 5 deneme), { logout: true } → çıkış */
export async function POST(req: Request) {
  if (config.publicDeploy) return fail("KAPALI", "Operatör paneli herkese açık sürümde kapalıdır.", 403);
  const b = await parseBody(req, z.object({ pin: z.string().max(12).optional(), logout: z.boolean().optional() }));
  if (!b.ok) return b.res;
  if (b.data.logout) {
    const res = ok({ authed: false });
    res.cookies.set(OPERATOR_COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
    return res;
  }
  const ip = clientIp(req);
  if (!rateLimit(`pin:${ip}`, 5)) {
    await audit("operator", "pin_hiz_siniri", ip);
    return fail("HIZ_SINIRI", "Dakikada en fazla 5 deneme. Bir dakika bekleyin.", 429);
  }
  const pin = b.data.pin ?? "";
  const good = pin.length === config.operatorPin.length && timingSafeEqual(Buffer.from(pin), Buffer.from(config.operatorPin));
  if (!good) {
    await audit("operator", "pin_hatali", ip);
    return fail("PIN", "PIN hatalı.", 401);
  }
  await audit("operator", "giris", ip);
  const res = ok({ authed: true });
  res.cookies.set(OPERATOR_COOKIE, operatorToken(), { httpOnly: true, sameSite: "strict", path: "/", maxAge: 12 * 3600 });
  return res;
}
