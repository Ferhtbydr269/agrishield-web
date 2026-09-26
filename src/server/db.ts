import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { __agrishieldPrisma?: PrismaClient };

export const db: PrismaClient = g.__agrishieldPrisma ?? new PrismaClient({ log: ["warn", "error"] });

if (process.env.NODE_ENV !== "production") g.__agrishieldPrisma = db;

export async function dbHealthy(): Promise<{ ok: boolean; parcels: number; decisions: number; error?: string }> {
  try {
    const [parcels, decisions] = await Promise.all([db.parcel.count(), db.decision.count()]);
    return { ok: parcels > 0, parcels, decisions };
  } catch (e) {
    return { ok: false, parcels: 0, decisions: 0, error: e instanceof Error ? e.message : String(e) };
  }
}
