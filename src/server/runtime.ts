/**
 * Uygulama açılışında ön kontrol (preflight): veritabanı, tohum verisi, cihaz, zincir, AI modları.
 * Eksik olan otomatik taklit moda düşer ve /durum sayfasında sarı görünür.
 */
import { audit } from "./audit";
import { config } from "./config";
import { db } from "./db";
import { ensureDeviceLoop } from "./device";
import { isSeeded, seedDatabase } from "./seed-core";
import { ensureSimEngine } from "./sim-engine";

export interface PreflightReport {
  at: number;
  db: { ok: boolean; seeded: boolean; autoSeeded: boolean; error?: string };
  modes: { offline: boolean; chain: string; ai: string; sms: string };
}

const g = globalThis as unknown as { __agrishieldBoot?: Promise<PreflightReport>; __agrishieldBootedAt?: number };

export function bootedAt(): number {
  return g.__agrishieldBootedAt ?? Date.now();
}

async function preflight(): Promise<PreflightReport> {
  g.__agrishieldBootedAt = Date.now();
  const report: PreflightReport = {
    at: Date.now(),
    db: { ok: false, seeded: false, autoSeeded: false },
    modes: { offline: config.offline, chain: config.chainMode, ai: config.aiMode, sms: config.smsMode },
  };
  try {
    await db.$queryRaw`SELECT 1`;
    report.db.ok = true;
    report.db.seeded = await isSeeded();
    if (!report.db.seeded) {
      console.log("[preflight] Veritabanı boş — tohum verisi otomatik yükleniyor…");
      await seedDatabase((m) => console.log(`[seed] ${m}`));
      report.db.seeded = true;
      report.db.autoSeeded = true;
    }
  } catch (e) {
    report.db.error = e instanceof Error ? e.message.split("\n")[0] : String(e);
    console.error("[preflight] Veritabanı hatası:", report.db.error);
  }
  ensureDeviceLoop();
  ensureSimEngine();
  if (report.db.ok) await audit("engine", "preflight", { ...report.modes, autoSeeded: report.db.autoSeeded });
  return report;
}

export function ensureRuntime(): Promise<PreflightReport> {
  if (!g.__agrishieldBoot) g.__agrishieldBoot = preflight();
  return g.__agrishieldBoot;
}
