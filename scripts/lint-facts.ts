/**
 * YASAKLI RAKAM TARAMASI (AGRISHIELD_PROMPT.md 17.1 · npm run lint:facts)
 *   1) Kaynağı doğrulanamayan / eskimiş ifadeler kod tabanında, bilgi tabanında ve belgelerde geçmesin.
 *   2) Dürüstlük: "gerçek ödeme yapıldı" gibi ifadeler hiçbir yerde geçmesin.
 *   3) facts.ts bütünlüğü: her rakamın geçerli bir kaynağı var; hesap/varsayımın formülü yazılı.
 * Bilerek geçen bir satır (ör. bu kuralı anlatan belge) aynı satıra `lint-facts: izin` yazılarak işaretlenir.
 */
import fs from "node:fs";
import path from "node:path";
import { FACTS, type Fact } from "../src/content/facts";
import { SOURCES } from "../src/content/sources";

const ROOT = process.cwd();
const FORBIDDEN: { re: RegExp; why: string }[] = [
  { re: /%\s*340\s*artı/i, why: "kaynağı doğrulanamayan artış oranı" },
  { re: /%\s*28\s*sigortal/i, why: "yanlış sigortalılık oranı (doğrusu ~%15, facts: sigortaliAlanOrani)" },
  { re: /₺?\s*12[,.]8\s*milyar\s*prim/i, why: "eski prim rakamı (2024 bitkisel prim ₺15,02 milyar)" },
  { re: /\b3\s*milyon\s*çiftçi/i, why: "doğrulanamayan çiftçi sayısı (facts: ciftciSayisiCKS)" },
  { re: /15\s*[–-]\s*30\s*gün(lük)?\s*eksper/i, why: "kaynaksız eksper süresi" },
  { re: /polygon[^.\n]{0,20}7[.,]?000\s*TPS/i, why: "pazarlama TPS rakamı (ihtiyaç ~12 işlem/sn, facts: zincirIhtiyacTps)" },
  { re: /<\s*\$\s*50\s*sensör/i, why: "gerçek dışı sensör paketi fiyatı" },
  { re: /2026['’]?da\s*\$\s*29[,.]3\s*milyar/i, why: "yanlış yıl/pazar eşlemesi (facts: parametrikPazar2031)" },
  { re: /gerçek\s+ödeme\s+yapıldı/i, why: "dürüstlük kuralı: ödeme prototipte her zaman SİMÜLASYON" },
];

const INCLUDE_DIRS = ["src", "data", "firmware", "public", "scripts", "tests", "contracts"];
const INCLUDE_FILES = ["README.md", "DECISIONS.md"];
const EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".sol", ".ino", ".h", ".html", ".txt", ".css"]);
const SKIP = new Set([path.join("scripts", "lint-facts.ts"), path.join("data", "era5-siverek-daily.json")]);

function* walk(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (EXT.has(path.extname(e.name))) yield p;
  }
}

const files = [...INCLUDE_DIRS.flatMap((d) => [...walk(path.join(ROOT, d))]), ...INCLUDE_FILES.map((f) => path.join(ROOT, f)).filter((f) => fs.existsSync(f))];
const hits: string[] = [];
for (const f of files) {
  const rel = path.relative(ROOT, f);
  if (SKIP.has(rel)) continue;
  const lines = fs.readFileSync(f, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.includes("lint-facts: izin")) return;
    for (const { re, why } of FORBIDDEN) {
      if (re.test(line)) hits.push(`${rel}:${i + 1}  ${why}\n      ${line.trim().slice(0, 160)}`);
    }
  });
}

// facts.ts bütünlüğü
const problems: string[] = [];
const facts = Object.values(FACTS) as Fact[];
for (const f of facts) {
  const s = SOURCES[f.sourceId];
  if (!s) problems.push(`${f.id}: kaynak yok (${f.sourceId})`);
  else if (!/^https?:\/\//.test(s.url) && !s.url.startsWith("/")) problems.push(`${f.id}: kaynak adresi geçersiz (${s.url})`);
  if ((f.kind === "hesap" || f.kind === "varsayim") && !f.derivation) problems.push(`${f.id}: ${f.kind} ama formül/gerekçe (derivation) yazılmamış`);
  if (!f.asOf) problems.push(`${f.id}: tarih (asOf) yok`);
}
const pending = facts.filter((f) => f.value === null).map((f) => f.id);

console.log(`lint:facts — ${files.length} dosya tarandı, ${facts.length} rakam denetlendi.`);
if (pending.length) console.log(`  "veri bekleniyor" gösterilecek rakamlar: ${pending.join(", ")}`);
if (hits.length) {
  console.log(`\n✗ ${hits.length} yasaklı ifade:`);
  for (const h of hits) console.log(`  ${h}`);
}
if (problems.length) {
  console.log(`\n✗ facts.ts bütünlüğü:`);
  for (const p of problems) console.log(`  ${p}`);
}
if (hits.length || problems.length) process.exit(1);
console.log("✓ Temiz: yasaklı rakam yok, her rakamın kaynağı var.");
