/**
 * ESP32 emülatörü — firmware ile BİREBİR aynı protokol (HMAC imza, seq, /api/time eşitleme).
 * Donanım yokken /api/ingest'i ve anti-manipülasyon kurallarını test etmek için.
 *
 *   npm run device:emulate                    # etkileşimli (klavye)
 *   npm run device:emulate -- --count 5       # 5 paket atıp çık (CI / prova)
 *   npm run device:emulate -- --url http://192.168.1.20:3000
 *
 * Tuşlar:  k kuru toprak · i ıslak toprak · s sulama (ani nem artışı) · t kurcalama
 *          r tekrar saldırısı (eski seq) · b bozuk imza · q çıkış
 * INGEST_SECRET .env.local / .env'den okunur (ekrana basılmaz).
 */
import { createHmac } from "node:crypto";
import { existsSync } from "node:fs";

for (const f of [".env.local", ".env"]) {
  try {
    if (existsSync(f)) process.loadEnvFile(f);
  } catch {
    /* yoksay */
  }
}

const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const BASE = (arg("url") ?? "http://localhost:3000").replace(/\/$/, "");
const SECRET = process.env.INGEST_SECRET || "degistir-bunu";
const DEVICE_ID = "IST-SVK-01";
const COUNT = arg("count") ? Number(arg("count")) : Infinity;

let seq = Math.floor(Date.now() / 100); // her çalıştırmada ileri (desisaniye): sunucudaki son seq'ten büyük olsun
let soil = 31.5;
let target = 31.5;
let intervalSec = 2;
let offset = 0; // sunucu epoch − yerel epoch
let tamperNext = false;
let replayNext = false;
let badSigNext = false;
let sent = 0;

async function syncTime() {
  const r = await fetch(`${BASE}/api/time`);
  const serverEpoch = Number(await r.text());
  offset = serverEpoch - Math.floor(Date.now() / 1000);
  console.log(`[saat] sunucuyla fark ${offset} sn`);
}

async function send() {
  soil += (target - soil) * 0.6 + (Math.random() - 0.5) * 0.3;
  const useSeq = replayNext ? seq - 5 : ++seq;
  const body = JSON.stringify({
    ts: Math.floor(Date.now() / 1000) + offset,
    soilMoisture: Math.round(soil * 10) / 10,
    airTempC: Math.round((23.5 + Math.random()) * 10) / 10,
    humidity: Math.round(38 + Math.random() * 4),
    rainMm: 0,
    batteryV: 4.01,
    tamper: tamperNext,
    seq: useSeq,
  });
  const sig = createHmac("sha256", badSigNext ? "yanlis-anahtar" : SECRET).update(body).digest("hex");
  const t0 = performance.now();
  const r = await fetch(`${BASE}/api/ingest`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-device-id": DEVICE_ID, "x-signature": sig },
    body,
  });
  const j = (await r.json().catch(() => ({}))) as { nextIntervalSec?: number; flags?: string[]; error?: { code: string; message: string } };
  const ms = Math.round(performance.now() - t0);
  if (r.ok) {
    if (j.nextIntervalSec) intervalSec = j.nextIntervalSec;
    console.log(`[gönder] seq=${useSeq} nem=%${soil.toFixed(1)} → 200 (${ms} ms)${j.flags?.length ? ` bayrak: ${j.flags.join(",")}` : ""}`);
  } else {
    console.log(`[gönder] seq=${useSeq} → ${r.status} ${j.error?.code ?? ""} ${j.error?.message ?? ""}`);
    if (j.error?.code === "ZAMAN") await syncTime();
  }
  tamperNext = replayNext = badSigNext = false;
  sent++;
}

async function main() {
  console.log(`AgriShield cihaz emülatörü → ${BASE} (${DEVICE_ID})`);
  await syncTime();
  if (process.stdin.isTTY && COUNT === Infinity) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    console.log("Tuşlar: k kuru · i ıslak · s sulama · t kurcalama · r tekrar saldırısı · b bozuk imza · q çıkış");
    process.stdin.on("data", (k: string) => {
      const key = k.toLowerCase();
      if (key === "q" || k === "\u0003") process.exit(0);
      if (key === "k") target = 7.6;
      if (key === "i") target = 34.2;
      if (key === "s") {
        soil += 16; // yağışsız ani artış → "şüpheli" bayrağı
        target = soil;
      }
      if (key === "t") tamperNext = true;
      if (key === "r") replayNext = true;
      if (key === "b") badSigNext = true;
      void send(); // değişiklikte hemen gönder (firmware ile aynı)
    });
  }
  while (sent < COUNT) {
    await send().catch((e) => console.log("[hata]", e instanceof Error ? e.message : e));
    await new Promise((r) => setTimeout(r, intervalSec * 1000));
  }
  process.exit(0);
}

void main();
