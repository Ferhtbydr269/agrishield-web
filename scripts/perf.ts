/**
 * PERFORMANS — `npm run perf` (AGRISHIELD_PROMPT.md 17.1)
 *   1) Lighthouse (mobil): performans ≥ 90, erişilebilirlik ≥ 95 — 3D sahnesi hariç sayfalar
 *      (ana sayfa ?fallback2d=1 ile ölçülür; 3D ayrı ölçülür).
 *   2) 3D saha simülatörü: gerçek Chrome + GPU'da 20 sn otomatik tur, fps günlüğünün ortalaması ≥ 55.
 * Üretim derlemesine karşı çalıştırın (dev modu yavaştır):  npm run build && npm run stage  →  npm run perf
 *   npm run perf -- --url http://localhost:3000 --sadece-3d | --sadece-lh
 * Rapor: reports/perf.md + reports/perf.json
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "@playwright/test";

const argv = process.argv.slice(2);
const i = argv.indexOf("--url");
const BASE = (i >= 0 ? argv[i + 1] : "http://localhost:3000").replace(/\/$/, "");
const ONLY_3D = argv.includes("--sadece-3d");
const ONLY_LH = argv.includes("--sadece-lh");
// Yöntem: devtools = gerçek ağ/CPU kısıtlaması (varsayılan). simulate = Lantern tahmini; localhost'ta JS ilk boyamadan önce
// geldiği için FCP'yi tüm JS indirmesine bağlar ve gerçekçi olmayan düşük değer verir (DECISIONS.md).
const METHOD = argv.includes("--simulate") ? "simulate" : "devtools";

const PAGES = ["/?fallback2d=1", "/k/7F3A", "/parsel/P-1182", "/asistan", "/durum", "/kaynaklar"];
const TARGET = { performance: 90, accessibility: 95, fps: 55 };

interface LhRow {
  page: string;
  performance: number;
  accessibility: number;
  lcp: string;
  tbt: string;
  cls: string;
}

/**
 * Lighthouse ayrı bir Node sürecinde (CLI) çalışır: tsx/esbuild'in eklediği yardımcılar (__name) Lighthouse'un
 * tarayıcıya gönderdiği fonksiyonları bozuyor.
 */
function lighthouseCli(url: string): LhResult {
  const cli = path.join(process.cwd(), "node_modules", "lighthouse", "cli", "index.js");
  const r = spawnSync(
    process.execPath,
    [cli, url, "--output=json", "--output-path=stdout", "--quiet", "--only-categories=performance,accessibility", "--form-factor=mobile", `--throttling-method=${METHOD}`, "--chrome-flags=--headless=new --no-first-run"],
    { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
  );
  if (r.status !== 0) throw new Error(`Lighthouse başarısız (${url}): ${(r.stderr || "").slice(-300)}`);
  return JSON.parse(r.stdout) as LhResult;
}

interface LhResult {
  categories: Record<string, { score: number | null; auditRefs: { id: string; weight: number }[] }>;
  audits: Record<string, { title: string; score: number | null; displayValue?: string }>;
}

async function runLighthouse(): Promise<LhRow[]> {
  const rows: LhRow[] = [];
  for (const p of PAGES) {
    // ilk istek ısınma içindir; ölçüm ikinci istekte
    await fetch(BASE + p).catch(() => undefined);
    const lhr = lighthouseCli(BASE + p);
    const a = (id: string) => lhr.audits[id]?.displayValue ?? "—";
    const row = {
      page: p,
      performance: Math.round((lhr.categories.performance?.score ?? 0) * 100),
      accessibility: Math.round((lhr.categories.accessibility?.score ?? 0) * 100),
      lcp: a("largest-contentful-paint"),
      tbt: a("total-blocking-time"),
      cls: a("cumulative-layout-shift"),
    };
    rows.push(row);
    const ok = row.performance >= TARGET.performance && row.accessibility >= TARGET.accessibility;
    console.log(`  ${ok ? "✓" : "✗"} ${p.padEnd(18)} performans ${row.performance} · erişilebilirlik ${row.accessibility} · LCP ${row.lcp} · TBT ${row.tbt} · CLS ${row.cls}`);
    // hedefin altında kalan denetimleri göster (düzeltmek için)
    for (const cat of ["accessibility", "performance"] as const) {
      if ((cat === "accessibility" ? row.accessibility : row.performance) >= TARGET[cat]) continue;
      for (const ref of lhr.categories[cat].auditRefs) {
        const au = lhr.audits[ref.id];
        if (au && au.score !== null && au.score < 0.9 && ref.weight > 0) console.log(`      - [${cat === "accessibility" ? "erişilebilirlik" : "performans"}] ${au.title}${au.displayValue ? ` (${au.displayValue})` : ""}`);
      }
    }
  }
  return rows;
}

async function run3d(): Promise<{ avg: number; min: number; samples: number; tris: number; calls: number }> {
  const browser = await chromium.launch({
    channel: process.env.PW_CHANNEL || "chrome",
    // varsayılan: görünür pencere (gerçek GPU, gerçek kare hızı). --gizli: başsız + GPU bayrakları
    headless: argv.includes("--gizli"),
    args: ["--ignore-gpu-blocklist", "--enable-gpu", "--use-angle=d3d11", "--enable-gpu-rasterization", "--window-size=1920,1080"],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(`${BASE}/?perf=off#saha`, { waitUntil: "networkidle" });
    await page.locator("#saha").scrollIntoViewIfNeeded();
    await page.locator('[data-testid="field-3d"]').first().focus();
    await page.waitForFunction(() => ((window as unknown as { __agrishieldFps?: unknown[] }).__agrishieldFps?.length ?? 0) > 2, null, { timeout: 30_000 });
    // ısınma 5 sn, ölçüm 20 sn (kamera presetleri 1–6 arasında gezilir)
    await page.waitForTimeout(5000);
    const t0 = Date.now();
    for (const k of ["1", "2", "3", "4", "5", "6"]) {
      await page.keyboard.press(k);
      await page.waitForTimeout(3300);
    }
    const log = (await page.evaluate(() => (window as unknown as { __agrishieldFps?: { t: number; fps: number; tris: number; calls: number }[] }).__agrishieldFps ?? [])).filter((x) => x.t >= t0);
    if (!log.length) throw new Error("fps günlüğü boş (3D sahnesi açılmadı mı?)");
    const avg = log.reduce((s, x) => s + x.fps, 0) / log.length;
    return {
      avg: Math.round(avg * 10) / 10,
      min: Math.min(...log.map((x) => x.fps)),
      samples: log.length,
      tris: Math.max(...log.map((x) => x.tris)),
      calls: Math.max(...log.map((x) => x.calls)),
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log(`AgriShield performans ölçümü → ${BASE}\n`);
  const report: { lighthouse?: LhRow[]; fps?: Awaited<ReturnType<typeof run3d>>; at: string } = { at: new Date().toISOString() };
  let fail = false;
  if (!ONLY_3D) {
    console.log(`1 · Lighthouse (mobil, kısıtlama: ${METHOD})`);
    report.lighthouse = await runLighthouse();
    fail ||= report.lighthouse.some((r) => r.performance < TARGET.performance || r.accessibility < TARGET.accessibility);
  }
  if (!ONLY_LH) {
    console.log("\n2 · 3D saha simülatörü (1920×1080, GPU)");
    report.fps = await run3d();
    const f = report.fps;
    const ok = f.avg >= TARGET.fps;
    fail ||= !ok;
    console.log(`  ${ok ? "✓" : "✗"} ortalama ${f.avg} fps · en düşük ${f.min} · ${f.samples} örnek · ≤${Math.round(f.tris / 1000)}k üçgen · ≤${f.calls} çizim çağrısı`);
  }
  const dir = path.join(process.cwd(), "reports");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "perf.json"), JSON.stringify(report, null, 2));
  const md = [
    `# Performans — ${report.at}`,
    "",
    `Lighthouse mobil, kısıtlama yöntemi: ${METHOD}.`,
    "",
    report.lighthouse ? ["| Sayfa | Performans | Erişilebilirlik | LCP | TBT | CLS |", "|---|---|---|---|---|---|", ...report.lighthouse.map((r) => `| ${r.page} | ${r.performance} | ${r.accessibility} | ${r.lcp} | ${r.tbt} | ${r.cls} |`)].join("\n") : "",
    "",
    report.fps ? `3D: ortalama **${report.fps.avg} fps** (en düşük ${report.fps.min}), ${report.fps.samples} örnek, ≤${report.fps.tris} üçgen, ≤${report.fps.calls} çizim çağrısı.` : "",
    "",
    `Hedef: performans ≥ ${TARGET.performance}, erişilebilirlik ≥ ${TARGET.accessibility}, 3D ≥ ${TARGET.fps} fps.`,
  ].join("\n");
  fs.writeFileSync(path.join(dir, "perf.md"), md);
  console.log(`\n${fail ? "✗ Hedeflerin altında kalan ölçüm var" : "✓ Tüm hedefler tuttu"} · rapor: reports/perf.md`);
  process.exit(fail ? 1 : 0);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
