/**
 * Prisma istemcisini DB_PROVIDER'a göre üretir.
 *   sqlite  (varsayılan) → prisma/schema.prisma
 *   postgres             → prisma/schema.postgres.prisma (otomatik türetilir)
 * Postgres'te tabloları oluşturmak için: npx prisma db push --schema prisma/schema.postgres.prisma
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const provider = (process.env.DB_PROVIDER ?? "sqlite").toLowerCase();
const base = path.join(process.cwd(), "prisma", "schema.prisma");
let schemaPath = base;

if (provider === "postgres" || provider === "postgresql") {
  const src = fs.readFileSync(base, "utf8").replace('provider = "sqlite"', 'provider = "postgresql"');
  schemaPath = path.join(process.cwd(), "prisma", "schema.postgres.prisma");
  fs.writeFileSync(schemaPath, `// OTOMATİK ÜRETİLDİ (scripts/prisma-generate.ts) — düzenlemeyin\n${src}`);
  console.log("Postgres şeması üretildi:", schemaPath);
}

execSync(`npx prisma generate --schema "${schemaPath}"`, { stdio: "inherit" });
