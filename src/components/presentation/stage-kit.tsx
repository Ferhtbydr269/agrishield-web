"use client";
/**
 * SAHNE KİTİ — 1920×1080 tuval için sabit piksel tipografi ve sahneye özel bileşenler.
 * Okunabilirlik ölçeği (8–10 m, projeksiyon): başlık 72–96 px · alt başlık 28–30 px · gövde 24–26 px ·
 * açıklama 20–22 px · en küçük yazı 18 px. Rakamlar yalnız facts.ts'ten; simülasyon adımları rozetli.
 */
import { useEffect, useState } from "react";
import { Check, CircleHelp, Droplets, Gauge, Hourglass, Landmark, Link2, Loader2, MessageSquare, OctagonX, Sun, Vote, X } from "lucide-react";
import { FACTS, factSource, formatFactValue, type FactId } from "@/content/facts";
import type { Verdict, WitnessKey } from "@/engine/types";
import type { DecisionSummary } from "@/lib/live-types";
import type { PaymentView } from "@/store/sim";
import { useLive } from "@/store/sim";
import { useDevice } from "@/store/device";
import { postJson } from "@/lib/api";
import { price } from "@/engine/pricing";
import { MoistureSparkline } from "@/components/demo/LiveMoisture";
import { SCENES } from "@/content/scenes";
import { WITNESS_META } from "@/components/ui/Witness";
import { LiveBadge, SimBadge } from "@/components/ui/Badges";
import { cn, fmtNum, fmtTl, shortHash } from "@/components/ui/cn";

/* ───────────── tipografi ───────────── */

export function Eyebrow({ i }: { i: number }) {
  return (
    <div className="font-mono text-[22px] font-semibold uppercase tracking-[0.22em] text-wheat-fg">
      {SCENES[i].key} · {SCENES[i].title}
    </div>
  );
}

export function Title({ children, size = 80, className }: { children: React.ReactNode; size?: 64 | 72 | 80 | 88 | 96; className?: string }) {
  return (
    <h2 className={cn("mt-3 font-display font-extrabold leading-[1.02] tracking-tight", className)} style={{ fontSize: size }}>
      {children}
    </h2>
  );
}

export function Sub({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("mt-5 text-[30px] leading-[1.35] text-dim", className)}>{children}</p>;
}

export function KeyHint({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-5 py-2 font-mono text-[20px] text-dim">{children}</span>;
}

/* ───────────── rakam (facts.ts) ───────────── */

const KIND = { resmi: "kaynak", hesap: "hesap", varsayim: "varsayım" } as const;

export function StageStat({ factId, size = 96, tone = "text", label }: { factId: FactId; size?: number; tone?: "text" | "green" | "wheat" | "red" | "sky"; label?: string }) {
  const f = FACTS[factId];
  const v = formatFactValue(f);
  const src = factSource(f);
  const toneCls = { text: "text-text", green: "text-green-fg", wheat: "text-wheat-fg", red: "text-red-fg", sky: "text-sky-fg" }[tone];
  return (
    <figure className="min-w-0">
      <div className={cn("whitespace-nowrap font-display font-extrabold leading-none tracking-tight tabular", toneCls)} style={{ fontSize: size }}>
        {v ?? "—"}
        {f.unit && <span className={cn("font-bold tracking-normal text-dim", !f.unit.startsWith("'") && "ml-2")} style={{ fontSize: Math.round(size * 0.4) }}>{f.unit}</span>}
      </div>
      <figcaption className="mt-3 text-[24px] leading-snug text-text/90">{label ?? f.label}</figcaption>
      <div className="mt-1 font-mono text-[18px] text-dim">
        {KIND[f.kind]} · {src.publisher}
      </div>
    </figure>
  );
}

/* ───────────── tanık kartı ───────────── */

const VERDICT = {
  EVET: { box: "border-green/60 bg-green/10", pill: "bg-green text-bg", text: "EVET", Icon: Check },
  HAYIR: { box: "border-red/55 bg-red/[0.07]", pill: "bg-red text-bg", text: "HAYIR", Icon: X },
  VERI_YOK: { box: "border-wheat/60 bg-wheat/[0.08]", pill: "bg-wheat text-bg", text: "VERİ YOK", Icon: CircleHelp },
  BEKLE: { box: "border-line bg-surface-2/60", pill: "bg-surface-2 text-dim", text: "BEKLENİYOR", Icon: Loader2 },
} as const;

export function StageWitness({
  kind,
  verdict,
  detail,
  size = "lg",
  onClick,
  live,
}: {
  kind: WitnessKey;
  verdict: Verdict | null;
  detail?: string;
  size?: "lg" | "md";
  onClick?: () => void;
  live?: boolean;
}) {
  const m = WITNESS_META[kind];
  const v = verdict ? VERDICT[verdict] : VERDICT.BEKLE;
  const lg = size === "lg";
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn("flex w-full items-center rounded-3xl border text-left transition-colors", v.box, lg ? "gap-7 px-8 py-5" : "gap-6 px-7 py-4")}
      data-verdict={verdict ?? "BEKLE"}
      aria-label={`${m.label} tanığı: ${v.text}`}
    >
      <m.Icon className={cn("shrink-0", m.accent)} style={{ width: lg ? 60 : 48, height: lg ? 60 : 48 }} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className={cn("flex items-center gap-3 font-semibold leading-tight", lg ? "text-[36px]" : "text-[31px]")}>
          {m.label}
          {live && <span className="rounded-md bg-green/20 px-2 py-0.5 font-mono text-[16px] uppercase tracking-wider text-green-fg">canlı</span>}
        </div>
        {detail && <div className={cn("mt-1 leading-snug text-dim", lg ? "text-[22px]" : "text-[20px]")}>{detail}</div>}
      </div>
      <span className={cn("inline-flex shrink-0 items-center gap-2 rounded-2xl font-mono font-bold tracking-wide", v.pill, lg ? "px-6 py-3 text-[32px]" : "px-5 py-2.5 text-[28px]")}>
        <v.Icon style={{ width: lg ? 30 : 26, height: lg ? 30 : 26 }} className={cn(!verdict && "animate-spin")} aria-hidden />
        {v.text}
      </span>
    </Tag>
  );
}

/* ───────────── karar hattı (7. sahne) ───────────── */

type StepState = "done" | "active" | "wait" | "skip" | "stopped";

function Step({ icon: Icon, title, detail, state, ms }: { icon: typeof Check; title: React.ReactNode; detail?: React.ReactNode; state: StepState; ms?: number }) {
  return (
    <li className={cn("flex items-center gap-6", state === "skip" && "opacity-40")}>
      <span
        className={cn(
          "grid size-[60px] shrink-0 place-items-center rounded-full border-2",
          state === "done" ? "border-green bg-green/15 text-green-fg" : state === "active" ? "border-wheat bg-wheat/15 text-wheat-fg" : state === "stopped" ? "border-red bg-red/15 text-red-fg" : "border-line text-dim",
        )}
      >
        {state === "done" ? <Check className="size-7" aria-hidden /> : state === "stopped" ? <OctagonX className="size-7" aria-hidden /> : <Icon className={cn("size-7", state === "active" && "animate-pulse")} aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-4 text-[31px] font-semibold leading-tight">
          <span className="truncate">{title}</span>
          {ms != null && state === "done" && <span className="shrink-0 rounded-lg bg-surface-2 px-3 py-1 font-mono text-[20px] font-normal text-dim">{fmtNum(ms / 1000, 1)} sn</span>}
        </div>
        {detail && <div className="mt-0.5 truncate text-[22px] text-dim">{detail}</div>}
      </div>
    </li>
  );
}

export function StagePipeline({ decision: d }: { decision: DecisionSummary }) {
  const skew = useLive((s) => s.clockSkew);
  const pending = useLive((s) => s.chainPending);
  const payment = useLive((s) => s.payments[d.code]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (d.status !== "itiraz_penceresi") return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [d.status]);
  const left = d.windowEndsAt ? Math.max(0, d.windowEndsAt - (now - skew)) : 0;
  const stopped = d.status === "durduruldu";
  const final = d.status === "kesinlesti";
  const isPay = d.outcome === "ODE";
  const chainState: StepState = stopped ? "skip" : d.txHash ? "done" : final || pending === d.code ? "active" : "wait";
  const payState: StepState = !isPay || stopped ? "skip" : d.paymentRefText || payment?.phase === "sent" ? "done" : payment ? "active" : "wait";
  const smsState: StepState = stopped ? "skip" : d.smsText || d.notifiedAt ? "done" : "wait";
  return (
    <ol className="grid gap-6">
      <Step icon={Vote} title={`Oylama: ${d.yesCount}/3 EVET`} detail={`${d.simDate} · parsel ${d.parcelId}`} state="done" />
      <Step
        icon={Hourglass}
        title={stopped ? "İtiraz penceresinde durduruldu" : final ? "İtiraz penceresi kapandı" : `İtiraz penceresi: ${Math.ceil(left / 1000)} sn`}
        detail={stopped ? "Operatör durdurdu — otomatik ama kontrolsüz değil" : "Operatör bu sürede kararı durdurabilir"}
        state={stopped ? "stopped" : final ? "done" : "active"}
        ms={d.latencies.itiraz}
      />
      <Step
        icon={Link2}
        title={d.txHash ? `Zincire mühürlendi · blok #${d.blockNumber}` : "Zincire yazılıyor…"}
        detail={d.txHash ? <span className="font-mono">tx {shortHash(d.txHash, 10)} · {d.chainMode === "mock" ? "taklit zincir" : "Polygon Amoy"}</span> : "kanıt hash'i + tanık parmak izleri"}
        state={chainState}
        ms={d.latencies.zincir}
      />
      <Step
        icon={Landmark}
        title={!isPay ? "Ödeme yok (bu sonuçta)" : d.paymentRefText ? `Ödeme talimatı · ${d.paymentRefText}` : "Ödeme talimatı hazır (8. sahne)"}
        detail={isPay ? "TL · FAST · IBAN — SİMÜLASYON" : undefined}
        state={payState}
        ms={d.latencies.odeme}
      />
      <Step icon={MessageSquare} title={d.smsText ? "Çiftçiye SMS gönderildi" : "Çiftçiye bildirim"} detail={d.smsText ? "ekrandaki telefonda (SİMÜLASYON)" : undefined} state={smsState} />
    </ol>
  );
}

/* ───────────── ödeme talimatı (8. sahne) ───────────── */

export function StagePayment({ payment, amountTl }: { payment: PaymentView | null; amountTl: number }) {
  const phase = payment?.phase ?? "held";
  const sent = phase === "sent";
  const row = "flex items-center gap-4 text-[24px]";
  return (
    <div className="panel ticks flex h-full flex-col p-9" data-testid="payment-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Landmark className="size-12 text-wheat-fg" aria-hidden />
          <div>
            <div className="font-mono text-[18px] uppercase tracking-[0.2em] text-dim">Ödeme talimatı</div>
            <div className="text-[32px] font-semibold">TL · FAST · kayıtlı IBAN</div>
          </div>
        </div>
        <SimBadge className="!px-4 !py-1.5 !text-[16px]" />
      </div>
      <div className="mt-6 font-display text-[112px] font-extrabold leading-none tabular">₺{fmtTl(payment?.amountTl ?? amountTl)}</div>
      <div className="mt-6 grid gap-2 font-mono">
        <div className={row}>
          <span className="w-[260px] text-dim">Alıcı IBAN</span>
          <span>{payment?.ibanMasked ?? "TR** **** **** 4417"}</span>
        </div>
        <div className={row}>
          <span className="w-[260px] text-dim">Referans</span>
          <span className={sent ? "text-green-fg" : "text-dim"}>{payment?.paymentRefText ?? (phase === "pending" ? "gönderiliyor…" : "bekliyor")}</span>
        </div>
        <div className={row}>
          <span className="w-[260px] text-dim">Zincirdeki iz</span>
          <span className="text-chain-fg">{payment?.refHash ? shortHash(payment.refHash, 10) : "—"}</span>
        </div>
        <div className={row}>
          <span className="w-[260px] text-dim">Süre</span>
          <span>{payment?.ms ? `${fmtNum(payment.ms / 1000, 1)} sn` : "—"}</span>
        </div>
      </div>
      <div className={cn("mt-auto rounded-2xl px-6 py-3 text-center text-[27px] font-semibold", sent ? "bg-green/15 text-green-fg" : phase === "pending" ? "bg-wheat/15 text-wheat-fg" : "bg-surface-2 text-dim")}>
        {sent ? "Talimat başarılı (simülasyon)" : phase === "pending" ? "Banka API'sine gönderiliyor…" : "Ödeme adımı bekliyor"}
      </div>
    </div>
  );
}

/* ───────────── iki zaman çizelgesi (2. sahne) ───────────── */

const MONTHS = ["Eki", "Kas", "Ara", "Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl"];
const at = (m: number, f = 0.5) => ((m + f) / 12) * 100;
type Mark = { x: number; label: string; tone: "dim" | "green" | "red" | "violet"; big?: boolean; up?: boolean };
const TONE_DOT = { dim: "bg-dim", green: "bg-green", red: "bg-red", violet: "bg-violet" } as const;
const TONE_TXT = { dim: "text-dim", green: "text-green-fg", red: "text-red-fg", violet: "text-violet-fg" } as const;

function TimelineRow({ title, marks, accent }: { title: string; marks: Mark[]; accent: string }) {
  return (
    <div>
      <div className={cn("text-[28px] font-semibold", accent)}>{title}</div>
      <div className="relative mt-1 h-[100px]">
        <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded bg-line-strong" />
        <div className="absolute top-1/2 h-[40px] -translate-y-1/2 rounded-lg bg-red/20" style={{ left: `${at(5, 0.15)}%`, width: `${at(7, 0.95) - at(5, 0.15)}%` }} aria-hidden />
        {marks.map((m) => (
          <div key={m.label} className="absolute top-1/2" style={{ left: `${m.x}%` }}>
            <span className={cn("absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-[6px] ring-surface", TONE_DOT[m.tone], m.big ? "size-7" : "size-4")} />
            <span
              className={cn(
                "absolute w-max max-w-[340px] leading-tight",
                m.x > 80 ? "right-0 translate-x-4 text-right" : m.x < 12 ? "left-0 -translate-x-3" : "-translate-x-1/2 text-center",
                m.up ? "bottom-[26px]" : "top-[26px]",
                TONE_TXT[m.tone],
                m.big ? "text-[27px] font-bold" : "text-[23px]",
              )}
            >
              {m.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StageTimelines() {
  return (
    <div className="panel px-12 py-6">
      <div className="grid grid-cols-12 font-mono text-[20px] text-dim" aria-hidden>
        {MONTHS.map((m) => (
          <div key={m} className="text-center">
            {m}
          </div>
        ))}
      </div>
      <div className="mt-2 grid gap-2">
        <TimelineRow
          title="Köy bazlı kuraklık sigortası (bugün)"
          accent="text-text"
          marks={[
            { x: at(0, 0.3), label: "Ekim + poliçe", tone: "dim", up: true },
            { x: at(8, 0.3), label: "Hasat", tone: "dim" },
            { x: at(10, 0.4), label: "Köy verimi açıklanır", tone: "dim", up: true },
            { x: at(11, 0.6), label: "Ödeme — ya da 0 TL", tone: "red", big: true },
          ]}
        />
        <TimelineRow
          title="AgriShield (parsel bazlı, üç tanık)"
          accent="text-green-fg"
          marks={[
            { x: at(0, 0.3), label: "Ekim + poliçe", tone: "dim", up: true },
            { x: at(6, 0.08), label: "Erken uyarı SMS", tone: "violet", up: true },
            { x: at(6, 0.9), label: "3/3 EVET → para IBAN'da", tone: "green", big: true },
          ]}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[20px] text-dim">
        <span className="inline-flex items-center gap-3">
          <span className="inline-block h-4 w-9 rounded bg-red/25" /> kuraklık dönemi (Mart–Mayıs)
        </span>
        <span>Zaman çizelgesi örnektir; köy bazlı üründe ödeme köy veriminin açıklanmasına bağlıdır.</span>
      </div>
    </div>
  );
}

/* ───────────── canlı nem (5. sahne, jüri testi) ───────────── */

export function StageMoisture() {
  const state = useDevice((s) => s.state);
  const witness = useDevice((s) => s.liveWitness);
  const latency = useDevice((s) => s.displayLatencyMs);
  const last = useDevice((s) => s.readings[s.readings.length - 1]);
  const v = last?.soilMoisture ?? null;
  const thr = 18;
  const below = v != null && v < thr;
  const simulated = state?.status !== "canli";
  const pot = (p: "islak" | "kuru") => void postJson("/api/device", { pot: p }).catch(() => undefined);
  return (
    <div className="panel flex h-full min-h-0 flex-col p-8" data-testid="live-panel">
      <div className="flex items-center justify-between gap-4">
        <span className="font-mono text-[19px] uppercase tracking-[0.2em] text-dim">Yer istasyonu · canlı ölçüm</span>
        <span className="flex items-center gap-2">
          {simulated && (
            <>
              <button type="button" onClick={() => pot("kuru")} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 font-mono text-[15px] text-dim hover:bg-surface-2" data-testid="pot-kuru" title="Simüle cihaz: kuru saksı (sahne yedeği)">
                <Sun className="size-4 text-wheat-fg" aria-hidden /> kuru
              </button>
              <button type="button" onClick={() => pot("islak")} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 font-mono text-[15px] text-dim hover:bg-surface-2" data-testid="pot-islak" title="Simüle cihaz: ıslak saksı (sahne yedeği)">
                <Droplets className="size-4 text-sky-fg" aria-hidden /> ıslak
              </button>
            </>
          )}
          <LiveBadge className="!px-4 !py-1.5 !text-[15px]" />
        </span>
      </div>
      <div className="mt-3 flex shrink-0 items-end justify-between gap-4">
        <span className="pb-3 text-[28px] text-dim">Kök bölgesi nemi</span>
        <span className={cn("font-mono text-[104px] font-bold leading-none tabular", below ? "text-red-fg" : "text-text")}>{v == null ? "—" : `%${fmtNum(v, 1)}`}</span>
      </div>
      <div className="relative mt-4 h-[44px] shrink-0 overflow-hidden rounded-xl border border-line bg-surface-2">
        <div
          className="absolute inset-y-0 left-0"
          style={{ width: `${(thr / 50) * 100}%`, backgroundImage: "repeating-linear-gradient(45deg, color-mix(in oklab, var(--red) 30%, transparent) 0 5px, transparent 5px 11px)" }}
          aria-hidden
        />
        <div className="absolute inset-y-0 left-0 transition-[width] duration-500" style={{ width: `${Math.min(100, ((v ?? 0) / 50) * 100)}%`, background: below ? "var(--red)" : "var(--soil)" }} />
        <div className="absolute inset-y-[-2px] w-[3px] bg-text" style={{ left: `${(thr / 50) * 100}%` }} aria-hidden />
      </div>
      <div className="relative mt-2 h-[28px] shrink-0 font-mono text-[19px] text-dim">
        <span className="absolute left-0">%0</span>
        <span className="absolute -translate-x-1/2 text-red-fg" style={{ left: `${(thr / 50) * 100}%` }}>
          solma noktası %{thr} (killi)
        </span>
        <span className="absolute right-0">%50</span>
      </div>
      <div className="mt-3 shrink-0 rounded-2xl border border-line bg-bg/40 p-2.5">
        <MoistureSparkline stage height={84} threshold={thr} />
      </div>
      <div className="mt-4 shrink-0">
        <StageWitness kind="station" verdict={witness?.verdict ?? null} detail={v == null ? witness?.reason : `nem %${fmtNum(v, 1)} ${below ? "<" : "≥"} %${thr} (solma noktası)`} size="md" live />
      </div>
      <div className="mt-auto flex shrink-0 items-center justify-between gap-4 pt-3 font-mono text-[19px] text-dim">
        <span className="inline-flex items-center gap-2">
          <Gauge className="size-5" aria-hidden /> ölçüm → ekran {latency != null ? `${fmtNum(latency / 1000, 2)} sn` : "—"}
          {state?.seq != null ? ` · paket #${state.seq}` : ""}
        </span>
      </div>
    </div>
  );
}

/* ───────────── fiyat zinciri (10. sahne) ───────────── */

export function StagePricing({ backtestP }: { backtestP: number }) {
  const [p, setP] = useState(0.1);
  const [sub, setSub] = useState(0.7);
  const sum = 100_000;
  const rate = 0.5;
  const load = 0.25;
  const out = price({ sumInsuredTl: sum, payoutRate: rate, triggerProbability: p, subsidyRate: sub, loadRate: load });
  const fee = FACTS.izlemeUcreti.value ?? 0;
  const pct = (x: number) => `%${fmtNum(x * 100, 0)}`;
  const rows: [string, string, number, string][] = [
    ["Tetiklenince ödeme", `bedel ₺${fmtTl(sum)} × ${pct(rate)}`, out.payoutTl, "text-text"],
    ["Beklenen hasar", `${pct(p)} olasılık × ödeme`, out.expectedLossTl, "text-text"],
    ["Brüt prim", `+ ${pct(load)} gider ve güvenlik payı`, out.grossPremiumTl, "text-wheat-fg"],
    ["Devlet desteği", `brüt primin ${pct(sub)}'i`, out.subsidyTl, "text-sky-fg"],
    ["Çiftçinin ödediği", "brüt prim − destek", out.farmerPaysTl, "text-green-fg"],
  ];
  const chip = (on: boolean) => cn("rounded-full border px-3.5 py-1 text-[17px]", on ? "border-wheat bg-wheat/15 font-semibold text-wheat-fg" : "border-line text-dim hover:text-text");
  return (
    <div className="panel ticks flex h-full min-h-0 flex-col px-9 py-6" data-testid="premium-calculator">
      <div className="flex items-center justify-between gap-4">
        <span className="font-mono text-[19px] uppercase tracking-[0.2em] text-dim">Prim · sigortacının gözüyle</span>
        <span className="rounded-full border border-wheat/60 bg-wheat/10 px-4 py-1 text-[18px] font-semibold text-wheat-fg">Bu bir varsayım hesabıdır</span>
      </div>
      <div className="mt-3 grid">
        {rows.map(([k, f, v, tone]) => (
          <div key={k} className="flex items-center justify-between gap-6 border-b border-line py-1">
            <div>
              <div className="text-[24px] font-semibold leading-tight">{k}</div>
              <div className="font-mono text-[16px] text-dim">{f}</div>
            </div>
            <div className={cn("font-display text-[42px] font-extrabold leading-none tabular", tone)}>₺{fmtTl(v)}</div>
          </div>
        ))}
      </div>
      <div className="mt-2.5 rounded-xl bg-surface-2 px-5 py-2 text-[20px] text-dim">
        AgriShield izleme ücreti ₺{fee} = brüt primin <b className="text-text">%{out.grossPremiumTl > 0 ? fmtNum((fee / out.grossPremiumTl) * 100, 1) : "—"}</b>&apos;i
      </div>
      <div className="mt-auto grid pt-2.5">
        <div className="flex items-center gap-2.5">
          <span className="text-[19px] text-dim">Tetik olasılığı</span>
          <button type="button" className={chip(p === 0.1)} onClick={() => setP(0.1)}>
            rehber %10
          </button>
          <button type="button" className={chip(p === backtestP)} onClick={() => setP(backtestP)}>
            ERA5 ≤{pct(backtestP)}
          </button>
          <span className="ml-5 text-[19px] text-dim">Destek</span>
          {[0.5, 0.7].map((x) => (
            <button key={x} type="button" className={chip(sub === x)} onClick={() => setSub(x)}>
              {pct(x)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
