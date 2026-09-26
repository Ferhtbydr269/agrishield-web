/**
 * Bölüm metinleri — AGRISHIELD_PROMPT.md Bölüm 14.1'den BİREBİR alındı (kaynak kontrolünden geçti).
 * Buradaki metinleri değiştirmeden önce takım rehberiyle karşılaştırın.
 */
export const COPY = {
  hero: {
    eyebrow: "TEKNOFEST 2026 · Finansal Teknolojiler · AlgoVest",
    title: "Kuraklık Nisan'da olur. Para da Nisan'da gelmeli.",
    subtitle:
      "AgriShield, tarlayı uzaydan ve yerden izler; kuraklık gerçekten yaşandığında kimse başvurmadan, kanıtıyla birlikte çiftçinin hesabına parayı yatırır.",
    ctaDemo: "Canlı demoyu başlat",
    ctaField: "3D sahayı gez",
    ctaProof: "Kanıt sayfası örneği",
  },
  problem: {
    title: "Problem",
    body: "Türkiye'de kuraklık sigortası bugün köy ortalamasına göre ve hasattan sonra ödüyor. Tarlası kuruyan çiftçi ya çok geç alıyor ya da köy ortalaması iyi diye hiç alamıyor.",
    bodyEmphasis: ["köy ortalamasına", "hasattan sonra"],
  },
  solution: {
    title: "Çözüm",
    body: "Zararı değil, zarara sebep olan olayı ölçüyoruz. Üç bağımsız tanıktan ikisi kuraklığı doğrularsa ödeme otomatik. Tek tanık doğrularsa vaka eksper incelemesine gider.",
  },
  product: {
    title: "Ürün",
    aiReferee:
      "Yapay zekâ tanık değil, hakem: eşiği ürüne ve döneme göre ayarlar, primi hesaplar, çiftçiyi önceden uyarır, şüpheli veriyi işaretler.",
    steps: [
      { key: "olc", label: "Ölç", detail: "uydu · istasyon · MGM" },
      { key: "topla", label: "Topla", detail: "LoRa → internet" },
      { key: "anla", label: "Anla", detail: "yapay zekâ skorlar" },
      { key: "dogrula", label: "Doğrula", detail: "3 tanıktan ≥2 EVET" },
      { key: "karar", label: "Karar", detail: "akıllı sözleşme" },
      { key: "ode", label: "Öde", detail: "FAST ile IBAN'a" },
    ],
  },
  blockchainCard:
    "Blokzinciri parayı taşımak için değil, kuralı ve kanıtı korumak için kullanıyoruz. Çiftçi, sigortacı, devlet ve reasürör aynı kurallara ve aynı kanıtlara bakar; kimse sonradan değiştiremez.",
  paymentCard:
    "Para TL olarak, FAST ile çiftçinin kayıtlı IBAN'ına gider. Ödemelerde kripto varlık kullanımı Türkiye'de yasaktır (TCMB yönetmeliği, 16.04.2021). Dijital TL yaygınlaştığında ödeme servisimiz doğrudan ona bağlanabilir.",
  commercial: {
    title: "Ticari",
    body: "Çiftçiden para almıyoruz. TARSİM ve havuz şirketlerinden parsel başı sezonluk izleme ücreti alıyoruz (örnek: ₺50, ortalama bitkisel primin ~%1'i).",
  },
  roadmap: {
    title: "Yol haritası",
    body: "Faz 1 eksper asistanı + gölge mod pilot (regülasyon değişikliği gerekmez) → Faz 2 parsel verim ölçüm motoru → Faz 3 otomatik parametrik ödeme + Dijital TL.",
  },
  footnote:
    "Bu site bir prototiptir. Ödeme, SMS ve (test ağı dışında) blokzincir adımları simülasyondur. Kurumlarla kurulmuş bir iş ortaklığı ima edilmez.",
  kvkk: "Kişisel veri içermez (KVKK). Zincirde ve bu sayfada yalnızca takma adlı parsel kimliği ve ölçüm/karar parmak izleri bulunur.",
  mehmetNote: "Mehmet Amca kurgu bir karakterdir; tutarlar ve parsel örnek senaryodur. Kuraklığın kendisi gerçektir (TZOB, Mayıs 2025).",
  syntheticNote:
    "Örnek veri: bu sezon serisi gerçekçi bir kuraklık senaryosuna göre üretildi (sentetik). Gerçek Sentinel-2 serisini çeken script repoda hazır.",
  sms: (parcel: string, amount: string, code: string, host: string) =>
    `AgriShield: Tarlanızda (${parcel}) kuraklık tespit edildi. ${amount} TL hesabınıza gönderildi. Kanıt: ${host}/k/${code}`,
  smsGrey: (parcel: string, code: string, host: string) =>
    `AgriShield: Tarlanız (${parcel}) için kuraklık sinyali alındı; vaka eksper incelemesine gönderildi. Durum: ${host}/k/${code}`,
  unknownAnswer:
    "Bu konuda doğrulanmış bilgimiz yok. Takıma sorun: pilot aşamasında ölçeceğimiz şeylerden biri olabilir.",
} as const;

export const TEAM = [
  {
    name: "Ferhat Baydır",
    role: "Saha, donanım, tarım",
    owns: "İstasyon, sensörler, LoRa, tarım bilgisi (kıraç, toprak tipi, fenoloji), hasar radarı",
    line: "Uydu her parselin gözü, istasyon köyün kulağı.",
    color: "soil",
  },
  {
    name: "Aleyna Tel",
    role: "Veri, uydu, yapay zekâ",
    owns: "NDVI/NDMI, Sentinel, veri kaynakları, model, metrikler, prim hesabı, basis risk",
    line: "Yapay zekâ tanık değil hakem: eşik, prim, erken uyarı.",
    color: "violet",
  },
  {
    name: "Yakup Bayram",
    role: "Blokzincir ve ödeme",
    owns: "Akıllı sözleşme, Polygon, oracle, güvenlik, TL ödeme, KVKK, Dijital TL",
    line: "Blokzinciri parayı taşımak için değil, kuralı ve kanıtı korumak için kullanıyoruz.",
    color: "chain",
  },
  {
    name: "Bedirhan Yalap",
    role: "İş, pazar, regülasyon",
    owns: "Konumlandırma, gelir modeli, pazar, rakipler, pilot, yol haritası, regülasyon",
    line: "TARSİM'in rakibi değil, parsel bazlı sigortanın altyapısıyız.",
    color: "wheat",
  },
] as const;
