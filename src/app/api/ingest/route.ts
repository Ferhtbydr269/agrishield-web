import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { config } from "@/server/config";
import { ingestReal, recordSignatureFailure } from "@/server/device";
import { clientIp, fail, ok, rateLimit } from "@/server/http";
import { ensureRuntime } from "@/server/runtime";
import { STATION } from "@/sim/parcels";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const packet = z.object({
  ts: z.number().int().nonnegative(),
  soilMoisture: z.number().min(0).max(100),
  airTempC: z.number().min(-40).max(70).optional(),
  humidity: z.number().min(0).max(100).optional(),
  rainMm: z.number().min(0).max(500).optional(),
  windMs: z.number().min(0).max(80).optional(),
  batteryV: z.number().min(0).max(6).optional(),
  tamper: z.boolean().optional(),
  seq: z.number().int().nonnegative(),
});

/**
 * POST /api/ingest  (ESP32 → sunucu)
 * Header: X-Device-Id: IST-SVK-01
 *         X-Signature: hex(hmac_sha256(INGEST_SECRET, body))
 * İmza tutmazsa 401. Zaman penceresi ±120 sn. seq geri giderse "tekrar saldırısı" bayrağı.
 */
export async function POST(req: Request) {
  const receivedAt = Date.now();
  await ensureRuntime();
  if (!rateLimit(`ingest:${clientIp(req)}`, 120)) return fail("HIZ_SINIRI", "Dakikada en fazla 120 istek.", 429);
  const deviceId = req.headers.get("x-device-id");
  if (deviceId !== STATION.id) return fail("CIHAZ", "Bilinmeyen cihaz kimliği.", 401);
  const body = await req.text();
  const sig = (req.headers.get("x-signature") ?? "").toLowerCase();
  const expect = createHmac("sha256", config.ingestSecret).update(body).digest("hex");
  if (sig.length !== expect.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) {
    await recordSignatureFailure(`imza tutmadı (${clientIp(req)})`);
    return fail("IMZA", "HMAC imzası tutmadı.", 401);
  }
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return fail("GECERSIZ_JSON", "Gövde JSON değil.");
  }
  const p = packet.safeParse(json);
  if (!p.success) return fail("DOGRULAMA", p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  const skew = Math.abs(receivedAt / 1000 - p.data.ts);
  if (skew > 120) return fail("ZAMAN", `Paket zamanı sunucudan ${Math.round(skew)} sn farklı (±120 sn). Cihaz saati /api/time ile eşitlenmeli.`, 401);
  const r = await ingestReal(p.data, receivedAt, body);
  return ok({ ok: true, serverTs: Math.floor(Date.now() / 1000), nextIntervalSec: config.ingestIntervalSec, flags: r.flags });
}
