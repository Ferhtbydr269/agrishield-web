"use client";
import { motion } from "motion/react";
import { Link2 } from "lucide-react";
import type { ChainBlockView } from "@/lib/live-types";
import { formatDateTimeTR } from "@/lib/dates";
import { cn, shortHash } from "./cn";

/** Zincir bloğu: önceki mühür → içerik → bu bloğun mührü. Yeni blok yerine "oturur". */
export function BlockCard({ block, highlight = false, compact = false }: { block: ChainBlockView; highlight?: boolean; compact?: boolean }) {
  return (
    <motion.div
      layout
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn("rounded-xl border bg-surface-2 font-mono", highlight ? "border-green shadow-[0_0_0_1px_var(--green)]" : "border-line", compact ? "p-2.5 text-[0.7rem]" : "p-3.5 text-xs")}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-chain-fg">BLOK #{block.number}</span>
        <span className="text-dim">{formatDateTimeTR(block.ts)}</span>
      </div>
      {!compact && (
        <div className="mt-2 flex items-center gap-1.5 text-dim">
          <Link2 className="size-3" aria-hidden />
          önceki mühür: <span className="text-text">{shortHash(block.prevHash, 4)}</span>
        </div>
      )}
      <div className={cn("my-2 rounded-md bg-surface px-2 py-1.5 font-sans leading-snug text-text", compact ? "text-[0.72rem]" : "text-[0.8rem]")}>{block.summary}</div>
      <div className="text-dim">
        mühür: <span className="text-green-fg">{shortHash(block.hash, 6)}</span>
      </div>
      {!compact && (
        <div className="mt-0.5 truncate text-dim" title={block.txHash}>
          işlem: <span className="text-text">{shortHash(block.txHash, 8)}</span>
        </div>
      )}
    </motion.div>
  );
}
