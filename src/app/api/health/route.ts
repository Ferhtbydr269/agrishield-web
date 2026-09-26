import { health } from "@/server/health";
import { noStore, ok } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/health → { db, device, chain, ai, sms, sim, uptime } */
export async function GET() {
  return ok(await health(), noStore);
}
