/**
 * Asistan bilgi tabanını üretir → data/knowledge.json
 *   - 32 jüri sorusu + demo soruları + sözlük: src/content/knowledge-src.ts
 *   - Doğrulanmış rakamlar: src/content/facts.ts (KOPYA DEĞİL, buradan üretilir)
 *   - Karar kuralları: karar motorundan (thresholds.ts, phenology.ts) üretilir
 *   npx tsx scripts/build-knowledge.ts
 */
import fs from "node:fs";
import path from "node:path";
import backtest from "../data/backtest.json";
import { FACTS, formatFact, type Fact } from "../src/content/facts";
import { GLOSSARY, QAS } from "../src/content/knowledge-src";
import { SOURCES } from "../src/content/sources";
import { PHENOLOGY } from "../src/engine/phenology";
import { DEFAULT_THRESHOLDS } from "../src/engine/thresholds";
import { CROP_LABEL, type Crop } from "../src/engine/types";

const facts = (Object.values(FACTS) as Fact[])
  .filter((f) => f.value !== null)
  .map((f) => ({
    id: `F:${f.id}`,
    claim: f.label,
    value: formatFact(f),
    kind: f.kind,
    derivation: f.derivation ?? null,
    source: SOURCES[f.sourceId].title,
    url: SOURCES[f.sourceId].url,
  }));

const t = DEFAULT_THRESHOLDS;
const md = (s: string) => {
  const [m, d] = s.split("-").map(Number);
  const months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  return `${d} ${months[m - 1]}`;
};
const phen = (crop: Crop) =>
  PHENOLOGY[crop]
    .filter((w) => w.key !== "ekim")
    .map((w) => `${w.label} ${md(w.start)}–${md(w.end)} ağırlık ${String(w.weight).replace(".", ",")}${w.triggerEnabled ? "" : " (tetik kapalı)"}`)
    .join("; ");

const rules = [
  {
    id: "R:oylama",
    title: "Üç tanık ve oylama kuralı",
    text: "Tanıklar: uydu (parsel), yer istasyonu (köy), resmi meteoroloji (bölge). ≥2 EVET → ÖDE (bedel × ödeme oranı); 1 EVET → GRİ BÖLGE (eksper incelemesi, çiftçiye bilgi SMS'i); 0 EVET → ÖDEME YOK (itiraz hakkı korunur).",
  },
  {
    id: "R:uydu",
    title: "Uydu tanığı",
    text: `NDVI anomalisi = (güncel − normal ortanca) / normal ortanca. EVET: anomali ≤ ${t.ndviAnomaly} / fenoloji ağırlığı, bulutluluk < ${t.cloudMax}. ${t.satStaleDays} gündür bulutsuz geçiş yoksa Sentinel-1 radar yedeği (yüzey nemi z ≤ ${t.s1ZThreshold} → EVET). Hasat penceresinde uydu tanığı daima HAYIR.`,
  },
  {
    id: "R:istasyon",
    title: "Yer istasyonu tanığı",
    text: `EVET: 30 günlük yağış ≤ ${t.rain30Max} mm VE kök bölgesi nemi solma noktasının altında (killi %${t.soilWilting.killi}, tınlı %${t.soilWilting.tinli}, kumlu %${t.soilWilting.kumlu}). Şüpheli veri (yağışsız 1 saatte >8 puan nem artışı, kurcalama, 3σ çapraz tutarsızlık, sıra/imza hatası) varsa VERİ YOK. Sulu parsellerde istasyon tanığı kullanılmaz.`,
  },
  {
    id: "R:meteoroloji",
    title: "Meteoroloji tanığı",
    text: `EVET: SPI-30 ≤ ${t.spiThreshold} VEYA 30 günlük yağış uzun yıllar ortalamasının %${t.rainRatioMax * 100}'ının altında (normal ≥ ${t.rainRatioMinNormal} mm olduğunda). Normal ve SPI parametreleri gerçek ERA5 1991–2020 Siverek verisinden.`,
  },
  {
    id: "R:emniyet",
    title: "Ek emniyetler",
    text: `Ödeme tavanı: poliçe başına sezonda ${t.seasonTriggerCap} tetik. Karantina: aynı parsel ${t.quarantineDays} gün içinde ikinci karar alamaz. Devre kesici: köy başına günde en fazla N ödeme, manuel durdurma. İtiraz penceresi: karar sonrası 60 sn (sahnede 5 sn), operatör durdurabilir.`,
  },
  ...(Object.keys(PHENOLOGY) as Crop[]).map((c) => ({
    id: `R:fenoloji:${c}`,
    title: `Fenoloji penceresi — ${CROP_LABEL[c]}`,
    text: `${phen(c)}. Efektif NDVI eşiği = ${t.ndviAnomaly} / ağırlık.`,
  })),
  {
    id: "R:backtest",
    title: "Geriye dönük test (gerçek ERA5, Siverek)",
    text: `${backtest.summary.n} sezonda (1991/92–2025/26) kritik dönemde meteoroloji tanığı ve 30 günlük yağış ≤ 10 mm aynı gün ${backtest.summary.triggered} sezonda birlikte gerçekleşti (${backtest.summary.triggeredSeasons.join(", ")}). Uydu ve toprak nemi dahil değil; üst yaklaşım.`,
  },
];

const out = {
  meta: {
    builtAt: new Date().toISOString(),
    note: "AgriShield Asistanı bilgi tabanı. Rakamlar facts.ts'den, kurallar karar motorundan üretilir.",
    counts: { qa: QAS.length, facts: facts.length, glossary: GLOSSARY.length, rules: rules.length },
  },
  qa: QAS,
  facts,
  glossary: GLOSSARY,
  rules,
};

fs.writeFileSync(path.join(process.cwd(), "data", "knowledge.json"), JSON.stringify(out, null, 1));
console.log(`knowledge.json: ${QAS.length} soru, ${facts.length} rakam, ${GLOSSARY.length} kavram, ${rules.length} kural (${Math.round(JSON.stringify(out).length / 1024)} KB)`);
