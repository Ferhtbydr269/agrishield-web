"use client";
import { motion } from "motion/react";
import { Landmark, ArrowRight, Clock, Hash } from "lucide-react";
import type { PaymentView } from "@/store/sim";
import { SimBadge } from "./Badges";
import { cn, fmtNum, fmtTl, shortHash } from "./cn";

/**
 * "Ödeme talimatı" kartı — banka ekranı taklidi YOK (etik değil). Tutar, IBAN maskesi,
 * kanal FAST, referans, süre. Her zaman SİMÜLASYON rozetiyle.
 */
export function PaymentCard({ payment, amountTl, stage = false, className }: { payment: PaymentView | null; amountTl: number; stage?: boolean; className?: string }) {
  const phase = payment?.phase ?? "held";
  const sent = phase === "sent";
  return (
    <div className={cn("panel ticks p-5", stage && "p-8", className)} data-testid="payment-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Landmark className={cn("text-wheat-fg", stage ? "size-8" : "size-5")} aria-hidden />
          <div>
            <div className="eyebrow">Ödeme talimatı</div>
            <div className={cn("font-semibold", stage ? "text-2xl" : "text-base")}>TL · FAST · kayıtlı IBAN</div>
          </div>
        </div>
        <SimBadge />
      </div>
      <div className={cn("mt-5 font-display font-extrabold tabular", stage ? "text-[88px] leading-none" : "text-5xl")}>
        ₺{fmtTl(payment?.amountTl ?? amountTl)}
      </div>
      <div className={cn("mt-4 grid gap-2 font-mono", stage ? "text-lg" : "text-sm")}>
        <div className="flex items-center gap-2 text-dim">
          <ArrowRight className="size-4" aria-hidden /> Alıcı IBAN: <span className="text-text">{payment?.ibanMasked ?? "TR** **** **** 4417"}</span>
        </div>
        <div className="flex items-center gap-2 text-dim">
          <Hash className="size-4" aria-hidden /> Referans:{" "}
          <span className={sent ? "text-green-fg" : "text-dim"}>{payment?.paymentRefText ?? (phase === "pending" ? "gönderiliyor…" : "bekliyor")}</span>
        </div>
        {payment?.refHash && (
          <div className="truncate text-dim" title={payment.refHash}>
            zincirdeki parmak izi: <span className="text-chain-fg">{shortHash(payment.refHash, 8)}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-dim">
          <Clock className="size-4" aria-hidden /> Süre: <span className="text-text">{payment?.ms ? `${fmtNum(payment.ms / 1000, 1)} sn` : "—"}</span>
        </div>
      </div>
      <motion.div
        className={cn("mt-5 rounded-lg px-3 py-2 text-center font-semibold", sent ? "bg-green/15 text-green-fg" : phase === "pending" ? "bg-wheat/15 text-wheat-fg" : "bg-surface-2 text-dim", stage && "text-xl")}
        animate={{ opacity: 1 }}
      >
        {sent ? "Talimat başarılı (simülasyon)" : phase === "pending" ? "Banka API'sine talimat gönderiliyor…" : "Ödeme adımı bekliyor"}
      </motion.div>
      <p className={cn("mt-3 text-dim", stage ? "text-base" : "text-xs")}>Kripto yok: ödemede kripto varlık kullanımı Türkiye'de yasaktır (TCMB, 16.04.2021). Zincir yalnız banka referansının parmak izini tutar.</p>
    </div>
  );
}
