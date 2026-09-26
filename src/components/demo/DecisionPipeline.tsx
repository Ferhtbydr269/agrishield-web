"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Hourglass, Link2, Landmark, MessageSquare, Vote, OctagonX, ExternalLink } from "lucide-react";
import type { DecisionSummary } from "@/lib/live-types";
import { postJson, sim as simApi } from "@/lib/api";
import { useLive } from "@/store/sim";
import { DecisionBadge } from "@/components/ui/DecisionBadge";
import { cn, fmtNum, shortHash } from "@/components/ui/cn";

type StepState = "done" | "active" | "wait" | "skip" | "stopped";

function Step({ icon: Icon, title, detail, state, ms, stage }: { icon: typeof Check; title: string; detail?: React.ReactNode; state: StepState; ms?: number; stage?: boolean }) {
  return (
    <li className={cn("flex items-start gap-3", state === "skip" && "opacity-40")}>
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-full border",
          stage ? "size-11" : "size-8",
          state === "done" ? "border-green bg-green/15 text-green-fg" : state === "active" ? "border-wheat bg-wheat/15 text-wheat-fg" : state === "stopped" ? "border-red bg-red/15 text-red-fg" : "border-line text-dim",
        )}
      >
        {state === "done" ? <Check className="size-4" aria-hidden /> : state === "stopped" ? <OctagonX className="size-4" aria-hidden /> : <Icon className={cn("size-4", state === "active" && "animate-pulse")} aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <div className={cn("flex items-center justify-between gap-2 font-semibold", stage ? "text-xl" : "text-sm")}>
          <span>{title}</span>
          {ms != null && state === "done" && <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.68rem] font-normal text-dim">{fmtNum(ms / 1000, 1)} sn</span>}
        </div>
        {detail && <div className={cn("text-dim", stage ? "text-base" : "text-xs")}>{detail}</div>}
      </div>
    </li>
  );
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

/** Karar → itiraz penceresi → zincir → ödeme → SMS. Adım süreleri gerçek ölçümdür. */
export function DecisionPipeline({ decision, stage = false }: { decision: DecisionSummary | null; stage?: boolean }) {
  const skew = useLive((s) => s.clockSkew);
  const pending = useLive((s) => s.chainPending);
  const payment = useLive((s) => (decision ? s.payments[decision.code] : undefined));
  const now = useNow(decision?.status === "itiraz_penceresi");
  const [err, setErr] = useState<string | null>(null);

  if (!decision) {
    return (
      <div className={cn("rounded-xl border border-dashed border-line p-5 text-center text-dim", stage ? "text-xl" : "text-sm")}>
        Henüz karar yok. Zaman makinesini oynatın: tanıklardan ikisi EVET dediğinde karar otomatik üretilir.
      </div>
    );
  }
  const d = decision;
  const left = d.windowEndsAt ? Math.max(0, d.windowEndsAt - (now - skew)) : 0;
  const stopped = d.status === "durduruldu";
  const final = d.status === "kesinlesti";
  const isPay = d.outcome === "ODE";
  const chainState: StepState = stopped ? "skip" : d.txHash ? "done" : final && pending === d.code ? "active" : final ? "active" : "wait";
  const payState: StepState = !isPay || stopped ? "skip" : d.paymentRefText || payment?.phase === "sent" ? "done" : payment?.phase === "pending" ? "active" : payment?.phase === "held" ? "active" : "wait";
  const smsState: StepState = stopped ? "skip" : d.smsText || d.notifiedAt ? "done" : "wait";

  const stop = async () => {
    setErr(null);
    await simApi.settings({ stopDecision: d.id }).catch((e: Error) => setErr(e.message));
  };
  const release = async () => {
    setErr(null);
    await postJson("/api/payout", { decisionId: d.id }).catch((e: Error) => setErr(e.message));
  };

  return (
    <div className="grid gap-4" data-testid="decision-pipeline">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DecisionBadge outcome={d.outcome} size={stage ? "lg" : "md"} />
        <Link href={`/k/${d.code}`} className="inline-flex items-center gap-1.5 font-mono text-sm text-sky-fg underline-offset-2 hover:underline" data-testid="decision-code">
          /k/{d.code} <ExternalLink className="size-3.5" aria-hidden />
        </Link>
      </div>
      <ol className="grid gap-3">
        <Step icon={Vote} title={`Oylama: ${d.yesCount}/3 EVET`} detail={`${d.simDate} · ${d.parcelId}`} state="done" stage={stage} />
        <Step
          icon={Hourglass}
          title={stopped ? "İtiraz penceresinde durduruldu" : final ? "İtiraz penceresi kapandı" : `İtiraz penceresi: ${Math.ceil(left / 1000)} sn`}
          detail={stopped ? "Operatör kararı durdurdu — otomatik ama kontrolsüz değil." : "Karar üretildi; operatör bu sürede durdurabilir."}
          state={stopped ? "stopped" : final ? "done" : "active"}
          ms={d.latencies.itiraz}
          stage={stage}
        />
        <Step
          icon={Link2}
          title={d.txHash ? `Zincire mühürlendi · blok #${d.blockNumber}` : "Zincire yazılıyor…"}
          detail={d.txHash ? <span className="font-mono">{shortHash(d.txHash, 8)}{d.chainMode === "mock" ? " · taklit zincir" : " · Polygon Amoy"}</span> : "evidenceHash + tanık parmak izleri"}
          state={chainState}
          ms={d.latencies.zincir}
          stage={stage}
        />
        <Step
          icon={Landmark}
          title={!isPay ? "Ödeme yok (bu sonuçta)" : d.paymentRefText ? `FAST talimatı · ${d.paymentRefText}` : payment?.phase === "held" ? "Ödeme talimatı hazır" : "Ödeme talimatı"}
          detail={isPay ? "TL · FAST · IBAN — SİMÜLASYON" : undefined}
          state={payState}
          ms={d.latencies.odeme}
          stage={stage}
        />
        <Step icon={MessageSquare} title={d.smsText ? "Çiftçiye SMS gönderildi" : "Çiftçiye bildirim"} detail={d.smsText ? "mesaj ekrandaki telefonda (taklit)" : undefined} state={smsState} stage={stage} />
      </ol>
      <div className="flex flex-wrap gap-2">
        {d.status === "itiraz_penceresi" && (
          <button type="button" onClick={() => void stop()} className="rounded-full border border-red/60 px-4 py-2 text-sm font-semibold text-red-fg hover:bg-red/10">
            Kararı durdur
          </button>
        )}
        {isPay && payment?.phase === "held" && (
          <button type="button" onClick={() => void release()} className="rounded-full bg-wheat px-4 py-2 text-sm font-semibold text-[#1a1305]">
            Ödemeyi gönder
          </button>
        )}
        {d.latencies.toplam != null && (
          <span className="rounded-full bg-surface-2 px-3 py-1.5 font-mono text-xs text-dim">
            karar → SMS: {fmtNum(d.latencies.toplam / 1000, 1)} sn (itiraz penceresi dahil)
          </span>
        )}
      </div>
      {err && <p className="text-sm text-red-fg">{err}</p>}
    </div>
  );
}
