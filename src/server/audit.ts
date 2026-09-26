import { db } from "./db";

export type AuditActor = "engine" | "operator" | "device" | "ai" | "sim" | "chain" | "payment";

/** Denetim kaydı. Kullanıcı girdisi kısaltılarak yazılır; hata olursa uygulamayı durdurmaz. */
export async function audit(actor: AuditActor, action: string, detail: string | Record<string, unknown>): Promise<void> {
  const text = typeof detail === "string" ? detail : JSON.stringify(detail);
  try {
    await db.auditLog.create({ data: { actor, action, detail: text.slice(0, 2000) } });
  } catch (e) {
    console.warn("[audit] yazılamadı:", e instanceof Error ? e.message : e);
  }
}
