/** Simülasyon senaryoları (zaman makinesi dünyaları). Veri: data/ndvi-2025.json + data/weather-2025.json */

export type ScenarioKey = "kuraklik-2025" | "gri-bolge" | "saglikli" | "manipulasyon";

export interface ScenarioMeta {
  key: ScenarioKey;
  label: string;
  short: string;
  focusParcelId: string;
  /** beklenen sonuç (testler ve prova raporu bunu doğrular) */
  expected: { outcome: "ODE" | "GRI_BOLGE" | "ODEME_YOK"; date: string; yesCount: number };
  description: string;
  /** zaman makinesinin sahnede başlatılacağı gün */
  stageStart: string;
  stageSpeed: number;
}

export const SEASON = {
  label: "2025-2026",
  start: "2025-11-01",
  end: "2026-06-30",
  endYear: 2026,
};

export const SCENARIOS: Record<ScenarioKey, ScenarioMeta> = {
  "kuraklik-2025": {
    key: "kuraklik-2025",
    label: "Kuraklık 2025–26",
    short: "Kuraklık",
    focusParcelId: "P-1182",
    expected: { outcome: "ODE", date: "2026-04-28", yesCount: 3 },
    description:
      "Kurak geçen kışın ardından Mart sonundan itibaren yağış kesiliyor. Meteoroloji Nisan başında, istasyon ve uydu 28 Nisan'da kuraklığı doğruluyor: 3/3 EVET.",
    stageStart: "2026-03-01",
    stageSpeed: 4,
  },
  "gri-bolge": {
    key: "gri-bolge",
    label: "Gri bölge (tek tanık)",
    short: "Gri bölge",
    focusParcelId: "P-1207",
    expected: { outcome: "GRI_BOLGE", date: "2026-04-16", yesCount: 1 },
    description:
      "Bölgeye normal yağış düşüyor ama fırtınalar köyü ıskalıyor. Köy istasyonu kuraklık görüyor; uydu ve meteoroloji görmüyor: 1/3 → eksper incelemesi.",
    stageStart: "2026-03-15",
    stageSpeed: 4,
  },
  saglikli: {
    key: "saglikli",
    label: "Sağlıklı sezon",
    short: "Sağlıklı",
    focusParcelId: "P-1244",
    expected: { outcome: "ODEME_YOK", date: "2026-05-20", yesCount: 0 },
    description: "Normal yağışlı bir sezon. Hiçbir tanık kuraklık görmüyor; kritik dönem sonunda 0/3 → ödeme yok (itiraz hakkı korunur).",
    stageStart: "2026-03-15",
    stageSpeed: 6,
  },
  manipulasyon: {
    key: "manipulasyon",
    label: "Manipülasyon testi",
    short: "Manipülasyon",
    focusParcelId: "P-1182",
    expected: { outcome: "GRI_BOLGE", date: "2026-05-20", yesCount: 1 },
    description:
      "16 Nisan'da yağış yokken istasyonun nemi bir saatte 15 puan artıyor: sensör sulandı. Şüpheli bayrak → istasyon tanığı devre dışı → tek tanık kalıyor: sistem ödemez, eksper devreye girer.",
    stageStart: "2026-04-10",
    stageSpeed: 5,
  },
};

export const SCENARIO_KEYS = Object.keys(SCENARIOS) as ScenarioKey[];

export function isScenarioKey(v: unknown): v is ScenarioKey {
  return typeof v === "string" && v in SCENARIOS;
}
