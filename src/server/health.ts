/** GET /api/health → { db, device, chain, ai, sms, sim, uptime } — /durum sayfası bunu gösterir. */
import { aiStatus } from "./ai";
import { listenerCount } from "./bus";
import { chain, chainFallbackReason, mockChain } from "./chain";
import { config } from "./config";
import { dbHealthy } from "./db";
import { deviceState } from "./device";
import { bootedAt, ensureRuntime } from "./runtime";
import { simSnapshot } from "./sim-engine";

export type Level = "ok" | "warn" | "error";
export interface Component {
  level: Level;
  label: string;
  detail: string;
}

export interface Health {
  db: Component;
  device: Component;
  chain: Component;
  ai: Component;
  sms: Component;
  sim: Component;
  stream: Component;
  uptime: number;
  modes: { offline: boolean; chain: string; ai: string; sms: string };
  checkedAt: number;
}

export async function health(): Promise<Health> {
  const boot = await ensureRuntime();
  const dbh = await dbHealthy();
  const dev = deviceState();
  const ch = chain();
  const chStatus = await ch.status();
  const integrity = ch.mode === "mock" ? await mockChain().verify() : null;
  const fb = chainFallbackReason();
  const ai = aiStatus();
  const sim = simSnapshot();

  return {
    db: dbh.ok
      ? { level: boot.db.autoSeeded ? "warn" : "ok", label: "Veritabanı (SQLite)", detail: `${dbh.parcels} parsel, ${dbh.decisions} karar${boot.db.autoSeeded ? " · tohum verisi açılışta otomatik yüklendi" : ""}` }
      : { level: "error", label: "Veritabanı", detail: dbh.error ?? "Bağlantı yok — `npm run setup` çalıştırın" },
    device:
      dev.status === "canli"
        ? { level: "ok", label: "Yer istasyonu (ESP32)", detail: `Canlı donanım bağlı · son paket ${Math.round((Date.now() - (dev.lastSeenMs ?? Date.now())) / 1000)} sn önce · sıra ${dev.seq ?? "—"}` }
        : dev.status === "simule"
          ? {
              level: "warn",
              label: "Yer istasyonu",
              detail: dev.forceSim ? "Sunucu ekranından simüle cihaz zorlandı (gerçek cihaz yok sayılıyor)" : "Gerçek cihaz yok → simüle cihaz devrede (sahne yedeği)",
            }
          : { level: "error", label: "Yer istasyonu", detail: "Cihaz sessiz, simülasyon kapalı" },
    chain:
      ch.mode === "amoy"
        ? { level: chStatus.height > 0 ? "ok" : "error", label: "Blokzincir (Polygon Amoy)", detail: `${chStatus.network} · blok ${chStatus.height} · bakiye ${chStatus.balance ?? "?"}` }
        : {
            level: integrity?.ok ? "warn" : "error",
            label: "Blokzincir (taklit)",
            detail: `SİMÜLASYON: yerel SHA-256 zinciri · yükseklik ${chStatus.height} · bütünlük ${integrity?.ok ? "sağlam" : `BOZUK (blok ${integrity?.brokenAt})`}${fb ? ` · ${fb}` : " · gerçek testnet için CHAIN_MODE=amoy"}`,
          },
    ai:
      ai.mode === "api"
        ? { level: ai.keyPresent ? "ok" : "warn", label: "Asistan (Anthropic API)", detail: `${ai.model} · kaynak zorunlu · bilgi tabanı ${ai.counts.qa} soru` }
        : { level: "ok", label: "Asistan (yerel bilgi tabanı)", detail: `İnternetsiz BM25 arama · ${ai.counts.qa} soru, ${ai.counts.facts} rakam, ${ai.counts.glossary} kavram${ai.requested === "api" ? " · API istendi ama OFFLINE=1" : ""}` },
    sms:
      config.smsMode === "provider"
        ? { level: "ok", label: "SMS (sağlayıcı)", detail: "Yalnız takımın kendi test numarasına" }
        : { level: "warn", label: "SMS (taklit)", detail: "SİMÜLASYON: mesaj yalnızca ekrandaki telefonda görünür" },
    sim: { level: "ok", label: "Zaman makinesi", detail: `${sim.scenarioLabel} · ${sim.date} · ${sim.playing ? `${sim.speed} gün/sn` : "duraklatıldı"}${sim.synthetic ? " · örnek veri" : ""}` },
    stream: { level: "ok", label: "Canlı yayın (SSE)", detail: `${listenerCount()} bağlı ekran` },
    uptime: Math.round((Date.now() - bootedAt()) / 1000),
    modes: { offline: config.offline, chain: ch.mode, ai: config.aiMode, sms: config.smsMode },
    checkedAt: Date.now(),
  };
}
