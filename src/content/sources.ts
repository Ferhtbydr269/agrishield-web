/**
 * Doğrulanmış kaynaklar. Sitede görünen her rakamın kaynağı buradaki bir kayda bağlanır.
 * Kaynak: takım rehberi "Kaynaklar" bölümü (22 Eylül 2026) + AlgoVest hesaplamaları.
 */
export type SourceId =
  | "tarsim2024"
  | "tarsimKoyBazli"
  | "havuz2026"
  | "sabahTekirdag"
  | "milliyetCks"
  | "allied"
  | "alomaliyeDtl"
  | "sanliurfaGazetesi"
  | "copernicus"
  | "kriptoYonetmelik"
  | "turktob"
  | "era5"
  | "worldBank2011"
  | "lemonade"
  | "polygonBhilai"
  | "algovest";

export interface Source {
  id: SourceId;
  title: string;
  publisher: string;
  url: string;
  date?: string;
  note?: string;
}

export const SOURCES: Record<SourceId, Source> = {
  tarsim2024: {
    id: "tarsim2024",
    title: "TARSİM 2024 Faaliyet Raporu",
    publisher: "Tarım Sigortaları Havuzu (TARSİM)",
    url: "https://www.tarsim.gov.tr/staticweb/krm-web/dergi/faaliyet-raporlari/2024.pdf",
    date: "2025",
  },
  tarsimKoyBazli: {
    id: "tarsimKoyBazli",
    title: "Köy Bazlı Verim Sigortası",
    publisher: "TARSİM",
    url: "https://www.tarsim.gov.tr/subPage/koy-bazli-verim-sigortasi",
  },
  havuz2026: {
    id: "havuz2026",
    title: "Tarım Sigortaları Havuzu tarafından 2026 yılında kapsama alınacak riskler ve ürünler",
    publisher: "Alomaliye",
    url: "https://www.alomaliye.com/2026/01/01/tarim-sigortalari-havuzu-tarafindan-2026-yilinda-kapsama-alinacak-riskler-urunler/",
    date: "01.01.2026",
  },
  sabahTekirdag: {
    id: "sabahTekirdag",
    title: "Yeni nesil tarım sigortasında sigortalılık %80'in üzerine çıktı",
    publisher: "Sabah Tekirdağ",
    url: "https://www.sabah.com.tr/tekirdag/2026/08/24/tekirdagda-yeni-nesli-tarim-sigortasinda-sigortalilik-orani-yuzde-80in-uzerine-cikti",
    date: "24.08.2026",
  },
  milliyetCks: {
    id: "milliyetCks",
    title: "ÇKS'ye kayıtlı çiftçi sayısı 2 milyon 245 bin 526",
    publisher: "Milliyet (Tarım ve Orman Bakanı açıklaması)",
    url: "https://www.milliyet.com.tr/gundem/bakan-yumakli-cksye-kayitli-ciftci-sayisi-2-milyon-245-bin-526ya-yukseldi-7034223",
  },
  allied: {
    id: "allied",
    title: "Parametric Insurance Market to Reach $29.3 Bn by 2031",
    publisher: "Allied Market Research / PR Newswire",
    url: "https://www.prnewswire.com/news-releases/parametric-insurance-market-to-reach-29-3-bn-globally-by-2031-at-9-9-cagr-allied-market-research-301573879.html",
  },
  alomaliyeDtl: {
    id: "alomaliyeDtl",
    title: "Dijital Türk Lirasında 23 proje üçüncü aşamada",
    publisher: "Alomaliye (TCMB duyurusu)",
    url: "https://www.alomaliye.com/2026/08/03/dijital-turk-lirasinda-23-proje-ucuncu-asamada/",
    date: "03.08.2026",
  },
  sanliurfaGazetesi: {
    id: "sanliurfaGazetesi",
    title: "Şanlıurfa'da tarım felaketi: kuraklık üretimi vurdu (TZOB açıklaması)",
    publisher: "Şanlıurfa Gazetesi",
    url: "https://www.sanliurfagazetesi.com/sanliurfada-tarim-felaketi-kuraklik-uretimi-vurdu",
    date: "17.05.2025",
  },
  copernicus: {
    id: "copernicus",
    title: "Copernicus Data Space Ecosystem (Sentinel-1/2)",
    publisher: "Avrupa Birliği Copernicus Programı",
    url: "https://dataspace.copernicus.eu/",
  },
  kriptoYonetmelik: {
    id: "kriptoYonetmelik",
    title: "Ödemelerde Kripto Varlıkların Kullanılmamasına Dair Yönetmelik (RG 16.04.2021, 31456)",
    publisher: "TCMB / Resmî Gazete",
    url: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=38569&MevzuatTur=7&MevzuatTertip=5",
    date: "16.04.2021",
  },
  turktob: {
    id: "turktob",
    title: "Tarım ve orman alanları 1988–2024 (TÜİK verisi)",
    publisher: "TÜRKTOB",
    url: "https://www.turktob.org.tr/fs_/VERILER/BITKISEL_URETIM_VERILERI-URETIM_VERILERI_2024/8-TARIM_VE_ORMAN_ALANLARI_2024.pdf",
  },
  era5: {
    id: "era5",
    title: "ERA5 / ERA5-Land yeniden analiz verisi (Open-Meteo arşiv API'si ile)",
    publisher: "Copernicus İklim Değişikliği Servisi (ECMWF)",
    url: "https://open-meteo.com/en/docs/historical-weather-api",
    note: "Siverek (37,75°K 39,32°D) günlük serisi `npm run fetch:weather` ile indirildi; hesap AlgoVest'e ait.",
  },
  worldBank2011: {
    id: "worldBank2011",
    title: "Weather Index Insurance for Agriculture: Guidance for Development Practitioners",
    publisher: "World Bank (2011)",
    url: "https://farm-d.org/document/weather-index-insurance-for-agriculture-guidance-for-development-practitioners/",
  },
  lemonade: {
    id: "lemonade",
    title: "7,000 Kenyan farmers received insurance pay outs from Lemonade Crypto Climate Coalition",
    publisher: "Intelligent CIO Africa",
    url: "https://www.intelligentcio.com/africa/2023/05/30/7000-kenyan-farmers-received-insurance-pay-outs-from-lemonade-crypto-climate-coalition/",
    date: "30.05.2023",
  },
  polygonBhilai: {
    id: "polygonBhilai",
    title: "First milestone to Gigagas: 1000 TPS with Bhilai hardfork",
    publisher: "Polygon",
    url: "https://polygon.technology/blog/first-milestone-to-gigagas-1000-tps-with-bhilai-hardfork",
  },
  algovest: {
    id: "algovest",
    title: "AlgoVest hesaplaması / varsayımı",
    publisher: "AgriShield ekibi",
    url: "/kaynaklar#hesaplar",
    note: "Kamuya açık kaynaklardan türetilmiş hesap veya açıkça belirtilmiş varsayım.",
  },
};
