"use client";
import { motion } from "motion/react";
import { Satellite, RadioTower, CloudSun, Check, X, CircleHelp, Loader2 } from "lucide-react";
import type { Verdict, WitnessKey } from "@/engine/types";
import { cn } from "./cn";

export const WITNESS_META: Record<WitnessKey, { label: string; sub: string; Icon: typeof Satellite; accent: string }> = {
  satellite: { label: "Uydu", sub: "Sentinel-2 · parsel", Icon: Satellite, accent: "text-sky-fg" },
  station: { label: "Yer istasyonu", sub: "Köy istasyonu · kök bölgesi", Icon: RadioTower, accent: "text-soil-fg" },
  meteo: { label: "Meteoroloji", sub: "ERA5 / MGM · bölge", Icon: CloudSun, accent: "text-sky-fg" },
};

const V = {
  EVET: { cls: "border-green/60 bg-green/15 text-green-fg", Icon: Check, text: "EVET" },
  HAYIR: { cls: "border-red/50 bg-red/10 text-red-fg", Icon: X, text: "HAYIR" },
  VERI_YOK: { cls: "border-wheat/55 bg-wheat/12 text-wheat-fg", Icon: CircleHelp, text: "VERİ YOK" },
  BEKLE: { cls: "border-line bg-surface-2 text-dim", Icon: Loader2, text: "BEKLENİYOR" },
} as const;

/**
 * Tanık çipi: gri → yeşil (EVET) / kırmızı (HAYIR) / sarı (VERİ YOK).
 * Bilgi yalnızca renge dayanmaz: ikon + metin de var. Değişimde çip "yanar".
 */
export function WitnessChip({
  kind,
  verdict,
  detail,
  size = "md",
  live = false,
  className,
}: {
  kind: WitnessKey;
  verdict: Verdict | null;
  detail?: string;
  size?: "sm" | "md" | "lg" | "stage";
  live?: boolean;
  className?: string;
}) {
  const meta = WITNESS_META[kind];
  const v = verdict ? V[verdict] : V.BEKLE;
  const sizes = {
    sm: { box: "gap-2 px-2.5 py-1.5", icon: "size-4", label: "text-xs", verdict: "text-xs" },
    md: { box: "gap-3 px-3.5 py-2.5", icon: "size-5", label: "text-sm", verdict: "text-sm" },
    lg: { box: "gap-3.5 px-4 py-3.5", icon: "size-7", label: "text-base", verdict: "text-lg" },
    stage: { box: "gap-4 px-6 py-5", icon: "size-10", label: "text-2xl", verdict: "text-3xl" },
  }[size];
  return (
    <motion.div
      key={verdict ?? "bekle"}
      initial={{ scale: 0.96, opacity: 0.6 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn("relative flex items-center rounded-xl border", v.cls, sizes.box, className)}
      role="status"
      aria-label={`${meta.label} tanığı: ${v.text}`}
    >
      {verdict === "EVET" && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-xl ring-2 ring-green"
          initial={{ opacity: 0.9 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.9 }}
        />
      )}
      <meta.Icon className={cn(sizes.icon, "shrink-0", meta.accent)} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className={cn("font-semibold leading-tight text-text", sizes.label)}>
          {meta.label}
          {live && <span className="ml-2 rounded bg-green/20 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-green-fg">canlı</span>}
        </div>
        {detail && <div className="truncate text-[0.78em] leading-snug text-dim">{detail}</div>}
      </div>
      <div className={cn("flex items-center gap-1 font-mono font-bold tracking-wide", sizes.verdict)}>
        <v.Icon className={cn("size-[1.1em]", !verdict && "animate-spin")} aria-hidden />
        {v.text}
      </div>
    </motion.div>
  );
}
