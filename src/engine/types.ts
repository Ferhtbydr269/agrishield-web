/** Karar motoru tipleri — sunucu, istemci ve testler ortak kullanır. */

export type Verdict = "EVET" | "HAYIR" | "VERI_YOK";
export type Outcome = "ODE" | "GRI_BOLGE" | "ODEME_YOK";
export type Crop = "bugday" | "kirmizi_mercimek" | "arpa";
export type SoilType = "killi" | "tinli" | "kumlu";
export type WitnessKey = "satellite" | "station" | "meteo";

export const CROP_LABEL: Record<Crop, string> = {
  bugday: "Buğday",
  kirmizi_mercimek: "Kırmızı mercimek",
  arpa: "Arpa",
};

export const SOIL_LABEL: Record<SoilType, string> = {
  killi: "Killi",
  tinli: "Tınlı",
  kumlu: "Kumlu",
};

export const OUTCOME_LABEL: Record<Outcome, string> = {
  ODE: "ÖDE",
  GRI_BOLGE: "GRİ BÖLGE",
  ODEME_YOK: "ÖDEME YOK",
};

export const VERDICT_LABEL: Record<Verdict, string> = {
  EVET: "EVET",
  HAYIR: "HAYIR",
  VERI_YOK: "VERİ YOK",
};

export interface Thresholds {
  /** uydu: normal ortancaya göre NDVI anomalisi eşiği (ağırlık 1,0 için) */
  ndviAnomaly: number;
  /** geçerli optik geçiş için en yüksek bulutluluk */
  cloudMax: number;
  /** bu kadar gündür bulutsuz geçiş yoksa Sentinel-1 yedeğine geçilir */
  satStaleDays: number;
  /** Sentinel-1 yüzey nemi z-skoru eşiği */
  s1ZThreshold: number;
  /** istasyon: 30 günlük toplam yağış üst sınırı (mm) */
  rain30Max: number;
  /** toprak tipine göre solma noktası (hacimsel %) */
  soilWilting: Record<SoilType, number>;
  /** meteoroloji: SPI-30 eşiği */
  spiThreshold: number;
  /** meteoroloji: 30 günlük yağışın uzun yıllar ortalamasına oranı */
  rainRatioMax: number;
  /** oran kuralının anlamlı olması için en düşük 30 günlük normal (mm) */
  rainRatioMinNormal: number;
  /** parsel ölçeğindeki tek tanığın erken gri bölge açtırması için gereken ısrar (gün) */
  greyLocalPersistDays: number;
  /** aynı parsel için iki karar arası en az gün (karantina) */
  quarantineDays: number;
  /** poliçe başına sezonda en fazla ödeme tetiği */
  seasonTriggerCap: number;
}

export interface PhenologyWindow {
  key: "ekim" | "cikis_kardeslenme" | "sapa_kalkma" | "basaklanma" | "olgunlasma" | "sezon_disi";
  label: string;
  /** "MM-DD" */
  start: string;
  end: string;
  weight: number;
  triggerEnabled: boolean;
}

export interface SatelliteObs {
  date: string;
  ndvi: number | null;
  ndmi: number | null;
  /** 0–1 */
  cloud: number;
  /** Sentinel-1 yüzey nemi z-skoru (varsa) */
  s1z?: number | null;
}

export interface NormalPoint {
  date: string;
  p10: number;
  p50: number;
  p90: number;
}

export interface StationDay {
  date: string;
  rainMm: number;
  soilMoisture: number; // kök bölgesi (30 cm), hacimsel %
  soil10?: number;
  soil60?: number;
  airTempC?: number;
  humidity?: number;
  windMs?: number;
  batteryV?: number;
}

export interface StationReading {
  ts: number; // ms
  soilMoisture: number | null;
  rainMm: number | null;
  tamper?: boolean;
  seq?: number;
}

export type FlagCode = "supheli_nem_artisi" | "kurcalama" | "capraz_tutarsizlik" | "sira_geri" | "imza_hatasi" | "cihaz_sessiz";

export interface StationFlag {
  code: FlagCode;
  ts: number;
  label: string;
  detail: string;
}

export const FLAG_LABEL: Record<FlagCode, string> = {
  supheli_nem_artisi: "Yağışsız ani nem artışı",
  kurcalama: "Kurcalama algılandı",
  capraz_tutarsizlik: "Çapraz tutarsızlık (>3σ)",
  sira_geri: "Paket sırası geri gitti",
  imza_hatasi: "İmza tutmadı",
  cihaz_sessiz: "Cihaz sessiz",
};

export interface SatelliteWitness {
  verdict: Verdict;
  source: "Sentinel-2 / Copernicus" | "Sentinel-1 radar (yedek)" | "—";
  obsDate: string | null;
  ndvi: number | null;
  normalMedian: number | null;
  anomaly: number | null;
  threshold: number;
  cloud: number | null;
  s1z: number | null;
  window: { key: PhenologyWindow["key"]; label: string; weight: number; triggerEnabled: boolean };
  reason: string;
}

export interface StationWitness {
  verdict: Verdict;
  stationId: string;
  rain30mm: number | null;
  soilMoisture: number | null;
  threshold: number;
  soilType: SoilType;
  flags: StationFlag[];
  source: "senaryo" | "canli" | "simule";
  reason: string;
}

export interface MeteoWitness {
  verdict: Verdict;
  spi30: number | null;
  rain30mm: number | null;
  rain30Normal: number | null;
  ratio: number | null;
  source: string;
  reason: string;
}

export interface Witnesses {
  satellite: SatelliteWitness;
  station: StationWitness;
  meteo: MeteoWitness;
}

export interface RiskModelOutput {
  riskScore: number;
  /** [etiket, pay] — en etkili faktörler, SHAP mantığı (doğrusal modelde katkı = ağırlık × sapma) */
  topFactors: [string, number][];
  modelNote: string;
}

export interface PolicyTerms {
  id: string;
  season: string;
  sumInsuredTl: number;
  payoutRate: number;
  premiumTl: number;
  subsidyRate: number;
  thresholds: Thresholds;
}

export interface ParcelInfo {
  id: string;
  name: string;
  village: string;
  district: string;
  crop: Crop;
  areaDonum: number;
  soilType: SoilType;
  irrigated: boolean;
}

export interface VoteResult {
  yesCount: number;
  outcome: Outcome;
  amountTl: number;
}

export type SafeguardCode = "SEZON_TAVANI" | "KARANTINA" | "DEVRE_KESICI" | "PENCERE_KAPALI" | "DURAKLATILDI";

export interface SafeguardResult {
  ok: boolean;
  code?: SafeguardCode;
  message?: string;
}

/** Kararın dayanağı: anlık oylama, parsel ölçeğindeki tek tanığın ısrarı veya kritik dönem sonu değerlendirmesi */
export type DecisionBasis = "anlik_oylama" | "tek_tanik_israri" | "donem_sonu" | "operator";

export const BASIS_LABEL: Record<DecisionBasis, string> = {
  anlik_oylama: "Anlık oylama",
  tek_tanik_israri: "Parsel ölçeğinde tek tanık 10 gün ısrar etti",
  donem_sonu: "Kritik dönem sonu değerlendirmesi",
  operator: "Operatör talebiyle değerlendirme",
};

export interface Evidence {
  decisionCode: string;
  parcel: string;
  policy: string;
  ts: string;
  witnesses: {
    satellite: Record<string, unknown>;
    station: Record<string, unknown>;
    meteo: Record<string, unknown>;
  };
  rules: Record<string, unknown>;
  model: { riskScore: number; topFactors: [string, number][]; note: string };
  decision: { yesCount: number; outcome: Outcome; amountTl: number; basis: DecisionBasis };
  context: { scenario: string; dataNote: string };
  chain?: { mode: string; txHash: string; blockNumber: number; explorerUrl?: string | null };
  payment?: { refHash: string; channel: "FAST"; simulated: true };
}
