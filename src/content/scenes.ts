/**
 * Sahne listesi — AGRISHIELD_PROMPT.md 13.1. Tuşlar 1–9 ve 0; ←/→ ile gezinme.
 * Not: 6. sahnenin cümlesi, veri sentetik olduğu için dürüstçe uyarlandı (DECISIONS.md).
 */
export interface Scene {
  key: string;
  index: number;
  title: string;
  screen: string;
  note: string;
  /** "şimdi ne diyeceğim" — konuşmacıya kısa ipucu */
  cue: string;
  speaker: string;
  targetSec: number;
}

export const SCENES: Scene[] = [
  {
    key: "1",
    index: 0,
    title: "Mehmet Amca",
    screen: "Tek ekran hikâye: harita + parsel + takvim",
    note: "Siverek'te 80 dönüm kıraç buğday. Kuraklık Nisan'da, para Eylül'de.",
    cue: "Bir rakamla değil, bir insanla aç. Karakter kurgu; kuraklık gerçek (TZOB, Mayıs 2025).",
    speaker: "Ferhat",
    targetSec: 45,
  },
  {
    key: "2",
    index: 1,
    title: "Bugün nasıl ödeniyor",
    screen: "İki zaman çizelgesi yan yana (köy ortalaması vs AgriShield)",
    note: "Köy ortalaması iyiyse hiç ödenmiyor.",
    cue: "TARSİM'in başvurusuz köy bazlı ürünü var — farkımız parsel ve zaman.",
    speaker: "Ferhat",
    targetSec: 75,
  },
  {
    key: "3",
    index: 2,
    title: "Üç tanık",
    screen: "Üç kart + 2/3 kuralı animasyonu",
    note: "Uydu, yer istasyonu, resmi meteoroloji. İkisi yeterli.",
    cue: "Tanıklara tıkla: 2 EVET → ÖDE, 1 → GRİ BÖLGE, 0 → ÖDEME YOK. Yapay zekâ tanık değil, hakem.",
    speaker: "Bedirhan",
    targetSec: 90,
  },
  {
    key: "4",
    index: 3,
    title: "3D saha",
    screen: "Simülatör, preset 1 → 2",
    note: "Bu, kurduğumuz istasyonun dijital ikizi.",
    cue: "Güneş paneli → LoRa → yağış ölçer → toprak probları. Rüzgâr gerçek veriyle eser.",
    speaker: "Ferhat",
    targetSec: 120,
  },
  {
    key: "5",
    index: 4,
    title: "Jüri testi (canlı donanım)",
    screen: "3D preset 3 (toprak kesiti) + canlı nem grafiği",
    note: "Sayın jüri, sensörü kuru toprağa koyar mısınız?",
    cue: "2 saniye içinde toprak profili ve yer tanığı değişir. Gecikmeyi ekranda göster.",
    speaker: "Ferhat",
    targetSec: 70,
  },
  {
    key: "6",
    index: 5,
    title: "Zaman makinesi",
    screen: "NDVI grafiği + tarih akışı (2026 Mart → Mayıs)",
    note: "Bu, örnek bir kuraklık sezonu. Nisan sonunda NDVI normalin %35 altına iniyor.",
    cue: "Space ile oynat. Meteoroloji Nisan başında, istasyon ve uydu 28 Nisan'da EVET der. (Veri sentetik — 'gerçek uydu verisi' deme.)",
    speaker: "Aleyna",
    targetSec: 50,
  },
  {
    key: "7",
    index: 6,
    title: "Karar",
    screen: "Oylama halkası → ÖDE + zincir bloğu + txHash",
    note: "Üç tanıktan üçü evet. Sözleşme kaydı attı.",
    cue: "İtiraz penceresi 5 sn: 'otomatik ama kontrolsüz değil'. Blok mührü = kanıtın parmak izi.",
    speaker: "Yakup",
    targetSec: 40,
  },
  {
    key: "8",
    index: 7,
    title: "Ödeme",
    screen: "Ödeme talimatı kartı + telefon SMS + kanıt QR",
    note: "Para FAST ile IBAN'a. Kripto yok; mevzuata uygun.",
    cue: "Ödeme ve SMS simülasyon — rozet ekranda. Jüriye QR'ı okut: kanıt sayfası.",
    speaker: "Yakup",
    targetSec: 40,
  },
  {
    key: "9",
    index: 8,
    title: "Manipülasyon testi",
    screen: "Sensör ıslatılır → şüpheli bayrak → 1/3 → GRİ BÖLGE",
    note: "Çiftçi sensörü sularsa sistem ödemez, eksper devreye girer.",
    cue: "Space ile oynat: 16 Nisan'da yağışsız nem sıçraması → istasyon devre dışı → tek tanık → eksper.",
    speaker: "Ferhat",
    targetSec: 60,
  },
  {
    key: "0",
    index: 9,
    title: "Ticari",
    screen: "Gelir modeli + prim hesaplayıcı + SOM",
    note: "Çiftçiden değil, sigortacıdan parsel başı ücret.",
    cue: "Prim = beklenen hasar + pay. Tetik olasılığı ERA5 backtest'ten (üst yaklaşım).",
    speaker: "Bedirhan",
    targetSec: 120,
  },
];

export const TALK_SECONDS = 15 * 60;

export function sceneByKey(k: string): Scene | undefined {
  return SCENES.find((s) => s.key === k);
}
