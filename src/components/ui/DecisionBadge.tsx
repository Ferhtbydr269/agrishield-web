"use client";
import { motion } from "motion/react";
import { BadgeCheck, CircleAlert, CircleSlash } from "lucide-react";
import type { Outcome } from "@/engine/types";
import { cn } from "./cn";

const O = {
  ODE: { label: "ÖDE", sub: "ödeme otomatik onaylandı", cls: "border-green bg-green/15 text-green-fg", Icon: BadgeCheck },
  GRI_BOLGE: { label: "GRİ BÖLGE", sub: "eksper incelemesine gönderildi", cls: "border-wheat bg-wheat/15 text-wheat-fg", Icon: CircleAlert },
  ODEME_YOK: { label: "ÖDEME YOK", sub: "itiraz hakkı korunur", cls: "border-line-strong bg-surface-2 text-dim", Icon: CircleSlash },
} as const;

export function DecisionBadge({ outcome, size = "md", withSub = true, className }: { outcome: Outcome; size?: "sm" | "md" | "lg" | "stage"; withSub?: boolean; className?: string }) {
  const o = O[outcome];
  const s = {
    sm: { box: "px-2.5 py-1 gap-1.5", t: "text-xs", i: "size-3.5", sub: "hidden" },
    md: { box: "px-4 py-2 gap-2", t: "text-base", i: "size-5", sub: "text-xs" },
    lg: { box: "px-5 py-3 gap-3", t: "text-2xl", i: "size-7", sub: "text-sm" },
    stage: { box: "px-8 py-5 gap-4", t: "text-6xl", i: "size-14", sub: "text-xl" },
  }[size];
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn("inline-flex items-center rounded-2xl border-2", o.cls, s.box, className)}
      data-testid={`decision-${outcome}`}
      role="status"
    >
      <o.Icon className={cn(s.i, "shrink-0")} aria-hidden />
      <div>
        <div className={cn("font-display font-extrabold leading-none tracking-tight", s.t)}>{o.label}</div>
        {withSub && <div className={cn("mt-1 font-sans leading-tight opacity-90", s.sub)}>{o.sub}</div>}
      </div>
    </motion.div>
  );
}
