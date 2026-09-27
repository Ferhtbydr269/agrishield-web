/**
 * QR kodları (AGRISHIELD_PROMPT.md 20.2) → public/qr/
 *   (1) site kökü  (2) örnek kanıt sayfası /k/7F3A  (3) asistan
 * QR'lar KENDİ alan adınıza bakar (PUBLIC_BASE_URL ya da --base); kısaltma servisi kullanılmaz.
 *   npm run qr
 *   npm run qr -- --base https://agrishield.app
 *   npm run qr -- --base http://192.168.1.20:3000     # sahnede yerel ağ (telefonlar aynı Wi-Fi'da)
 */
import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";

for (const f of [".env.local", ".env"]) {
  try {
    if (fs.existsSync(f)) process.loadEnvFile(f);
  } catch {
    /* yoksay */
  }
}

const i = process.argv.indexOf("--base");
const base = (i >= 0 ? process.argv[i + 1] : process.env.PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const out = path.join(process.cwd(), "public", "qr");
fs.mkdirSync(out, { recursive: true });

const targets = [
  { file: "site", url: `${base}/`, label: "AgriShield" },
  { file: "kanit-7F3A", url: `${base}/k/7F3A`, label: "Örnek kanıt sayfası" },
  { file: "asistan", url: `${base}/asistan`, label: "AgriShield Asistanı" },
];

async function main() {
  for (const t of targets) {
    const opts = { margin: 2, errorCorrectionLevel: "M" as const, color: { dark: "#0e1a14", light: "#ffffff" } };
    fs.writeFileSync(path.join(out, `${t.file}.svg`), await QRCode.toString(t.url, { ...opts, type: "svg" }));
    await QRCode.toFile(path.join(out, `${t.file}.png`), t.url, { ...opts, type: "png", width: 1024 });
    console.log(`✓ public/qr/${t.file}.svg/.png → ${t.url}`);
  }
  fs.writeFileSync(path.join(out, "hedefler.json"), JSON.stringify({ base, generatedAt: new Date().toISOString(), targets }, null, 2));
  if (/localhost|127\.0\.0\.1/.test(base)) {
    console.log("\n! Uyarı: QR'lar localhost'a bakıyor — telefon bunu açamaz. Sahnede --base http://<bilgisayar-IP>:3000, yayında kendi alan adınızı verin.");
  }
}

void main();
