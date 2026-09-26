import { z } from "zod";
import { SCENARIO_KEYS } from "@/sim/scenarios";
import { clearDeviceFlags, resetDevice } from "@/server/device";
import { fail, guardMutation, noStore, ok, parseBody } from "@/server/http";
import { ensureRuntime } from "@/server/runtime";
import {
  clearWorldFlags,
  loadScenario,
  play,
  resetBreaker,
  resetSim,
  seek,
  setHoldPayment,
  setStationSource,
  simState,
  stopPending,
  tripBreaker,
} from "@/server/sim-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/sim/load   { scenario }
 * POST /api/sim/play   { speed }        1 sn = speed sim-günü, 0 = duraklat
 * POST /api/sim/seek   { date }
 * POST /api/sim/reset
 * POST /api/sim/settings { stationSource?, holdPayment?, clearFlags?, breaker? }
 * GET  /api/sim/state
 */
const schemas = {
  load: z.object({ scenario: z.enum(SCENARIO_KEYS as [string, ...string[]]) }),
  play: z.object({ speed: z.number().min(0).max(60) }),
  seek: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-AA-GG biçiminde olmalı") }),
  reset: z.object({}).passthrough(),
  settings: z.object({
    stationSource: z.enum(["senaryo", "canli"]).optional(),
    holdPayment: z.boolean().optional(),
    clearFlags: z.boolean().optional(),
    breaker: z.union([z.object({ trip: z.literal(true), reason: z.string().max(120) }), z.object({ trip: z.literal(false) })]).optional(),
    stopDecision: z.string().max(40).optional(),
  }),
};

export async function GET(_req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  await ensureRuntime();
  if (action !== "state") return fail("BULUNAMADI", "Bilinmeyen uç: /api/sim/" + action, 404);
  const s = simState();
  return ok(
    {
      date: s.date,
      speed: s.speed,
      playing: s.playing,
      scenario: s.scenario,
      witnesses: s.parcels.find((p) => p.id === s.focusParcelId)?.witnesses,
      parcelStates: s.parcels,
      full: s,
    },
    noStore,
  );
}

export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  await ensureRuntime();
  const denied = guardMutation(req);
  if (denied) return denied;
  switch (action) {
    case "load": {
      const b = await parseBody(req, schemas.load);
      if (!b.ok) return b.res;
      return ok(loadScenario(b.data.scenario as (typeof SCENARIO_KEYS)[number]));
    }
    case "play": {
      const b = await parseBody(req, schemas.play);
      if (!b.ok) return b.res;
      return ok(play(b.data.speed));
    }
    case "seek": {
      const b = await parseBody(req, schemas.seek);
      if (!b.ok) return b.res;
      return ok(seek(b.data.date));
    }
    case "reset": {
      resetDevice();
      return ok(resetSim());
    }
    case "settings": {
      const b = await parseBody(req, schemas.settings);
      if (!b.ok) return b.res;
      const s = b.data;
      if (s.stationSource) setStationSource(s.stationSource);
      if (s.holdPayment !== undefined) setHoldPayment(s.holdPayment);
      if (s.clearFlags) {
        clearWorldFlags();
        clearDeviceFlags();
      }
      if (s.breaker) {
        if (s.breaker.trip) await tripBreaker(s.breaker.reason);
        else resetBreaker();
      }
      if (s.stopDecision && !stopPending(s.stopDecision)) {
        return fail("ITIRAZ", "İtiraz penceresi kapanmış ya da karar bulunamadı.", 409);
      }
      return ok(simState());
    }
    default:
      return fail("BULUNAMADI", "Bilinmeyen uç: /api/sim/" + action, 404);
  }
}
