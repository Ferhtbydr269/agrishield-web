/**
 * Canlı yayın (SSE) sözleşmesi — sunucu ve istemci ortak kullanır.
 * GET /api/stream → events: snapshot | sim | reading | witness | decision | chain | payment | sms | device | scene | early | breaker
 */
import type { Outcome, StationFlag, StationWitness, Verdict, Witnesses } from "@/engine/types";
import type { ScenarioKey } from "@/sim/scenarios";

export interface SimParcelState {
  id: string;
  crop: string;
  soilType: string;
  irrigated: boolean;
  /** 3D ve grafik için günlük ara değerli NDVI */
  ndvi: number | null;
  ndviNormal: number | null;
  /** son geçerli uydu gözleminin anomalisi */
  anomaly: number | null;
  lastObs: { date: string; ndvi: number | null; cloud: number } | null;
  window: { key: string; label: string; weight: number; triggerEnabled: boolean };
  witnesses: Witnesses;
  yesCount: number;
  projected: Outcome;
  riskScore: number;
  topFactors: [string, number][];
  decision: DecisionSummary | null;
}

export interface StationLive {
  soil10: number | null;
  soil30: number | null;
  soil60: number | null;
  rainToday: number;
  rain30: number | null;
  airTempC: number | null;
  humidity: number | null;
  windMs: number | null;
  batteryV: number | null;
  source: "senaryo" | "canli" | "simule";
  flags: StationFlag[];
}

export interface SimState {
  scenario: ScenarioKey;
  scenarioLabel: string;
  focusParcelId: string;
  synthetic: boolean;
  date: string;
  /** simülasyon zamanı (ms, yerel saat dahil) */
  simMs: number;
  speed: number;
  playing: boolean;
  seasonStart: string;
  seasonEnd: string;
  station: StationLive;
  meteo: { spi30: number | null; rain30: number | null; rain30Normal: number | null; ratio: number | null };
  weather: { cloudCover: number; raining: boolean; hour: number };
  satPass: { active: boolean; date: string | null; cloudy: boolean; sensor: "S2" | "S1"; progress: number };
  parcels: SimParcelState[];
  stationSource: "senaryo" | "canli";
  holdPayment: boolean;
  runId: string;
  breaker: { paused: boolean; reason: string | null };
  earlyWarned: boolean;
  serverTs: number;
}

export interface DecisionSummary {
  id: string;
  code: string;
  parcelId: string;
  outcome: Outcome;
  yesCount: number;
  amountTl: number;
  status: "itiraz_penceresi" | "durduruldu" | "kesinlesti";
  simDate: string;
  scenario: string;
  ts: number;
  windowEndsAt: number | null;
  witnesses: { sat: Verdict; station: Verdict; meteo: Verdict };
  evidenceHash: string;
  txHash: string | null;
  blockNumber: number | null;
  explorerUrl: string | null;
  chainMode: string | null;
  paymentRef: string | null;
  paymentRefText: string | null;
  smsText: string | null;
  notifiedAt: number | null;
  latencies: Record<string, number>;
}

export interface ChainBlockView {
  number: number;
  hash: string;
  prevHash: string;
  ts: number;
  kind: string;
  decisionCode: string | null;
  txHash: string;
  summary: string;
}

export interface DeviceState {
  status: "canli" | "simule" | "sessiz";
  deviceId: string;
  lastSeenMs: number | null;
  seq: number | null;
  batteryV: number | null;
  lastReading: LiveReading | null;
  flags: StationFlag[];
  liveWitness: StationWitness | null;
  /** simüle cihazın konumu (sahne yedeği) */
  simPot: "islak" | "kuru";
  /** ölçüm → ekran gecikmesi (sunucu tarafı, ms) */
  lastLatencyMs: number | null;
  /** acil durum: gerçek cihaz yok sayılır, simüle cihaz kullanılır */
  forceSim: boolean;
}

export interface LiveReading {
  source: "device" | "sim-device";
  ts: number;
  receivedAt: number;
  soilMoisture: number | null;
  airTempC: number | null;
  humidity: number | null;
  rainMm: number | null;
  windMs: number | null;
  batteryV: number | null;
  seq: number | null;
  flags: string[];
}

export interface SceneState {
  index: number;
  present: boolean;
  blackout: boolean;
  origin: string;
  startedAt: number | null;
  /** /sunucu "sahneyi yeniden yükle" — artınca ana ekran sayfayı yeniler */
  reloadNonce: number;
}

export interface ChainStatusView {
  mode: "mock" | "amoy";
  network: string;
  contract: string | null;
  height: number;
  lastTx: string | null;
  balance: string | null;
}

export interface Snapshot {
  sim: SimState;
  device: DeviceState;
  chain: ChainStatusView;
  blocks: ChainBlockView[];
  decisions: DecisionSummary[];
  scene: SceneState;
  modes: { offline: boolean; chain: "mock" | "amoy"; ai: "local" | "api"; sms: "mock" | "provider" };
}

export type LiveEvent =
  | { id: number; ts: number; type: "snapshot"; data: Snapshot }
  | { id: number; ts: number; type: "sim"; data: SimState }
  | { id: number; ts: number; type: "reading"; data: LiveReading }
  | { id: number; ts: number; type: "witness"; data: { scope: "live"; witness: StationWitness } }
  | { id: number; ts: number; type: "decision"; data: { phase: "created" | "finalized" | "stopped" | "rejected"; decision: DecisionSummary | null; message?: string } }
  | { id: number; ts: number; type: "chain"; data: { phase: "pending" | "confirmed" | "payment_referenced" | "error"; code: string; block?: ChainBlockView; txHash?: string; explorerUrl?: string | null; mode: string; ms?: number; message?: string } }
  | { id: number; ts: number; type: "payment"; data: { phase: "pending" | "sent" | "held"; code: string; amountTl: number; paymentRefText?: string; refHash?: string; ibanMasked: string; simulated: true; ms?: number } }
  | { id: number; ts: number; type: "sms"; data: { code: string; to: string; text: string; mode: "mock" | "provider"; kind: "odeme" | "gri" | "bilgi" | "erken" } }
  | { id: number; ts: number; type: "device"; data: DeviceState }
  | { id: number; ts: number; type: "scene"; data: SceneState }
  | { id: number; ts: number; type: "early"; data: { parcelId: string; date: string; score: number; text: string } }
  | { id: number; ts: number; type: "breaker"; data: { paused: boolean; reason: string | null } };

export type LiveEventType = LiveEvent["type"];
