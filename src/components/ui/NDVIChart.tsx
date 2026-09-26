"use client";
/**
 * NDVI grafiği (kendi SVG'miz): geçmiş yılların normal aralığı (p10–p90 bandı) + normal ortanca +
 * bu yıl çizgisi + döneme göre efektif eşik çizgisi + bulutlu geçişler + zaman imleci.
 */
import { useMemo } from "react";
import { effectiveNdviThreshold, getWindow } from "@/engine/phenology";
import type { Crop, NormalPoint, SatelliteObs } from "@/engine/types";
import { diffDays, TR_MONTHS_SHORT } from "@/lib/dates";
import { fmtNum } from "./cn";

interface Props {
  obs: SatelliteObs[];
  normals: NormalPoint[];
  crop: Crop;
  seasonStart: string;
  seasonEnd: string;
  cursor?: string | null;
  from?: string;
  to?: string;
  height?: number;
  stage?: boolean;
  decisionDate?: string | null;
}

export function NDVIChart({ obs, normals, crop, seasonStart, seasonEnd, cursor, from, to, height = 260, stage = false, decisionDate }: Props) {
  const W = 800;
  const H = height;
  const pad = { l: stage ? 56 : 44, r: 16, t: 16, b: stage ? 40 : 30 };
  const x0 = from ?? seasonStart;
  const x1 = to ?? seasonEnd;
  const span = Math.max(1, diffDays(x1, x0));
  const yMin = 0;
  const yMax = 0.9;
  const X = (d: string) => pad.l + (diffDays(d, x0) / span) * (W - pad.l - pad.r);
  const Y = (v: number) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * (H - pad.t - pad.b);
  const inRange = (d: string) => d >= x0 && d <= x1;

  const { band, median, threshold, series, cloudy, months } = useMemo(() => {
    const ns = normals.filter((n) => inRange(n.date));
    const band =
      ns.length > 1
        ? `M ${ns.map((n) => `${X(n.date)},${Y(n.p90)}`).join(" L ")} L ${[...ns].reverse().map((n) => `${X(n.date)},${Y(n.p10)}`).join(" L ")} Z`
        : "";
    const median = ns.length > 1 ? `M ${ns.map((n) => `${X(n.date)},${Y(n.p50)}`).join(" L ")}` : "";
    // eşik: normal ortanca × (1 + efektif eşik); tetik kapalı dönemlerde çizilmez
    const segs: string[] = [];
    let cur: string[] = [];
    for (const n of ns) {
      const w = getWindow(crop, n.date);
      const eff = effectiveNdviThreshold(-0.25, w.weight);
      if (w.triggerEnabled && Number.isFinite(eff) && n.p50 * (1 + eff) > 0) cur.push(`${X(n.date)},${Y(n.p50 * (1 + eff))}`);
      else if (cur.length) {
        segs.push(`M ${cur.join(" L ")}`);
        cur = [];
      }
    }
    if (cur.length) segs.push(`M ${cur.join(" L ")}`);
    const clear = obs.filter((o) => o.ndvi != null && inRange(o.date) && (!cursor || o.date <= cursor));
    const series = clear.length > 1 ? `M ${clear.map((o) => `${X(o.date)},${Y(o.ndvi!)}`).join(" L ")}` : "";
    const cloudy = obs.filter((o) => o.ndvi == null && inRange(o.date) && (!cursor || o.date <= cursor));
    const months: { x: number; label: string }[] = [];
    const [y0, m0] = x0.split("-").map(Number);
    for (let i = 0; i < 14; i++) {
      const m = ((m0 - 1 + i) % 12) + 1;
      const y = y0 + Math.floor((m0 - 1 + i) / 12);
      const d = `${y}-${String(m).padStart(2, "0")}-01`;
      if (d < x0 || d > x1) continue;
      months.push({ x: X(d), label: TR_MONTHS_SHORT[m - 1] });
    }
    return { band, median, threshold: segs, series, cloudy, months };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obs, normals, crop, x0, x1, cursor, H]);

  const clearObs = obs.filter((o) => o.ndvi != null && inRange(o.date) && (!cursor || o.date <= cursor));
  const last = clearObs[clearObs.length - 1];
  const fs = stage ? 15 : 11;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="NDVI grafiği: normal aralık, bu yıl ve eşik">
      <defs>
        <pattern id="ndvi-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--red)" strokeWidth="1" opacity="0.35" />
        </pattern>
      </defs>
      {[0.2, 0.4, 0.6, 0.8].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={Y(v)} y2={Y(v)} stroke="var(--line)" strokeDasharray="2 4" />
          <text x={pad.l - 8} y={Y(v) + 4} textAnchor="end" fontSize={fs} fill="var(--text-dim)" fontFamily="var(--font-mono)">
            {fmtNum(v, 1)}
          </text>
        </g>
      ))}
      {months.map((m) => (
        <g key={m.x}>
          <line x1={m.x} x2={m.x} y1={H - pad.b} y2={H - pad.b + 5} stroke="var(--line-strong)" />
          <text x={m.x + 4} y={H - pad.b + (stage ? 24 : 18)} fontSize={fs} fill="var(--text-dim)" fontFamily="var(--font-mono)">
            {m.label}
          </text>
        </g>
      ))}
      <path d={band} fill="var(--green)" opacity="0.14" />
      <path d={median} fill="none" stroke="var(--green)" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.8" />
      {threshold.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="var(--red)" strokeWidth="1.5" strokeDasharray="1 4" strokeLinecap="round" />
      ))}
      <path d={series} fill="none" stroke="var(--wheat)" strokeWidth={stage ? 4 : 2.6} strokeLinejoin="round" strokeLinecap="round" />
      {clearObs.map((o) => (
        <circle key={o.date} cx={X(o.date)} cy={Y(o.ndvi!)} r={stage ? 3.5 : 2.4} fill="var(--wheat)" />
      ))}
      {cloudy.map((o) => (
        <g key={o.date}>
          <circle cx={X(o.date)} cy={Y(0.08)} r={stage ? 5 : 4} fill="none" stroke="var(--text-dim)" strokeWidth="1.2" />
          <title>{`${o.date}: bulutlu geçiş (bulut %${Math.round(o.cloud * 100)}) — veri yok`}</title>
        </g>
      ))}
      {decisionDate && inRange(decisionDate) && (!cursor || decisionDate <= cursor) && (
        <g>
          <line x1={X(decisionDate)} x2={X(decisionDate)} y1={pad.t} y2={H - pad.b} stroke="var(--green)" strokeWidth="1.5" />
          <text x={X(decisionDate) - 6} y={pad.t + fs + 2} fontSize={fs} textAnchor="end" fill="var(--green-fg)" fontFamily="var(--font-mono)" fontWeight="700">
            karar
          </text>
        </g>
      )}
      {cursor && inRange(cursor) && (
        <g>
          <line x1={X(cursor)} x2={X(cursor)} y1={pad.t} y2={H - pad.b} stroke="var(--text)" strokeWidth="1" opacity="0.5" />
          {last && (
            <g>
              <circle cx={X(last.date)} cy={Y(last.ndvi!)} r={stage ? 7 : 5} fill="var(--wheat)" stroke="var(--bg)" strokeWidth="2" />
            </g>
          )}
        </g>
      )}
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--line-strong)" />
    </svg>
  );
}

export function NDVILegend({ stage = false }: { stage?: boolean }) {
  const t = stage ? "text-base" : "text-xs";
  return (
    <div className={`flex flex-wrap gap-x-5 gap-y-1.5 ${t} text-dim`}>
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-3 w-6 rounded-sm bg-green/20" /> Geçmiş yılların normal aralığı
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="inline-block w-6 border-t-2 border-dashed border-green" /> Normal (ortanca)
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="inline-block w-6 border-t-[3px] border-wheat" /> Bu yıl, bu parsel
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="inline-block w-6 border-t-2 border-dotted border-red" /> Tetik eşiği (döneme göre)
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="inline-block size-3 rounded-full border border-dim" /> Bulutlu geçiş
      </span>
    </div>
  );
}
