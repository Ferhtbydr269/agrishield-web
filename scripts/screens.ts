/**
 * YEDEK EKRAN GÖRÜNTÜLERİ + YEDEK VİDEO — `npm run screens` (AGRISHIELD_PROMPT.md 19: "her şey çökerse")
 * Sunum modunu 1920×1080'de baştan sona klavyeyle oynatır (sahnedeki gibi: P, 1…0, Space), her sahnenin ekran
 * görüntüsünü alır; ayrıca kanıt sayfası (telefon), parsel, durum, asistan ve sunucu ekranı.
 *   npm run screens                 → public/yedek/*.png + public/yedek/index.html (çevrimdışı açılır, USB'ye kopyalayın)
 *   npm run screens -- --video      → + public/yedek/yedek-demo.webm (~3 dk, Chrome/VLC oynatır)
 *   npm run screens -- --url http://localhost:3000
 * Aynı zamanda sahne düzeni denetimi: sayfa hatası, yatay taşma ve sahne süresi raporlanır (reports/screens.json).
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";

const argv = process.argv.slice(2);
const i = argv.indexOf("--url");
const BASE = (i >= 0 ? argv[i + 1] : "http://localhost:3000").replace(/\/$/, "");
const VIDEO = argv.includes("--video");
const OUT = path.join(process.cwd(), "public", "yedek");
const W = 1920;
const H = 1080;

interface Shot {
  file: string;
  title: string;
  errors: string[];
  overflowX: boolean;
}
const shots: Shot[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(p: string, body?: unknown) {
  const r = await fetch(BASE + p, body === undefined ? undefined : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return r.json().catch(() => ({}));
}

async function focusDecision(): Promise<{ status: string; outcome: string; notifiedAt: number | null } | null> {
  const s = (await api("/api/sim/state")) as { full: { focusParcelId: string; parcels: { id: string; decision: { status: string; outcome: string; notifiedAt: number | null } | null }[] } };
  return s.full.parcels.find((p) => p.id === s.full.focusParcelId)?.decision ?? null;
}

async function waitFor(fn: () => Promise<boolean>, ms: number) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await fn()) return true;
    await sleep(300);
  }
  return false;
}

async function snap(page: Page, file: string, title: string, errors: string[]) {
  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  await page.screenshot({ path: path.join(OUT, file) });
  shots.push({ file, title, errors: [...errors], overflowX });
  errors.length = 0;
  console.log(`  ✓ ${file} — ${title}${overflowX ? " (! yatay taşma)" : ""}`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const videoDir = path.join(OUT, ".video");
  const browser = await chromium.launch({
    channel: process.env.PW_CHANNEL || "chrome",
    headless: true,
    args: ["--ignore-gpu-blocklist", "--enable-gpu", "--use-angle=d3d11", "--autoplay-policy=no-user-gesture-required"],
  });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: "tr-TR", ...(VIDEO ? { recordVideo: { dir: videoDir, size: { width: W, height: H } } } : {}) });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));

  console.log(`Sunum provası ve yedek görüntüler → ${BASE}\n`);
  // başlangıç durumu: kuraklık, sahne 1, bayraklar temiz
  await api("/api/sim/play", { speed: 0 });
  await api("/api/sim/load", { scenario: "kuraklik-2025" });
  await api("/api/device", { reset: true });
  await api("/api/scene", { index: 0, present: false, blackout: false, resetTimer: true, origin: "screens" });

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await sleep(1500);
  await snap(page, "00-ana-sayfa.png", "Ana sayfa (sunum modu kapalı)", errors);
  await page.keyboard.press("p");
  await page.getByTestId("presentation").waitFor({ timeout: 10_000 });
  await sleep(1200);

  const scene = async (key: string, file: string, title: string, wait = 2500) => {
    await page.keyboard.press(key);
    await sleep(wait);
    await snap(page, file, title, errors);
  };

  await scene("1", "01-mehmet-amca.png", "Sahne 1 · Mehmet Amca");
  await scene("2", "02-bugun-nasil-odeniyor.png", "Sahne 2 · Bugün nasıl ödeniyor");
  await scene("3", "03-uc-tanik.png", "Sahne 3 · Üç tanık", 3500);
  await scene("4", "04-3d-saha.png", "Sahne 4 · 3D saha (preset 1)", 5000);
  await sleep(2500); // otomatik preset 2
  await snap(page, "04b-3d-istasyon.png", "Sahne 4 · 3D saha (preset 2, istasyon)", errors);

  // 5 · Jüri testi: simüle cihaz kuru toprağa
  await scene("5", "05-juri-testi.png", "Sahne 5 · Jüri testi (ıslak)", 4000);
  await api("/api/device", { pot: "kuru" });
  await sleep(3500);
  await snap(page, "05b-juri-testi-kuru.png", "Sahne 5 · Jüri testi (kuru toprak → istasyon tanığı)", errors);
  await api("/api/device", { pot: "islak" });

  // 6 · Zaman makinesi: Space ile oynat
  await scene("6", "06-zaman-makinesi.png", "Sahne 6 · Zaman makinesi (1 Mart)", 2500);
  await page.keyboard.press(" ");
  await sleep(9000);
  await snap(page, "06b-zaman-makinesi-nisan.png", "Sahne 6 · Zaman makinesi (Nisan, NDVI düşüyor)", errors);
  await waitFor(async () => (await focusDecision())?.outcome === "ODE", 40_000);
  await sleep(1500);

  // 7 · Karar (ödeme 8. sahneye kadar bekletilir)
  await scene("7", "07-karar.png", "Sahne 7 · Karar: 3/3 → ÖDE, zincir kaydı", 4000);
  // 8 · Ödeme
  await page.keyboard.press("8");
  await waitFor(async () => Boolean((await focusDecision())?.notifiedAt), 20_000);
  await sleep(2500);
  await snap(page, "08-odeme.png", "Sahne 8 · Ödeme talimatı (SİMÜLASYON) + SMS + kanıt QR", errors);

  // 9 · Manipülasyon: Space ile oynat → GRİ BÖLGE
  await scene("9", "09-manipulasyon.png", "Sahne 9 · Manipülasyon testi (başlangıç)", 3000);
  await page.keyboard.press(" ");
  await waitFor(async () => (await focusDecision())?.outcome === "GRI_BOLGE", 45_000);
  await sleep(4000);
  await snap(page, "09b-manipulasyon-gri.png", "Sahne 9 · Sulanan sensör → şüpheli → 1/3 → GRİ BÖLGE", errors);

  await scene("0", "10-ticari.png", "Sahne 10 · Ticari model", 3000);
  await page.keyboard.press("b");
  await sleep(800);
  await snap(page, "11-karartma.png", "B · Karartma", errors);
  await page.keyboard.press("b");
  await page.keyboard.press("Escape");
  await sleep(800);

  // diğer sayfalar
  const pages: [string, string, string, number?][] = [
    ["/parsel/P-1182?senaryo=kuraklik-2025", "20-parsel.png", "Parsel P-1182"],
    ["/durum", "21-durum.png", "Sistem durumu"],
    ["/kaynaklar#hesaplar", "22-kaynaklar.png", "Kaynaklar ve hesaplar"],
    ["/sunucu", "23-sunucu-ekrani.png", "Sunucu ekranı (2. ekran)"],
  ];
  for (const [p, file, title] of pages) {
    await page.goto(BASE + p, { waitUntil: "networkidle" });
    await sleep(1500);
    await snap(page, file, title, errors);
  }
  await page.goto(`${BASE}/asistan`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Neden blokzincir?" }).first().click();
  await page.getByTestId("assistant-sources").first().waitFor({ timeout: 10_000 });
  await sleep(800);
  await snap(page, "24-asistan.png", "Asistan: kaynaklı cevap", errors);

  // telefon: kanıt sayfası (QR hedefi)
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "tr-TR" });
  const pp = await phone.newPage();
  await pp.goto(`${BASE}/k/7F3A`, { waitUntil: "networkidle" });
  await sleep(1200);
  await pp.screenshot({ path: path.join(OUT, "30-kanit-telefon.png"), fullPage: true });
  shots.push({ file: "30-kanit-telefon.png", title: "Kanıt sayfası /k/7F3A (telefon, tam sayfa)", errors: [], overflowX: await pp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1) });
  console.log("  ✓ 30-kanit-telefon.png — Kanıt sayfası (telefon)");
  await phone.close();

  // başlangıç durumuna dön
  await api("/api/sim/play", { speed: 0 });
  await api("/api/sim/load", { scenario: "kuraklik-2025" });
  await api("/api/sim/settings", { holdPayment: false });
  await api("/api/scene", { index: 0, present: false, blackout: false, resetTimer: true, origin: "screens" });

  const video = page.video();
  await ctx.close();
  if (VIDEO && video) {
    const src = await video.path();
    fs.copyFileSync(src, path.join(OUT, "yedek-demo.webm"));
    fs.rmSync(videoDir, { recursive: true, force: true });
    console.log("  ✓ yedek-demo.webm");
  }
  await browser.close();

  // çevrimdışı galeri
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AgriShield · yedek görüntüler</title>
<style>body{margin:0;background:#0e1a14;color:#e8efe9;font:16px/1.5 system-ui,sans-serif;padding:24px}h1{font-size:28px;margin:0 0 4px}p{color:#9fb1a6;margin:0 0 24px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:20px}figure{margin:0;background:#15241c;border:1px solid #263a2f;border-radius:12px;overflow:hidden}
img{display:block;width:100%;height:auto}figcaption{padding:10px 14px;font-size:14px}video{width:100%;border-radius:12px;margin-bottom:24px}a{color:#e0a526}</style></head><body>
<h1>AgriShield · yedek görüntüler</h1><p>Sunum bilgisayarı çökerse: bu dosyayı tarayıcıda açın. Görseller ${new Date().toLocaleString("tr-TR")} tarihinde otomatik üretildi (npm run screens). Ödeme/SMS/zincir adımları SİMÜLASYON'dur.</p>
${fs.existsSync(path.join(OUT, "yedek-demo.webm")) ? '<video src="yedek-demo.webm" controls preload="metadata"></video>' : ""}
<div class="g">${shots.map((s) => `<figure><a href="${s.file}"><img src="${s.file}" alt="${s.title}" loading="lazy"></a><figcaption>${s.title}</figcaption></figure>`).join("")}</div></body></html>`;
  fs.writeFileSync(path.join(OUT, "index.html"), html);

  fs.mkdirSync(path.join(process.cwd(), "reports"), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), "reports", "screens.json"), JSON.stringify({ at: new Date().toISOString(), base: BASE, shots }, null, 2));
  const bad = shots.filter((s) => s.errors.length || s.overflowX);
  console.log(`\n${shots.length} görüntü → public/yedek/ (galeri: public/yedek/index.html)`);
  if (bad.length) {
    console.log(`! ${bad.length} görüntüde sayfa hatası ya da yatay taşma:`);
    for (const b of bad) console.log(`  ${b.file}: ${b.overflowX ? "yatay taşma; " : ""}${b.errors.join(" | ")}`);
    process.exit(1);
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
