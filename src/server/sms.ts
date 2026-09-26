/**
 * SMS — SMS_MODE=mock ise sadece ekranda (PhoneMock). provider modunda yalnız takımın kendi
 * numarasına (SMS_TEST_NUMBER) SMS_WEBHOOK_URL üzerinden gönderilir; hata olursa taklide düşer.
 */
import { COPY } from "@/content/copy";
import { config } from "./config";
import { formatTl } from "./payments";

export const PHONE_MASK = "+90 5** *** ** 17";

export type SmsKind = "odeme" | "gri" | "bilgi" | "erken";

export function smsTextFor(kind: SmsKind, parcelId: string, code: string, amountTl = 0, extra = ""): string {
  if (kind === "odeme") return COPY.sms(parcelId, formatTl(amountTl), code, config.smsHost);
  if (kind === "gri") return COPY.smsGrey(parcelId, code, config.smsHost);
  if (kind === "erken") return extra;
  return `AgriShield: Tarlanız (${parcelId}) için bu sezon kuraklık tetiği oluşmadı; itiraz hakkınız saklıdır. Kayıt: ${config.smsHost}/k/${code}`;
}

export async function sendSms(text: string): Promise<{ mode: "mock" | "provider"; to: string; ok: boolean; error?: string }> {
  if (config.smsMode === "provider" && config.smsWebhookUrl && config.smsTestNumber) {
    try {
      const r = await fetch(config.smsWebhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: config.smsTestNumber, text }),
        signal: AbortSignal.timeout(4000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return { mode: "provider", to: PHONE_MASK, ok: true };
    } catch (e) {
      return { mode: "mock", to: PHONE_MASK, ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  return { mode: "mock", to: PHONE_MASK, ok: true };
}
