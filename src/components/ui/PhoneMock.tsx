"use client";
import { AnimatePresence, motion } from "motion/react";
import { Signal, BatteryFull, MessageSquareText } from "lucide-react";
import type { SmsView } from "@/store/sim";
import { SimBadge } from "./Badges";
import { cn } from "./cn";

/** SMS ekranı (taklit). Gerçek bir operatör/banka arayüzü taklit edilmez; sade bir mesaj görünümü. */
export function PhoneMock({ messages, stage = false, className }: { messages: SmsView[]; stage?: boolean; className?: string }) {
  const w = stage ? 360 : 280;
  const shown = messages.slice(0, 3);
  return (
    <div className={cn("relative", className)} style={{ width: w }}>
      <div className="rounded-[2.2rem] border-[3px] border-line-strong bg-[#0b120e] p-2.5 shadow-2xl">
        <div className="overflow-hidden rounded-[1.7rem] bg-[#f4f1ea] text-[#16211b]" style={{ height: stage ? 560 : 440 }}>
          <div className="flex items-center justify-between bg-[#e9e4d8] px-5 py-2 font-mono text-[0.7rem]">
            <span>09:12</span>
            <span className="flex items-center gap-1">
              <Signal className="size-3" aria-hidden />
              <BatteryFull className="size-3.5" aria-hidden />
            </span>
          </div>
          <div className="flex items-center gap-2 border-b border-black/10 px-4 py-2.5">
            <span className="grid size-8 place-items-center rounded-full bg-[#2f9e6b] font-display text-sm font-extrabold text-white">A</span>
            <div>
              <div className="text-sm font-semibold">AgriShield</div>
              <div className="text-[0.68rem] text-black/55">SMS · +90 5** *** ** 17</div>
            </div>
          </div>
          <div className="flex flex-col gap-2.5 p-3.5">
            <AnimatePresence initial={false}>
              {shown.length === 0 && (
                <div className="mt-16 flex flex-col items-center gap-2 text-center text-sm text-black/45">
                  <MessageSquareText className="size-7" aria-hidden />
                  Henüz mesaj yok
                </div>
              )}
              {[...shown].reverse().map((m) => (
                <motion.div
                  key={m.at + m.code}
                  initial={{ y: 24, opacity: 0, scale: 0.96 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
                  className={cn(
                    "max-w-[92%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 leading-snug shadow-sm",
                    m.kind === "erken" ? "bg-[#ece8fb]" : m.kind === "odeme" ? "bg-[#dff2e7]" : m.kind === "gri" ? "bg-[#f8ecd0]" : "bg-white",
                    stage ? "text-[1.02rem]" : "text-[0.84rem]",
                  )}
                  data-testid="sms-bubble"
                >
                  {m.text}
                  <div className="mt-1 text-right font-mono text-[0.6rem] text-black/45">{new Date(m.at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <div className="mt-2 flex justify-center">
        <SimBadge label="SMS SİMÜLASYONU" title="SMS_MODE=mock: mesaj yalnızca bu ekranda görünür" />
      </div>
    </div>
  );
}
