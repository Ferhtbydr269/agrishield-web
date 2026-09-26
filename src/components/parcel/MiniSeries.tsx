"use client";
/** Küçük sezon serisi: çizgi + eşik çizgisi + eşiğin öbür yanı gölgeli + seçili gün imleci. */
import { useMemo } from "react";
import { cn, fmtNum } from "@/components/ui/cn";

export function MiniSeries({
  title,
  data,
  threshold,
  unit = "",
  pct = false,
  domain,
  below = true,
  selected,
  note,
}: {
  title: string;
  data: { date: string; v: number | null }[];
  threshold: number;
  unit?: string;
  pct?: boolean;
  domain: [number, number];
  /** true: eşiğin ALTI kuraklık tarafı */
  below?: boolean;
  selected?: string;
  note?: string;
}) {
  const W = 360;
  const H = 110;
  const pad = { l: 4, r: 4, t: 8, b: 8 };
  const [lo, hi] = domain;
  const X = (i: number) => pad.l + (i / Math.max(1, data.length - 1)) * (W - pad.l - pad.r);
  const Y = (v: number) => pad.t + (1 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const path = useMemo(() => {
    let d = "";
    let pen = false;
    data.forEach((p, i) => {
      if (p.v == null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`;
      pen = true;
    });
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, lo, hi]);
  const si = selected ? data.findIndex((p) => p.date === selected) : -1;
  const sv = si >= 0 ? data[si].v : null;
  const fmt = (v: number) => (pct ? `${v < 0 ? "−" : "+"}%${fmtNum(Math.abs(v) * 100, 1)}` : `${v < 0 ? "−" : ""}${fmtNum(Math.abs(v), unit === "mm" ? 1 : unit === "%" ? 1 : 2)}${unit && unit !== "%" ? ` ${unit}` : ""}`);
  const fmtVal = (v: number) => (unit === "%" && !pct ? `%${fmtNum(v, 1)}` : fmt(v));
  const hit = sv != null && (below ? sv <= threshold : sv >= threshold);
  const ty = Y(threshold);

  return (
    <figure className="min-w-0">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{title}</span>
        <span className={cn("font-mono text-sm font-bold", hit ? "text-red-fg" : "text-text")}>{sv == null ? "—" : fmtVal(sv)}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" role="img" aria-label={`${title}; eşik ${fmtVal(threshold)}`}>
        <rect x={pad.l} y={below ? ty : pad.t} width={W - pad.l - pad.r} height={below ? H - pad.b - ty : ty - pad.t} fill="var(--red)" opacity={0.08} />
        <line x1={pad.l} x2={W - pad.r} y1={ty} y2={ty} stroke="var(--red)" strokeDasharray="4 3" strokeWidth={1} />
        <path d={path} fill="none" stroke="var(--sky)" strokeWidth={1.8} strokeLinejoin="round" />
        {si >= 0 && <line x1={X(si)} x2={X(si)} y1={pad.t} y2={H - pad.b} stroke="var(--wheat-fg)" strokeWidth={1.2} />}
        {si >= 0 && sv != null && <circle cx={X(si)} cy={Y(sv)} r={3.5} fill={hit ? "var(--red)" : "var(--sky)"} stroke="var(--bg)" strokeWidth={1.5} />}
      </svg>
      {note && <p className="mt-0.5 text-xs text-dim">{note}</p>}
    </figure>
  );
}
