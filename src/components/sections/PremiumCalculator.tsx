"use client";
import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { price } from "@/engine/pricing";
import { FACTS } from "@/content/facts";
import { cn, fmtTl } from "@/components/ui/cn";

interface SliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
  onChange: (v: number) => void;
  stage?: boolean;
}

function Slider({ id, label, value, min, max, step, fmt, onChange, stage }: SliderProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className={cn("text-dim", stage ? "text-lg" : "text-sm")}>
          {label}
        </label>
        <output htmlFor={id} className={cn("font-mono font-bold tabular", stage ? "text-2xl" : "text-base")}>
          {fmt(value)}
        </output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full" />
    </div>
  );
}

const pctFmt = (v: number) => `%${Math.round(v * 100)}`;

/** Prim hesaplayıcı (8.6). Çıktıda "Bu bir varsayım hesabıdır" notu sabit görünür. */
export function PremiumCalculator({ backtestP, stage = false }: { backtestP: number; stage?: boolean }) {
  const [sum, setSum] = useState(100_000);
  const [rate, setRate] = useState(0.5);
  const [p, setP] = useState(0.1);
  const [sub, setSub] = useState(0.7);
  const [load, setLoad] = useState(0.25);
  const out = useMemo(() => price({ sumInsuredTl: sum, payoutRate: rate, triggerProbability: p, subsidyRate: sub, loadRate: load }), [sum, rate, p, sub, load]);
  const fee = FACTS.izlemeUcreti.value ?? 0;

  return (
    <div className={cn("panel ticks p-5", stage && "p-8")} data-testid="premium-calculator">
      <div className="flex items-center gap-2">
        <Calculator className="size-5 text-wheat-fg" aria-hidden />
        <span className="eyebrow">Prim hesaplayıcı · sigortacının gözüyle</span>
      </div>
      <div className={cn("mt-5 grid gap-6", stage ? "grid-cols-2" : "md:grid-cols-2")}>
        <div className="grid gap-4">
          <Slider id="c-sum" label="Sigorta bedeli" value={sum} min={20_000} max={300_000} step={5_000} fmt={(v) => `₺${fmtTl(v)}`} onChange={setSum} stage={stage} />
          <Slider id="c-rate" label="Tetiklenince ödeme oranı" value={rate} min={0.2} max={1} step={0.05} fmt={pctFmt} onChange={setRate} stage={stage} />
          <Slider id="c-p" label="Tetik olasılığı (yıllık)" value={p} min={0.02} max={0.4} step={0.01} fmt={pctFmt} onChange={setP} stage={stage} />
          <div className="-mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => setP(0.1)} className={cn("rounded-full border px-3 py-1 text-xs", p === 0.1 ? "border-wheat text-wheat-fg" : "border-line text-dim")}>
              Rehber örneği %10
            </button>
            <button type="button" onClick={() => setP(backtestP)} className={cn("rounded-full border px-3 py-1 text-xs", p === backtestP ? "border-wheat text-wheat-fg" : "border-line text-dim")}>
              ERA5 backtest ≤%{Math.round(backtestP * 100)} (üst yaklaşım)
            </button>
          </div>
          <Slider id="c-sub" label="Devlet prim desteği" value={sub} min={0} max={0.8} step={0.05} fmt={pctFmt} onChange={setSub} stage={stage} />
          <Slider id="c-load" label="Gider ve güvenlik payı" value={load} min={0.1} max={0.5} step={0.05} fmt={pctFmt} onChange={setLoad} stage={stage} />
        </div>
        <div className="grid content-start gap-3">
          {[
            ["Tetiklenince ödeme", out.payoutTl, "bedel × ödeme oranı", "text"],
            ["Beklenen hasar", out.expectedLossTl, "olasılık × ödeme", "text"],
            ["Brüt prim", out.grossPremiumTl, `beklenen hasar × (1 + %${Math.round(load * 100)})`, "wheat"],
            ["Devlet desteği", out.subsidyTl, `brüt primin %${Math.round(sub * 100)}'i`, "sky"],
            ["Çiftçinin ödediği", out.farmerPaysTl, "brüt prim − destek", "green"],
          ].map(([k, v, f, tone]) => (
            <div key={k as string} className="flex items-baseline justify-between gap-3 border-b border-line pb-2">
              <div>
                <div className={stage ? "text-lg" : "text-sm"}>{k as string}</div>
                <div className="font-mono text-[0.68rem] text-dim">{f as string}</div>
              </div>
              <div
                className={cn(
                  "font-display font-extrabold tabular",
                  stage ? "text-4xl" : "text-2xl",
                  tone === "wheat" ? "text-wheat-fg" : tone === "green" ? "text-green-fg" : tone === "sky" ? "text-sky-fg" : "text-text",
                )}
                data-testid={`calc-${(k as string).replace(/\s/g, "-")}`}
              >
                ₺{fmtTl(v as number)}
              </div>
            </div>
          ))}
          <div className="rounded-lg bg-surface-2 p-3 text-sm text-dim">
            AgriShield izleme ücreti örneği ₺{fee}: bu brüt primin <b className="text-text">%{out.grossPremiumTl > 0 ? ((fee / out.grossPremiumTl) * 100).toFixed(1).replace(".", ",") : "—"}</b>'i.
          </div>
          <p className="rounded-lg border border-wheat/50 bg-wheat/10 px-3 py-2 text-sm font-semibold text-wheat-fg" role="note">
            Bu bir varsayım hesabıdır.
          </p>
        </div>
      </div>
    </div>
  );
}
