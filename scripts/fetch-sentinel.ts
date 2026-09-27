/**
 * GERÇEK Sentinel-2 NDVI (isteğe bağlı) — `npm run fetch:sentinel`
 * Copernicus Data Space Ecosystem (CDSE) Statistical API ile her parselin 5 günlük NDVI ortalamasını indirir
 * (SCL bulut/gölge maskeli) → data/ndvi-real.json. Sahne bu dosyaya BAĞIMLI DEĞİLDİR: demo senaryoları
 * örnek veriyle çalışır; bu betik pilot/inceleme için "gerçek uydu verisi" katmanıdır.
 *
 * Gerekenler (.env.local):  CDSE_CLIENT_ID, CDSE_CLIENT_SECRET
 *   (dataspace.copernicus.eu → User settings → OAuth clients; ücretsiz hesap)
 *   npm run fetch:sentinel                              # 2024-11-01 → 2025-06-30 (gerçek 2024–25 sezonu)
 *   npm run fetch:sentinel -- --from 2023-11-01 --to 2024-06-30
 * Not: data/parcels.geojson'daki sınırlar örnektir (takma adlı parseller); gerçek pilot parselleri için geojson'u değiştirin.
 */
import fs from "node:fs";
import path from "node:path";

for (const f of [".env.local", ".env"]) {
  try {
    if (fs.existsSync(f)) process.loadEnvFile(f);
  } catch {
    /* yoksay */
  }
}

const argv = process.argv.slice(2);
const val = (n: string, d: string) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : d;
};
const FROM = val("from", "2024-11-01");
const TO = val("to", "2025-06-30");
const TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const STATS_URL = "https://sh.dataspace.copernicus.eu/api/v1/statistics";

const EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: [{ id: "ndvi", bands: 1, sampleType: "FLOAT32" }, { id: "dataMask", bands: 1 }]
  };
}
// SCL: 3 bulut gölgesi, 8 orta olasılıklı bulut, 9 yüksek olasılıklı bulut, 10 ince sirrus
function evaluatePixel(s) {
  var cloudy = s.SCL === 3 || s.SCL === 8 || s.SCL === 9 || s.SCL === 10;
  var ndvi = (s.B08 - s.B04) / (s.B08 + s.B04 + 1e-6);
  return { ndvi: [ndvi], dataMask: [s.dataMask === 1 && !cloudy ? 1 : 0] };
}`;

interface Feature {
  properties: { id: string; kind: string };
  geometry: { type: string; coordinates: unknown };
}

async function token(id: string, secret: string): Promise<string> {
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
  });
  if (!r.ok) throw new Error(`CDSE kimlik doğrulama başarısız: HTTP ${r.status}`);
  return ((await r.json()) as { access_token: string }).access_token;
}

async function main() {
  if (process.env.OFFLINE === "1" && !argv.includes("--zorla")) {
    console.log("OFFLINE=1: internet kapalı kabul edildi, indirme yapılmadı. (Zorlamak için --zorla)");
    return;
  }
  const id = process.env.CDSE_CLIENT_ID;
  const secret = process.env.CDSE_CLIENT_SECRET;
  if (!id || !secret) {
    console.log("CDSE_CLIENT_ID / CDSE_CLIENT_SECRET yok (.env.local). Copernicus Data Space'te ücretsiz OAuth istemcisi oluşturun.");
    console.log("Demo bu veriye bağımlı değildir; senaryolar örnek veriyle çalışır.");
    return;
  }
  const geo = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "parcels.geojson"), "utf8")) as { features: Feature[] };
  const parcels = geo.features.filter((f) => f.properties.kind === "parcel");
  const tk = await token(id, secret);
  const out: Record<string, { date: string; ndvi: number | null; cloud: number; samples: number }[]> = {};

  for (const p of parcels) {
    const body = {
      input: {
        bounds: { geometry: p.geometry, properties: { crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84" } },
        data: [{ type: "sentinel-2-l2a", dataFilter: { maxCloudCoverage: 90 } }],
      },
      aggregation: {
        timeRange: { from: `${FROM}T00:00:00Z`, to: `${TO}T23:59:59Z` },
        aggregationInterval: { of: "P5D" },
        evalscript: EVALSCRIPT,
        resx: 0.0001, // ≈ 10 m (derece)
        resy: 0.0001,
      },
      calculations: { default: {} },
    };
    const r = await fetch(STATS_URL, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${tk}` }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`${p.properties.id}: Statistical API HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
    const j = (await r.json()) as {
      data: { interval: { from: string }; outputs: { ndvi: { bands: { B0: { stats: { mean: number | string; sampleCount: number; noDataCount: number } } } } } }[];
    };
    out[p.properties.id] = j.data.map((d) => {
      const s = d.outputs.ndvi.bands.B0.stats;
      const valid = s.sampleCount - s.noDataCount;
      return {
        date: d.interval.from.slice(0, 10),
        ndvi: valid > 0 && typeof s.mean === "number" ? Math.round(s.mean * 1000) / 1000 : null,
        cloud: s.sampleCount ? Math.round((s.noDataCount / s.sampleCount) * 100) / 100 : 1,
        samples: valid,
      };
    });
    console.log(`✓ ${p.properties.id}: ${out[p.properties.id].filter((x) => x.ndvi != null).length}/${out[p.properties.id].length} geçerli 5 günlük dönem`);
  }

  const file = path.join(process.cwd(), "data", "ndvi-real.json");
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        meta: {
          source: "Copernicus Sentinel-2 L2A — CDSE Statistical API (5 günlük ortalama, SCL bulut/gölge maskeli)",
          from: FROM,
          to: TO,
          fetchedAt: new Date().toISOString(),
          synthetic: false,
          note: "Parsel sınırları örnektir; değerler o sınırların gerçek uydu ölçümüdür.",
        },
        parcels: out,
      },
      null,
      2,
    ),
  );
  console.log(`→ ${path.relative(process.cwd(), file)}`);
}

void main().catch((e) => {
  console.error("İndirme başarısız:", e instanceof Error ? e.message : e);
  process.exit(1);
});
