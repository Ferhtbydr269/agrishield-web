import { z } from "zod";
import { clearDeviceFlags, deviceState, recentReadings, resetDevice, setForceSim, setSimEnabled, setSimPot } from "@/server/device";
import { guardMutation, noStore, ok, parseBody } from "@/server/http";
import { ensureRuntime } from "@/server/runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/device → cihaz durumu + son okumalar */
export async function GET() {
  await ensureRuntime();
  return ok({ state: deviceState(), readings: recentReadings(120) }, noStore);
}

/** POST /api/device { pot?: "islak"|"kuru", clearFlags?, simEnabled?, reset? } — simüle cihaz (sahne yedeği) */
export async function POST(req: Request) {
  await ensureRuntime();
  const denied = guardMutation(req);
  if (denied) return denied;
  const b = await parseBody(
    req,
    z.object({ pot: z.enum(["islak", "kuru"]).optional(), clearFlags: z.boolean().optional(), simEnabled: z.boolean().optional(), reset: z.boolean().optional(), forceSim: z.boolean().optional() }),
  );
  if (!b.ok) return b.res;
  if (b.data.reset) resetDevice();
  if (b.data.pot) setSimPot(b.data.pot);
  if (b.data.clearFlags) clearDeviceFlags();
  if (b.data.simEnabled !== undefined) setSimEnabled(b.data.simEnabled);
  if (b.data.forceSim !== undefined) setForceSim(b.data.forceSim);
  return ok(deviceState());
}
