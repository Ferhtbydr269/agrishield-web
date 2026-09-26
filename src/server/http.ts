/** API yardımcıları — hata biçimi: { error: { code, message } } */
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { config } from "./config";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function parseBody<T extends z.ZodTypeAny>(req: Request, schema: T): Promise<{ ok: true; data: z.infer<T> } | { ok: false; res: NextResponse }> {
  let json: unknown = {};
  try {
    const text = await req.text();
    json = text ? JSON.parse(text) : {};
  } catch {
    return { ok: false, res: fail("GECERSIZ_JSON", "İstek gövdesi geçerli JSON değil.") };
  }
  const r = schema.safeParse(json);
  if (!r.success) {
    const msg = r.error.issues.map((i) => `${i.path.join(".") || "gövde"}: ${i.message}`).join("; ");
    return { ok: false, res: fail("DOGRULAMA", msg) };
  }
  return { ok: true, data: r.data };
}

/* ───────────── hız sınırı (bellek içi, IP başına) ───────────── */

const buckets = (globalThis as unknown as { __agrishieldRl?: Map<string, number[]> }).__agrishieldRl ?? new Map<string, number[]>();
(globalThis as unknown as { __agrishieldRl?: Map<string, number[]> }).__agrishieldRl = buckets;

export function clientIp(req: Request): string {
  const h = req.headers;
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "yerel").trim();
}

export function rateLimit(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  return true;
}

/* ───────────── operatör oturumu ───────────── */

export const OPERATOR_COOKIE = "as_op";

function sign(value: string) {
  return createHmac("sha256", `${config.ingestSecret}|${config.operatorPin}`).update(value).digest("hex");
}

export function operatorToken(): string {
  const exp = Date.now() + 12 * 3_600_000;
  return `${exp}.${sign(String(exp))}`;
}

export function isOperator(req: NextRequest | Request): boolean {
  const cookie = (req.headers.get("cookie") ?? "").split(";").map((s) => s.trim()).find((s) => s.startsWith(`${OPERATOR_COOKIE}=`));
  if (!cookie) return false;
  const [exp, sig] = decodeURIComponent(cookie.slice(OPERATOR_COOKIE.length + 1)).split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expect = sign(exp);
  return expect.length === sig.length && timingSafeEqual(Buffer.from(expect), Buffer.from(sig));
}

/** Herkese açık dağıtımda (PUBLIC_DEPLOY=1) durum değiştiren uçlar operatör ister; sahnede (yerel) açıktır. */
export function guardMutation(req: Request) {
  if (!config.publicDeploy) return null;
  if (isOperator(req)) return null;
  return fail("YETKI", "Bu işlem herkese açık sürümde operatör girişi ister.", 401);
}

export function requireOperator(req: Request) {
  if (config.publicDeploy) return fail("KAPALI", "Operatör paneli herkese açık sürümde kapalıdır.", 403);
  if (isOperator(req)) return null;
  return fail("YETKI", "Operatör girişi gerekli.", 401);
}

export const noStore = { headers: { "cache-control": "no-store" } };
