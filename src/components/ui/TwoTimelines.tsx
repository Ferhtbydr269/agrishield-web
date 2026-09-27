"use client";
import { motion } from "motion/react";
import { cn } from "./cn";

/**
 * İki zaman çizelgesi yan yana: köy bazlı kuraklık sigortası (bugün) vs AgriShield.
 * "Kuraklık Nisan'da, para Eylül'de." Zaman çizelgesi örnektir.
 */
const MONTHS = ["Eki", "Kas", "Ara", "Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl"];
const pos = (monthIndex: number, frac = 0.5) => ((monthIndex + frac) / 12) * 100;

type Mark = { at: number; label: string; tone: "dim" | "green" | "wheat" | "red" | "violet" | "sky"; big?: boolean; side: "up" | "down" };

const TODAY: Mark[] = [
  { at: pos(0, 0.3), label: "Ekim + poliçe", tone: "dim", side: "up" },
  { at: pos(8, 0.3), label: "Hasat", tone: "dim", side: "down" },
  { at: pos(10, 0.4), label: "Köy verimi açıklanır", tone: "dim", side: "up" },
  { at: pos(11, 0.6), label: "Ödeme — ya da 0 TL (köy ort. iyiyse)", tone: "red", big: true, side: "down" },
];
const AGRI: Mark[] = [
  { at: pos(0, 0.3), label: "Ekim + poliçe (parsel haritadan)", tone: "dim", side: "up" },
  { at: pos(6, 0.08), label: "Erken uyarı SMS", tone: "violet", side: "up" },
  { at: pos(6, 0.9), label: "3/3 EVET → para IBAN'da", tone: "green", big: true, side: "down" },
];

const TONE = { dim: "bg-dim", green: "bg-green", wheat: "bg-wheat", red: "bg-red", violet: "bg-violet", sky: "bg-sky" } as const;
const TEXT = { dim: "text-dim", green: "text-green-fg", wheat: "text-wheat-fg", red: "text-red-fg", violet: "text-violet-fg", sky: "text-sky-fg" } as const;

function Row({ title, marks, stage, testid }: { title: string; marks: Mark[]; stage?: boolean; testid: string }) {
  return (
    <div data-testid={testid}>
      <div className={cn("font-semibold", stage ? "mb-1 text-xl" : "mb-3 text-base")}>{title}</div>
      <div className={cn("relative", stage ? "h-[6.5rem]" : "h-24")}>
        <div className="absolute inset-x-0 top-1/2 h-px bg-line-strong" />
        {/* kuraklık dönemi */}
        <div className="absolute top-[35%] h-[30%] rounded-md bg-red/20" style={{ left: `${pos(5, 0.2)}%`, width: `${pos(7, 0.9) - pos(5, 0.2)}%` }} aria-hidden />
        {marks.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.12 * i, duration: 0.3 }}
            className="absolute top-1/2"
            style={{ left: `${m.at}%` }}
          >
            <span className={cn("absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-bg", TONE[m.tone], m.big ? "size-4" : "size-2.5")} />
            <span
              className={cn(
                "absolute w-max max-w-[11rem] leading-tight",
                m.at > 85 ? "right-0 translate-x-2 text-right" : m.at < 12 ? "left-0 -translate-x-2 text-left" : "-translate-x-1/2 text-center",
                m.side === "up" ? "bottom-3" : "top-3",
                TEXT[m.tone],
                m.big ? "font-semibold" : "",
                stage ? "text-base" : "text-[0.72rem]",
              )}
            >
              {m.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function TwoTimelines({ stage = false }: { stage?: boolean }) {
  return (
    <div className={cn("panel p-5", stage && "px-8 py-5")}>
      <div className="relative mb-2 grid grid-cols-12 font-mono text-dim" aria-hidden>
        {MONTHS.map((m) => (
          <div key={m} className={cn("text-center", stage ? "text-base" : "text-[0.7rem]")}>
            {m}
          </div>
        ))}
      </div>
      <div className={cn("grid", stage ? "gap-2" : "gap-6")}>
        <Row title="Köy bazlı kuraklık sigortası (bugün)" marks={TODAY} stage={stage} testid="timeline-today" />
        <Row title="AgriShield (parsel bazlı, üç tanık)" marks={AGRI} stage={stage} testid="timeline-agrishield" />
      </div>
      <div className={cn("mt-3 flex flex-wrap items-center justify-between gap-2 text-dim", stage ? "text-base" : "text-xs")}>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-6 rounded-sm bg-red/25" /> kuraklık dönemi (Mar–May)
        </span>
        <span>Zaman çizelgesi örnektir. Köy bazlı üründe ödeme, köy veriminin açıklanmasına bağlıdır.</span>
      </div>
    </div>
  );
}
