"use client";
import { motion } from "motion/react";
import { fmtNum } from "./cn";

/** Toprak nemi göstergesi: 0–%50, solma noktasının altı (kritik bölge) taralı. */
export function SoilGauge({
  value,
  threshold,
  label = "Kök bölgesi nemi",
  soilLabel,
  size = "md",
}: {
  value: number | null;
  threshold: number;
  label?: string;
  soilLabel?: string;
  size?: "sm" | "md" | "stage";
}) {
  const max = 50;
  const pct = value == null ? 0 : Math.max(0, Math.min(1, value / max));
  const thr = threshold / max;
  const below = value != null && value < threshold;
  const h = size === "stage" ? "h-10" : size === "sm" ? "h-3" : "h-5";
  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className={size === "stage" ? "text-xl text-dim" : "text-sm text-dim"}>{label}</span>
        <span className={`font-mono font-bold tabular ${size === "stage" ? "text-5xl" : "text-xl"} ${below ? "text-red-fg" : "text-text"}`}>
          {value == null ? "—" : `%${fmtNum(value, 1)}`}
        </span>
      </div>
      <div className={`relative ${h} overflow-hidden rounded-md border border-line bg-surface-2`}>
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${thr * 100}%`,
            backgroundImage: "repeating-linear-gradient(45deg, color-mix(in oklab, var(--red) 28%, transparent) 0 4px, transparent 4px 9px)",
          }}
          aria-hidden
        />
        <motion.div
          className="absolute inset-y-0 left-0 rounded-r-sm"
          style={{ background: below ? "var(--red)" : "var(--soil)" }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
        />
        <div className="absolute inset-y-[-2px] w-0.5 bg-text" style={{ left: `${thr * 100}%` }} aria-hidden />
      </div>
      <div className={`mt-1 flex justify-between font-mono ${size === "stage" ? "text-base" : "text-[0.68rem]"} text-dim`}>
        <span>%0</span>
        <span style={{ marginLeft: `${thr * 100 - 12}%` }}>
          solma noktası %{threshold}
          {soilLabel ? ` (${soilLabel})` : ""}
        </span>
        <span>%50</span>
      </div>
    </div>
  );
}
