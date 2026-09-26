/**
 * Dil: TR varsayılan; ?lang=en ile İngilizce kısa sürüm (hero, üç tanık, karar, kanıt sayfası).
 * Eksik anahtar TR'ye düşer.
 */
import { COPY } from "./copy";

export type Lang = "tr" | "en";

const TR = {
  "hero.eyebrow": COPY.hero.eyebrow,
  "hero.title": COPY.hero.title,
  "hero.subtitle": COPY.hero.subtitle,
  "hero.ctaDemo": COPY.hero.ctaDemo,
  "hero.ctaField": COPY.hero.ctaField,
  "hero.ctaProof": COPY.hero.ctaProof,
  "hero.activeParcels": "aktif parsel",
  "hero.lastDecision": "son karar",
  "hero.systemStatus": "sistem durumu",
  "w.satellite": "Uydu",
  "w.station": "Yer istasyonu",
  "w.meteo": "Resmi meteoroloji",
  "w.satellite.sub": "Sentinel-2 · parsel",
  "w.station.sub": "Köy istasyonu · kök bölgesi",
  "w.meteo.sub": "ERA5 / MGM · bölge",
  "w.rule": "Üç tanıktan ikisi yeterli",
  "v.EVET": "EVET",
  "v.HAYIR": "HAYIR",
  "v.VERI_YOK": "VERİ YOK",
  "o.ODE": "ÖDE",
  "o.GRI_BOLGE": "GRİ BÖLGE",
  "o.ODEME_YOK": "ÖDEME YOK",
  "o.ODE.sub": "ödeme otomatik onaylandı",
  "o.GRI_BOLGE.sub": "eksper incelemesine gönderildi",
  "o.ODEME_YOK.sub": "itiraz hakkı korunur",
  "proof.title": "Kanıt sayfası",
  "proof.witnesses": "Üç tanık",
  "proof.rule": "Uygulanan kural",
  "proof.model": "Hakem modeli (yapay zekâ)",
  "proof.chain": "Blokzincir kaydı",
  "proof.payment": "Ödeme talimatı",
  "proof.verify": "Bu kaydın doğruluğunu nasıl kontrol ederim?",
  "proof.kvkk": COPY.kvkk,
  "footnote": COPY.footnote,
} as const;

export type I18nKey = keyof typeof TR;

const EN: Partial<Record<I18nKey, string>> = {
  "hero.eyebrow": "TEKNOFEST 2026 · Financial Technologies · AlgoVest",
  "hero.title": "Drought strikes in April. The money should arrive in April.",
  "hero.subtitle":
    "AgriShield watches every field from space and from the ground; when a drought really happens, it pays the farmer's bank account with the evidence attached — no claim needed.",
  "hero.ctaDemo": "Start live demo",
  "hero.ctaField": "Explore the 3D field",
  "hero.ctaProof": "Sample evidence page",
  "hero.activeParcels": "active parcels",
  "hero.lastDecision": "last decision",
  "hero.systemStatus": "system status",
  "w.satellite": "Satellite",
  "w.station": "Ground station",
  "w.meteo": "Official meteorology",
  "w.satellite.sub": "Sentinel-2 · parcel",
  "w.station.sub": "Village station · root zone",
  "w.meteo.sub": "ERA5 / MGM · region",
  "w.rule": "Two out of three witnesses are enough",
  "v.EVET": "YES",
  "v.HAYIR": "NO",
  "v.VERI_YOK": "NO DATA",
  "o.ODE": "PAY",
  "o.GRI_BOLGE": "GREY ZONE",
  "o.ODEME_YOK": "NO PAYOUT",
  "o.ODE.sub": "payout approved automatically",
  "o.GRI_BOLGE.sub": "sent to loss adjuster review",
  "o.ODEME_YOK.sub": "right to appeal preserved",
  "proof.title": "Evidence page",
  "proof.witnesses": "Three witnesses",
  "proof.rule": "Rule applied",
  "proof.model": "Referee model (AI)",
  "proof.chain": "Blockchain record",
  "proof.payment": "Payment instruction",
  "proof.verify": "How can I verify this record myself?",
  "proof.kvkk": "Contains no personal data (KVKK). Only a pseudonymous parcel ID and measurement/decision fingerprints are stored.",
  footnote:
    "This site is a prototype. Payment, SMS and (outside the testnet) blockchain steps are simulated. No partnership with any institution is implied.",
};

export function t(key: I18nKey, lang: Lang = "tr"): string {
  if (lang === "en") return EN[key] ?? TR[key];
  return TR[key];
}

export function langFromSearch(search: string | URLSearchParams | null | undefined): Lang {
  if (!search) return "tr";
  const sp = typeof search === "string" ? new URLSearchParams(search) : search;
  return sp.get("lang") === "en" ? "en" : "tr";
}
