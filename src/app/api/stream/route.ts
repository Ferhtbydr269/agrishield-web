import { subscribe } from "@/server/bus";
import { buildSnapshot } from "@/server/snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/stream → text/event-stream (snapshot | sim | reading | witness | decision | chain | payment | sms | device | scene | early | breaker) */
export async function GET(req: Request) {
  const encoder = new TextEncoder();
  const snapshot = await buildSnapshot();
  let unsub: (() => void) | null = null;
  let hb: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (type: string, data: unknown, id?: number) => {
        try {
          controller.enqueue(encoder.encode(`${id ? `id: ${id}\n` : ""}event: ${type}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          /* bağlantı kapandı */
        }
      };
      controller.enqueue(encoder.encode("retry: 1500\n\n"));
      send("snapshot", { ...snapshot, serverTs: Date.now() });
      unsub = subscribe((ev) => send(ev.type, { ...ev.data, __ts: ev.ts }, ev.id));
      hb = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: nabız ${Date.now()}\n\n`));
        } catch {
          /* kapandı */
        }
      }, 15_000);
      req.signal.addEventListener("abort", () => {
        unsub?.();
        if (hb) clearInterval(hb);
        try {
          controller.close();
        } catch {
          /* zaten kapalı */
        }
      });
    },
    cancel() {
      unsub?.();
      if (hb) clearInterval(hb);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
