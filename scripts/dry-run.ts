/**
 * SAHNE PROVASI — `npm run dry-run` (AGRISHIELD_PROMPT.md 13.4 · sunumdan önce ZORUNLU)
 * Tüm sahneleri başsız koşturur; her adımın süresini ve hatasını raporlar. Çalışan bir sunucu ister
 * (npm run dev / npm run stage). Rapor: reports/dry-run.md + reports/dry-run.json. Hata varsa çıkış kodu 1.
 *
 *   npm run dry-run
 *   npm run dry-run -- --url http://localhost:3000 --hizli     # senaryoları karar gününe yakın başlat
 *
 * Adımlar: motor (başsız, 4 senaryo) → sağlık → sayfalar → sahnedeki gibi 4 senaryo akışı (karar → zincir → ödeme → SMS,
 * kanıt hash'i yeniden hesaplanır) → asistan → cihaz girişi (imzalı paket, bozuk imza, tekrar saldırısı) → sahne senkronu.
 * Sonunda sahne başlangıç durumuna döner (Kuraklık senaryosu, sahne 1).
 */
import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { hashEvidence } from "../src/engine/evidence";
import type { Evidence } from "../src/engine/types";
import { runScenario } from "../src/sim/evaluate";
import { SCENARIOS, SCENARIO_KEYS, type ScenarioKey } from "../src/sim/scenarios";
import { addDays } from "../src/lib/dates";

for (const f of [".env.local", ".env"]) {
  try {
    if (fs.existsSync(f)) process.loadEnvFile(f);
  } catch {
    /* yoksay */
  }
}

const argv = process.argv.slice(2);
const argVal = (n: string) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const BASE = (argVal("url") ?? "http://localhost:3000").replace(/\/$/, "");
const FAST = argv.includes("--hizli");
const SECRET = process.env.INGEST_SECRET || "degistir-bunu";

interface Step {
  group: string;
  name: string;
  ok: boolean;
  ms: number;
  detail: string;
}
const steps: Step[] = [];

async function step(group: string, name: string, fn: () => Promise<string>) {
  const t0 = performance.now();
  try {
    const detail = await fn();
    const ms = Math.round(performance.now() - t0);
    steps.push({ group, name, ok: true, ms, detail });
    console.log(`  ✓ ${name} (${ms} ms)${detail ? ` — ${detail}` : ""}`);
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    const detail = e instanceof Error ? e.message : String(e);
    steps.push({ group, name, ok: false, ms, detail });
    console.log(`  ✗ ${name} (${ms} ms) — ${detail}`);
  }
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function get<T = unknown>(p: string): Promise<{ status: number; json: T; text: string }> {
  const r = await fetch(BASE + p, { cache: "no-store" });
  const text = await r.text();
  let json: T = undefined as T;
  try {
    json = JSON.parse(text) as T;
  } catch {
    /* html */
  }
  return { status: r.status, json, text };
}

async function post<T = unknown>(p: string, body: unknown, headers: Record<string, string> = {}): Promise<{ status: number; json: T }> {
  const r = await fetch(BASE + p, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
  return { status: r.status, json: (await r.json().catch(() => ({}))) as T };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const OUTCOME_TR = { ODE: "ÖDE", GRI_BOLGE: "GRİ BÖLGE", ODEME_YOK: "ÖDEME YOK" } as const;

interface DecisionLite {
  id: string;
  code: string;
  outcome: keyof typeof OUTCOME_TR;
  yesCount: number;
  status: string;
  simDate: string | null;
  txHash: string | null;
  paymentRef: string | null;
  notifiedAt: number | null;
  latencies: Record<string, number>;
}
interface SimLite {
  full: { date: string; focusParcelId: string; parcels: { id: string; decision: DecisionLite | null }[]; holdPayment: boolean; breaker: { paused: boolean } };
}

async function main() {
  console.log(`AgriShield sahne provası → ${BASE}${FAST ? " (hızlı)" : ""}\n`);

  // ── 1. Motor (başsız, sunucusuz) ──
  console.log("1 · Karar motoru (başsız)");
  for (const key of SCENARIO_KEYS) {
    await step("motor", `${SCENARIOS[key].short}: ${OUTCOME_TR[SCENARIOS[key].expected.outcome]} @ ${SCENARIOS[key].expected.date}`, async () => {
      const r = runScenario(key);
      const e = SCENARIOS[key].expected;
      assert(r.decision, "karar oluşmadı");
      assert(r.decision.outcome === e.outcome && r.decision.date === e.date && r.decision.yesCount === e.yesCount, `beklenen ${e.outcome}/${e.date}/${e.yesCount}, çıkan ${r.decision.outcome}/${r.decision.date}/${r.decision.yesCount}`);
      return `erken uyarı ${r.earlyWarning ?? "yok"}`;
    });
  }

  // ── 2. Sağlık ──
  console.log("\n2 · Sunucu ve bileşenler");
  let alive = false;
  await step("saglik", "sunucu yanıt veriyor (/api/health)", async () => {
    const r = await get<Record<string, { level: string; label: string; detail: string }> & { modes: Record<string, unknown> }>("/api/health");
    assert(r.status === 200, `HTTP ${r.status}`);
    alive = true;
    const comps = ["db", "device", "chain", "ai", "sms", "sim", "stream"];
    const bad = comps.filter((c) => r.json[c]?.level === "error");
    assert(!bad.length, `kırmızı bileşen: ${bad.map((c) => `${r.json[c].label} (${r.json[c].detail})`).join("; ")}`);
    const warn = comps.filter((c) => r.json[c]?.level === "warn").map((c) => r.json[c].label);
    return `modlar ${JSON.stringify(r.json.modes)}${warn.length ? ` · sarı: ${warn.join(", ")}` : ""}`;
  });
  if (!alive) {
    console.log("\nSunucu yok. Önce `npm run dev` ya da `npm run stage` çalıştırın.");
    return finish();
  }

  // ── 3. Sayfalar ──
  console.log("\n3 · Sayfalar");
  for (const p of ["/", "/k/7F3A", "/parsel/P-1182", "/asistan", "/durum", "/kaynaklar", "/sunucu", "/?fallback2d=1"]) {
    await step("sayfa", p, async () => {
      const r = await get(p);
      assert(r.status === 200, `HTTP ${r.status}`);
      assert(!/Application error|Internal Server Error/i.test(r.text), "sayfada hata metni");
      return `${Math.round(r.text.length / 1024)} KB`;
    });
  }

  // ── 4. Senaryolar sahnedeki gibi ──
  console.log("\n4 · Senaryo akışları (zaman makinesi → karar → zincir → ödeme → SMS)");
  await post("/api/sim/settings", { holdPayment: false, breaker: { trip: false }, clearFlags: true });
  const produced: Record<string, string> = {};
  for (const key of SCENARIO_KEYS as ScenarioKey[]) {
    const meta = SCENARIOS[key];
    await step("senaryo", `${meta.short} → ${OUTCOME_TR[meta.expected.outcome]}`, async () => {
      const l = await post("/api/sim/load", { scenario: key });
      assert(l.status === 200, `yükleme HTTP ${l.status}`);
      const start = FAST ? addDays(meta.expected.date, -3) : meta.stageStart;
      if (FAST) await post("/api/sim/seek", { date: start });
      const speed = FAST ? 2 : meta.stageSpeed;
      await post("/api/sim/play", { speed });
      const t0 = Date.now();
      let d: DecisionLite | null = null;
      let decidedAt = 0;
      // karar + hat (itiraz penceresi, zincir, ödeme, SMS) en fazla 60 sn
      while (Date.now() - t0 < 60_000) {
        const s = await get<SimLite>("/api/sim/state");
        d = s.json.full.parcels.find((p) => p.id === meta.focusParcelId)?.decision ?? null;
        if (d && !decidedAt) decidedAt = Date.now();
        if (d && d.status === "kesinlesti" && d.notifiedAt) break;
        if (d?.status === "durduruldu") break;
        await sleep(250);
      }
      await post("/api/sim/play", { speed: 0 });
      assert(d, `60 sn içinde karar yok`);
      assert(d.outcome === meta.expected.outcome, `sonuç ${d.outcome}, beklenen ${meta.expected.outcome}`);
      assert(d.simDate === meta.expected.date, `karar günü ${d.simDate}, beklenen ${meta.expected.date}`);
      assert(d.status === "kesinlesti", `durum ${d.status}`);
      assert(d.txHash, "zincir kaydı yok");
      assert(d.notifiedAt, "SMS gitmedi");
      if (d.outcome === "ODE") assert(d.paymentRef, "ödeme referansı yok");
      produced[key] = d.code;
      const L = d.latencies;
      return `/k/${d.code} · ${d.yesCount}/3 · karara ${Math.round((decidedAt - t0) / 100) / 10} sn · itiraz ${L.itiraz ?? "?"} ms · zincir ${L.zincir ?? "?"} ms · ödeme ${L.odeme ?? "-"} ms · toplam hat ${L.toplam ?? "?"} ms`;
    });
    const code = produced[key];
    if (code) {
      await step("senaryo", `  kanıt /k/${code}: hash yeniden hesaplandı`, async () => {
        const r = await get<{ evidence: Evidence; evidenceHash: string; verified: boolean }>(`/api/decision/${code}`);
        assert(r.status === 200, `HTTP ${r.status}`);
        const mine = hashEvidence(r.json.evidence);
        assert(mine === r.json.evidenceHash, `hash tutmadı: ${mine} ≠ ${r.json.evidenceHash}`);
        const page = await get(`/k/${code}`);
        assert(page.status === 200 && page.text.includes(r.json.evidenceHash), "kanıt sayfası hash'i göstermiyor");
        return `${r.json.evidenceHash.slice(0, 18)}…`;
      });
    }
  }

  // ── 5. Asistan ──
  console.log("\n5 · Asistan");
  for (const q of ["Neden blokzincir?", "Basis risk nedir?", "TARSİM'in yaptığından farkı ne?", "Prim ne kadar?", "Sensörü sularsam?"]) {
    await step("asistan", q, async () => {
      const r = await post<{ answer: string; sources: unknown[]; mode: string; matchedId: string | null }>("/api/ask", { q });
      assert(r.status === 200, `HTTP ${r.status}`);
      assert(r.json.sources.length > 0, "kaynaksız cevap");
      return `${r.json.mode} · ${r.json.matchedId} · ${r.json.sources.length} kaynak`;
    });
  }
  await step("asistan", "bilinmeyen soru uydurmuyor", async () => {
    const r = await post<{ sources: unknown[]; answer: string }>("/api/ask", { q: "Mars'ta buğday yetişir mi ve kaç lira eder?" });
    assert(r.status === 200 && r.json.sources.length === 0, "bilinmeyen soruya kaynaklı cevap verdi");
    return r.json.answer.slice(0, 50) + "…";
  });

  // ── 6. Cihaz girişi (HIL protokolü) ──
  console.log("\n6 · Cihaz girişi (/api/ingest)");
  const now = Math.floor(Date.now() / 1000);
  let seq = Math.floor(Date.now() / 100);
  const sign = (body: string, key = SECRET) => createHmac("sha256", key).update(body).digest("hex");
  const packet = (s: number, soil = 30.1) => JSON.stringify({ ts: now, soilMoisture: soil, airTempC: 24, humidity: 40, rainMm: 0, batteryV: 4, seq: s });
  await step("cihaz", "imzalı paket kabul edilir", async () => {
    const t0 = performance.now();
    const b = packet(++seq);
    const r = await post<{ ok: boolean; nextIntervalSec: number }>("/api/ingest", b, { "x-device-id": "IST-SVK-01", "x-signature": sign(b) });
    assert(r.status === 200, `HTTP ${r.status} ${JSON.stringify(r.json)}`);
    return `${Math.round(performance.now() - t0)} ms · sonraki aralık ${r.json.nextIntervalSec} sn`;
  });
  await step("cihaz", "bozuk imza reddedilir (401)", async () => {
    const b = packet(++seq);
    const r = await post("/api/ingest", b, { "x-device-id": "IST-SVK-01", "x-signature": sign(b, "yanlis") });
    assert(r.status === 401, `HTTP ${r.status}`);
    return "";
  });
  await step("cihaz", "eski zaman damgası reddedilir (±120 sn)", async () => {
    const b = JSON.stringify({ ts: now - 600, soilMoisture: 30, seq: ++seq });
    const r = await post("/api/ingest", b, { "x-device-id": "IST-SVK-01", "x-signature": sign(b) });
    assert(r.status === 401, `HTTP ${r.status}`);
    return "";
  });
  await step("cihaz", "geri giden sıra no işaretlenir", async () => {
    const b = packet(seq - 50);
    const r = await post<{ flags: string[] }>("/api/ingest", b, { "x-device-id": "IST-SVK-01", "x-signature": sign(b) });
    assert(r.status === 200 && r.json.flags.includes("sira_geri"), `bayrak yok: ${JSON.stringify(r.json)}`);
    return "sira_geri";
  });
  // temizlik: bayraklar ve sıra sayacı sıfırlanır; 20 sn sonra simüle cihaz devreye girer
  await post("/api/device", { reset: true });

  // ── 7. Sahne senkronu ──
  console.log("\n7 · Sahne senkronu (/sunucu ↔ /)");
  await step("sahne", "10 sahne ileri", async () => {
    for (let i = 0; i < 10; i++) {
      const r = await post<{ index: number }>("/api/scene", { index: i, origin: "dry-run" });
      assert(r.status === 200 && r.json.index === i, `sahne ${i + 1} ayarlanamadı`);
    }
    return "1 → 10";
  });

  // ── başlangıç durumuna dön ──
  await post("/api/scene", { index: 0, present: false, blackout: false, resetTimer: true, origin: "dry-run" });
  await post("/api/sim/load", { scenario: "kuraklik-2025" });
  return finish();
}

function finish() {
  const failed = steps.filter((s) => !s.ok);
  const total = steps.reduce((a, s) => a + s.ms, 0);
  const dir = path.join(process.cwd(), "reports");
  fs.mkdirSync(dir, { recursive: true });
  const when = new Date().toISOString();
  const md = [
    `# Sahne provası — ${when}`,
    "",
    `Sunucu: ${BASE}${FAST ? " (hızlı mod)" : ""} · ${steps.length} adım · ${failed.length} hata · toplam ${Math.round(total / 1000)} sn`,
    "",
    "| | Grup | Adım | Süre | Ayrıntı |",
    "|---|---|---|---|---|",
    ...steps.map((s) => `| ${s.ok ? "✓" : "✗"} | ${s.group} | ${s.name.trim()} | ${s.ms} ms | ${s.detail.replace(/\|/g, "/")} |`),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(dir, "dry-run.md"), md);
  fs.writeFileSync(path.join(dir, "dry-run.json"), JSON.stringify({ at: when, base: BASE, steps }, null, 2));
  console.log(`\n${failed.length ? `✗ ${failed.length} adım başarısız` : "✓ Tüm adımlar geçti"} · ${steps.length} adım · rapor: reports/dry-run.md`);
  process.exit(failed.length ? 1 : 0);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
