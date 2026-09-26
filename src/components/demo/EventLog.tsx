"use client";
import { AnimatePresence, motion } from "motion/react";
import { useLive } from "@/store/sim";
import { cn } from "@/components/ui/cn";

const DOT = { green: "bg-green", wheat: "bg-wheat", red: "bg-red", sky: "bg-sky", violet: "bg-violet", soil: "bg-soil", chain: "bg-chain", dim: "bg-dim" } as const;

/** Canlı olay akışı (aria-live: karar değişince ekran okuyucu duyurur) */
export function EventLog({ limit = 9, stage = false }: { limit?: number; stage?: boolean }) {
  const log = useLive((s) => s.log);
  return (
    <div className={cn("panel p-4", stage && "p-6")}>
      <div className="eyebrow mb-3">Olay akışı</div>
      <ul className="grid gap-1.5" aria-live="polite" aria-relevant="additions">
        <AnimatePresence initial={false}>
          {log.slice(0, limit).map((l) => (
            <motion.li key={l.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className={cn("flex items-start gap-2.5", stage ? "text-base" : "text-[0.8rem]")}>
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", DOT[l.tone])} aria-hidden />
              <span className="font-mono text-[0.68rem] text-dim">{new Date(l.at).toLocaleTimeString("tr-TR")}</span>
              <span className="leading-snug">{l.text}</span>
            </motion.li>
          ))}
        </AnimatePresence>
        {log.length === 0 && <li className="text-sm text-dim">Zaman makinesini oynatın; tanık değişimleri, karar, zincir ve ödeme adımları burada akar.</li>}
      </ul>
    </div>
  );
}
