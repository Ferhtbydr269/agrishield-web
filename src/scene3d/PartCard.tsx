"use client";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { PART_TEXT } from "./hotspots";
import { cn } from "@/components/ui/cn";

/** Sağdan açılan parça kartı: Nedir / Neye benzer / Bizde ne işe yarar / Jüri sorarsa */
export function PartCard({ id, onClose, stage = false }: { id: string | null; onClose: () => void; stage?: boolean }) {
  const t = id ? PART_TEXT[id] : null;
  return (
    <AnimatePresence>
      {t && (
        <motion.aside
          key={t.id}
          initial={{ x: 24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 24, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          className={cn("absolute right-3 top-3 z-20 max-h-[calc(100%-1.5rem)] w-[min(360px,calc(100%-1.5rem))] overflow-y-auto rounded-2xl border border-line bg-surface/95 p-5 shadow-2xl backdrop-blur", stage && "w-[460px] p-7")}
          role="dialog"
          aria-label={`Parça kartı: ${t.title}`}
          data-testid="part-card"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-mono text-xs text-wheat-fg">{t.id}</div>
              <h3 className={cn("mt-1 font-extrabold", stage ? "text-3xl" : "text-xl")}>{t.title}</h3>
            </div>
            <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full border border-line text-dim hover:text-text" aria-label="Kartı kapat">
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <dl className={cn("mt-4 grid gap-3", stage ? "text-lg" : "text-sm")}>
            {[
              ["Nedir", t.nedir],
              ["Neye benzer", t.benzetme],
              ["Bizde ne işe yarar", t.bizde],
              ["Jüri sorarsa", t.juri],
            ].map(([k, v]) => (
              <div key={k} className={k === "Jüri sorarsa" ? "rounded-lg border border-wheat/40 bg-wheat/10 p-3" : ""}>
                <dt className="eyebrow !text-[0.65rem]">{k}</dt>
                <dd className="mt-1 leading-snug">{v}</dd>
              </div>
            ))}
          </dl>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
