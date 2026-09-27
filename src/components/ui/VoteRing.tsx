"use client";
import { motion } from "motion/react";
import type { Outcome, Verdict } from "@/engine/types";

/**
 * Oylama halkası: 3 dilim (uydu · istasyon · meteoroloji). Her tanık karar verdikçe dilim
 * yeşil/kırmızı/sarı dolar. İkinci yeşil dilim dolunca halka kapanır, merkezde sonuç belirir.
 */
const ORDER = ["satellite", "station", "meteo"] as const;
const LABEL = { satellite: "Uydu", station: "İstasyon", meteo: "Meteo" } as const;
const COLOR: Record<Verdict, string> = { EVET: "var(--green)", HAYIR: "var(--red)", VERI_YOK: "var(--wheat)" };

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1}`;
}

export function VoteRing({
  verdicts,
  outcome,
  size = 260,
  showLabels = true,
}: {
  verdicts: Record<(typeof ORDER)[number], Verdict | null>;
  /** karar verildiyse merkezde gösterilir; yoksa EVET sayısından türetilir */
  outcome?: Outcome | null;
  size?: number;
  showLabels?: boolean;
}) {
  const yes = ORDER.filter((k) => verdicts[k] === "EVET").length;
  const closed = yes >= 2;
  const center = outcome ?? (closed ? "ODE" : null);
  const cx = 100;
  const cy = 100;
  const r = 70;
  const gap = 0.07;
  const seg = (2 * Math.PI) / 3;
  const start = -Math.PI / 2;

  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`Oylama: ${yes}/3 EVET${center ? `, karar ${center}` : ""}`}>
      <svg viewBox="-14 -14 228 228" className="size-full" overflow="visible">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeWidth="16" />
        {ORDER.map((k, i) => {
          const a0 = start + i * seg + gap;
          const a1 = start + (i + 1) * seg - gap;
          const v = verdicts[k];
          return (
            <g key={k}>
              <path d={arc(cx, cy, r, a0, a1)} fill="none" stroke="var(--surface-2)" strokeWidth="16" strokeLinecap="round" />
              {v && (
                <motion.path
                  d={arc(cx, cy, r, a0, a1)}
                  fill="none"
                  stroke={COLOR[v]}
                  strokeWidth="16"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: i * 0.25, ease: [0.2, 0.8, 0.2, 1] }}
                />
              )}
            </g>
          );
        })}
        {closed && (
          <motion.circle
            cx={cx}
            cy={cy}
            r={r + 13}
            fill="none"
            stroke="var(--green)"
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.8 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          />
        )}
        {showLabels &&
          ORDER.map((k, i) => {
            const a = start + (i + 0.5) * seg;
            const lx = cx + (r + 29) * Math.cos(a);
            const ly = cy + (r + 29) * Math.sin(a);
            return (
              <text key={k} x={lx} y={ly + 3} textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)" fill="var(--text-dim)" fontWeight="600" letterSpacing="0.6">
                {LABEL[k].toUpperCase()}
              </text>
            );
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-dim">EVET</div>
        <div className="font-display text-5xl font-extrabold leading-none tabular text-text" style={{ fontSize: size * 0.2 }}>
          {yes}
          <span className="text-dim">/3</span>
        </div>
        {center && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.42, delay: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            className={
              center === "ODE"
                ? "mt-1 rounded-md bg-green px-2.5 py-0.5 font-display font-extrabold text-bg"
                : center === "GRI_BOLGE"
                  ? "mt-1 rounded-md bg-wheat px-2.5 py-0.5 font-display font-extrabold text-bg"
                  : "mt-1 rounded-md bg-surface-2 px-2.5 py-0.5 font-display font-extrabold text-dim"
            }
            style={{ fontSize: size * 0.075 }}
          >
            {center === "ODE" ? "ÖDE" : center === "GRI_BOLGE" ? "GRİ BÖLGE" : "ÖDEME YOK"}
          </motion.div>
        )}
      </div>
    </div>
  );
}
