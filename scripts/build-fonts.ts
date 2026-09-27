/**
 * Web fontlarını @fontsource paketlerinden public/fonts/'a kopyalar ve public/fonts/fonts.css üretir.
 *   npm run fonts
 * Neden: fontlar render-blocking CSS'e gömülünce mobilde ilk boyamayı ~1 sn geciktiriyordu. Artık ilk boyamadan
 * sonra yükleniyorlar (layout.tsx); o ana kadar ölçüsü eşitlenmiş yedek fontlar (globals.css) görünür, kayma olmaz.
 * Yalnız Türkçe için gereken alt kümeler (latin + latin-ext; Inter'de "σ" gibi simgeler için greek) alınır.
 * Lisans: SIL Open Font License 1.1 — lisans metinleri public/fonts/ altına kopyalanır.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "fonts");
const FONTS: { pkg: string; weights: number[]; subsets: string[] }[] = [
  { pkg: "inter", weights: [400, 600], subsets: ["latin", "latin-ext", "greek"] },
  { pkg: "bricolage-grotesque", weights: [800], subsets: ["latin", "latin-ext"] },
  { pkg: "jetbrains-mono", weights: [400, 600], subsets: ["latin", "latin-ext", "greek"] },
];

fs.mkdirSync(OUT, { recursive: true });
let css = "/* Üretildi: npm run fonts (scripts/build-fonts.ts) — elle düzenlemeyin. Fontlar: SIL OFL 1.1 */\n";
let bytes = 0;
for (const f of FONTS) {
  const dir = path.join(ROOT, "node_modules", "@fontsource", f.pkg);
  for (const w of f.weights) {
    const src = fs.readFileSync(path.join(dir, `${w}.css`), "utf8");
    // her @font-face bloğu bir alt küme
    for (const block of src.split("@font-face").slice(1)) {
      const name = block.match(/\/files\/([\w-]+)-(\d+)-normal\.woff2/);
      const subset = name?.[1].slice(f.pkg.length + 1);
      if (!name || !subset || !f.subsets.includes(subset)) continue;
      const family = block.match(/font-family:\s*'([^']+)'/)?.[1];
      const range = block.match(/unicode-range:\s*([^;]+);/)?.[1];
      const file = `${name[1]}-${w}-normal.woff2`;
      fs.copyFileSync(path.join(dir, "files", file), path.join(OUT, file));
      bytes += fs.statSync(path.join(OUT, file)).size;
      css += `@font-face{font-family:'${family}';font-style:normal;font-display:swap;font-weight:${w};src:url(/fonts/${file}) format('woff2');unicode-range:${range};}\n`;
    }
  }
  const lic = path.join(dir, "LICENSE");
  if (fs.existsSync(lic)) fs.copyFileSync(lic, path.join(OUT, `LICENSE-${f.pkg}.txt`));
}
fs.writeFileSync(path.join(OUT, "fonts.css"), css);
console.log(`public/fonts: ${css.split("\n").length - 2} yüz, ${Math.round(bytes / 1024)} KB woff2 + fonts.css`);
