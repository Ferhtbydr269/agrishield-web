"use client";
/** GERÇEK VERİ: Siverek 2024–25 sezonu kümülatif yağış (ERA5) vs 1991–2020 günlük normalinin kümülatifi. */
import { TR_MONTHS_SHORT } from "@/lib/dates";

export interface SeasonPoint {
  d: string;
  p: number;
  c: number;
  n: number;
}

export function Era5Chart({ data, height = 220, stage = false }: { data: SeasonPoint[]; height?: number; stage?: boolean }) {
  const W = 760;
  const H = height;
  const pad = { l: 46, r: 70, t: 14, b: 28 };
  const max = Math.max(...data.map((p) => Math.max(p.c, p.n))) * 1.06;
  const X = (i: number) => pad.l + (i / (data.length - 1)) * (W - pad.l - pad.r);
  const Y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const line = (k: "c" | "n") => `M ${data.map((p, i) => `${X(i)},${Y(p[k])}`).join(" L ")}`;
  const area = `M ${data.map((p, i) => `${X(i)},${Y(p.n)}`).join(" L ")} L ${[...data].reverse().map((p, i) => `${X(data.length - 1 - i)},${Y(p.c)}`).join(" L ")} Z`;
  const months = data.map((p, i) => ({ i, d: p.d })).filter((x) => x.d.endsWith("-01"));
  const last = data[data.length - 1];
  const fs = stage ? 15 : 11;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Siverek 2024–25 sezonu kümülatif yağış ile uzun yıllar normali">
      {[100, 200, 300, 400, 500].filter((v) => v < max).map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={Y(v)} y2={Y(v)} stroke="var(--line)" strokeDasharray="2 4" />
          <text x={pad.l - 8} y={Y(v) + 4} textAnchor="end" fontSize={fs} fill="var(--text-dim)" fontFamily="var(--font-mono)">
            {v}
          </text>
        </g>
      ))}
      {months.map((m) => (
        <text key={m.d} x={X(m.i) + 3} y={H - 8} fontSize={fs} fill="var(--text-dim)" fontFamily="var(--font-mono)">
          {TR_MONTHS_SHORT[Number(m.d.slice(5, 7)) - 1]}
        </text>
      ))}
      <path d={area} fill="var(--red)" opacity="0.12" />
      <path d={line("n")} fill="none" stroke="var(--green)" strokeWidth="2" strokeDasharray="6 5" />
      <path d={line("c")} fill="none" stroke="var(--sky)" strokeWidth={stage ? 4 : 3} strokeLinejoin="round" />
      <text x={X(data.length - 1) + 6} y={Y(last.n) + 4} fontSize={fs} fill="var(--green-fg)" fontFamily="var(--font-mono)" fontWeight="700">
        normal
      </text>
      <text x={X(data.length - 1) + 6} y={Y(last.c) + 4} fontSize={fs} fill="var(--sky-fg)" fontFamily="var(--font-mono)" fontWeight="700">
        2024–25
      </text>
      <text x={pad.l} y={pad.t - 2} fontSize={fs - 1} fill="var(--text-dim)" fontFamily="var(--font-mono)">
        mm (kümülatif, 1 Kas'tan)
      </text>
    </svg>
  );
}
