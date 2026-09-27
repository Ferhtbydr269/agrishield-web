/**
 * ÖDEME (TAKLİT) — AGRISHIELD_PROMPT.md Bölüm 10.
 * Gerçek banka arayüzü taklidi YOK (etik değil). Sade bir "ödeme talimatı" üretilir:
 * FAST-SIM-xxxx referansı, 1,2 sn gecikmeyle "başarılı"; referansın hash'i zincire yazılır.
 * "Gerçek ödeme yapıldı" ifadesi hiçbir yerde kullanılmaz. (lint-facts: izin)
 */
import { sha256Hex, sha256Hex0x } from "@/lib/sha256";

export const IBAN_MASK = "TR** **** **** 4417";

export interface PayoutResult {
  paymentRefText: string;
  refHash: string;
  amountTl: number;
  channel: "FAST";
  simulated: true;
  ms: number;
}

export async function simulatePayout(code: string, amountTl: number, delayMs = 1200): Promise<PayoutResult> {
  const t0 = Date.now();
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  const digits = parseInt(sha256Hex(`fast|${code}|${amountTl}`).slice(0, 8), 16) % 10000;
  const paymentRefText = `FAST-SIM-${String(digits).padStart(4, "0")}`;
  return { paymentRefText, refHash: sha256Hex0x(`${paymentRefText}|${code}`), amountTl, channel: "FAST", simulated: true, ms: Date.now() - t0 };
}

export function formatTl(n: number): string {
  return new Intl.NumberFormat("tr-TR").format(n);
}
