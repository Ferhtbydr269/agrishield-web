/**
 * İlk kurulum — `npm run setup` (Windows PowerShell, macOS, Linux aynı komut)
 *   1) .env yoksa .env.example'dan oluşturur (gizli anahtarlar .env.local'a yazılır, bu betik dokunmaz)
 *   2) Prisma istemcisi (DB_PROVIDER'a göre)  3) veritabanı tabloları  4) tohum verisi (parseller, poliçeler, 7F3A…)
 *   5) QR kodları (public/qr)
 * İnternet gerekmez. Tekrar çalıştırmak güvenlidir.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

const run = (cmd: string) => {
  console.log(`\n› ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
};

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 12)) {
  console.error(`Node ${process.versions.node} eski: en az 20.12 gerekli (öneri: 22 LTS).`);
  process.exit(1);
}

if (!fs.existsSync(".env")) {
  fs.copyFileSync(".env.example", ".env");
  console.log(".env oluşturuldu (.env.example'dan). Gizli anahtarları yalnız .env.local'a yazın.");
} else {
  console.log(".env mevcut — dokunulmadı.");
}

run("npm run db:generate");
if ((process.env.DB_PROVIDER ?? "sqlite").startsWith("postgres")) run("npx prisma db push --schema prisma/schema.postgres.prisma");
else run("npx prisma migrate deploy");
run("npm run seed");
run("npm run qr");
console.log("\n✓ Kurulum tamam. Geliştirme: npm run dev · Sahne: npm run build && npm run stage · Prova: npm run dry-run");
