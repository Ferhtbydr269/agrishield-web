export const dynamic = "force-dynamic";

/** GET /api/time → cihaz saat eşitleme (sahnede internet/NTP olmasa da HMAC zaman penceresi tutsun) */
export function GET() {
  return new Response(String(Math.floor(Date.now() / 1000)), { headers: { "content-type": "text/plain", "cache-control": "no-store" } });
}
