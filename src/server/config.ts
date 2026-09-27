
/**
 * Ortam değişkenleri — tek yerden, varsayılanlarla. OFFLINE=1 ise tüm dış bağımlılıklar
 * (zincir, SMS, yapay zekâ) yerel taklitçilere düşer ve arayüz bunu rozetle söyler.
 */
const env = process.env;
const offline = env.OFFLINE !== "0";

export const config = {
  offline,
  demoSeed: env.DEMO_SEED ?? "2025-sanliurfa",
  chainMode: (offline ? "mock" : env.CHAIN_MODE === "amoy" ? "amoy" : "mock") as "mock" | "amoy",
  chainModeRequested: env.CHAIN_MODE === "amoy" ? "amoy" : "mock",
  amoyRpcUrl: env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
  amoyPrivateKey: env.AMOY_PRIVATE_KEY || "",
  contractAddress: env.CONTRACT_ADDRESS || "",
  aiMode: (offline ? "local" : env.AI_MODE === "api" ? "api" : "local") as "local" | "api",
  aiModeRequested: env.AI_MODE === "api" ? "api" : "local",
  anthropicKey: env.ANTHROPIC_API_KEY || "",
  anthropicModel: env.ANTHROPIC_MODEL || "claude-opus-5",
  smsMode: (offline ? "mock" : env.SMS_MODE === "provider" ? "provider" : "mock") as "mock" | "provider",
  smsWebhookUrl: env.SMS_WEBHOOK_URL || "",
  smsTestNumber: env.SMS_TEST_NUMBER || "",
  operatorPin: env.OPERATOR_PIN || "1907",
  ingestSecret: env.INGEST_SECRET || "degistir-bunu",
  itirazSn: Math.max(1, Number(env.ITIRAZ_PENCERESI_SN ?? 5)),
  /** cihaza dönülen ölçüm aralığı (sn). Sahada 900 (15 dk); sahnede 2 → jüri testinde 2 sn tepki */
  ingestIntervalSec: Math.max(1, Number(env.INGEST_INTERVAL_SN ?? 2)),
  villageDailyCap: Math.max(1, Number(env.VILLAGE_DAILY_CAP ?? 25)),
  publicBaseUrl: (env.PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, ""),
  /** SMS metnindeki kısa alan adı (prompt: agrishield.app/k/7F3A) */
  smsHost: (env.SMS_LINK_HOST || (env.PUBLIC_BASE_URL && !/localhost|127\.0\.0\.1/.test(env.PUBLIC_BASE_URL) ? env.PUBLIC_BASE_URL : "agrishield.app"))
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, ""),
  stageMode: env.NEXT_PUBLIC_STAGE_MODE !== "0",
  /** Herkese açık dağıtım: /operator kapalı */
  publicDeploy: env.PUBLIC_DEPLOY === "1",
  /** X-Forwarded-For yalnız güvenilir bir vekil (Vercel/Netlify) başlığı yeniden yazıyorsa kullanılır */
  trustProxy: env.TRUST_PROXY === "1" || env.VERCEL === "1" || env.NETLIFY === "true",
};

export type AppConfig = typeof config;
