import { SOURCES, type SourceId } from "./sources";

/**
 * TEK GERÇEK KAYNAĞI. Sitede görünen her rakam buradan gelir (<Stat factId="..." />).
 * Kural: bu dosyada olmayan bir rakamı ekranda gösterme. Eksik veri → value: null →
 * arayüzde "veri bekleniyor" rozeti.
 *
 * kind:
 *  - "resmi"    : kurum raporu / resmi açıklama / haber kaynağı
 *  - "hesap"    : kamuya açık veriden AlgoVest'in yaptığı hesap (formül `derivation` alanında)
 *  - "varsayim" : açıkça varsayım olan değer (ekranda "varsayım" diye etiketlenir)
 */
export type FactKind = "resmi" | "hesap" | "varsayim";

export interface Fact {
  id: string;
  label: string;
  value: number | null;
  unit: string;
  /** değerin önüne gelecek kısa ek, ör. "₺" */
  prefix?: string;
  /** ondalık basamak sayısı (Türkçe biçimde gösterilir) */
  decimals?: number;
  sourceId: SourceId;
  asOf: string;
  kind: FactKind;
  derivation?: string;
}

const f = (x: Fact) => x;

export const FACTS = {
  tarsimBitkiselPrim2024: f({
    id: "tarsimBitkiselPrim2024",
    label: "Bitkisel ürün primi (2024)",
    value: 15.02,
    decimals: 2,
    prefix: "₺",
    unit: "milyar",
    sourceId: "tarsim2024",
    asOf: "2024",
    kind: "resmi",
  }),
  tarsimToplamPrim2024: f({
    id: "tarsimToplamPrim2024",
    label: "Toplam prim, tüm branşlar (2024)",
    value: 27.23,
    decimals: 2,
    prefix: "₺",
    unit: "milyar",
    sourceId: "tarsim2024",
    asOf: "2024",
    kind: "resmi",
  }),
  tarsimBitkiselPolice2024: f({
    id: "tarsimBitkiselPolice2024",
    label: "Bitkisel ürün poliçesi (2024)",
    value: 2697381,
    unit: "poliçe",
    sourceId: "tarsim2024",
    asOf: "2024",
    kind: "resmi",
  }),
  tarsimTazminat2024: f({
    id: "tarsimTazminat2024",
    label: "Bitkisel tazminat (2024, +%30,9)",
    value: 6.64,
    decimals: 2,
    prefix: "₺",
    unit: "milyar",
    sourceId: "tarsim2024",
    asOf: "2024",
    kind: "resmi",
  }),
  hasarIhbari2024: f({
    id: "hasarIhbari2024",
    label: "Hasar ihbarı (2024) — her birine eksper gitmeli",
    value: 471000,
    unit: "ihbar",
    sourceId: "tarsim2024",
    asOf: "2024",
    kind: "resmi",
  }),
  doluPayi2024: f({
    id: "doluPayi2024",
    label: "Bitkisel hasarların dolu payı (2024)",
    value: 54.6,
    decimals: 1,
    prefix: "%",
    unit: "",
    sourceId: "tarsim2024",
    asOf: "2024",
    kind: "resmi",
  }),
  sigortaliUretici2024: f({
    id: "sigortaliUretici2024",
    label: "Sigortalı üretici/işletme (2024)",
    value: 866000,
    unit: "üretici/işletme",
    sourceId: "tarsim2024",
    asOf: "2024",
    kind: "resmi",
  }),
  sigortaliAlan2024: f({
    id: "sigortaliAlan2024",
    label: "Sigortalı alan (2024)",
    value: 35.6,
    decimals: 1,
    unit: "milyon dekar",
    sourceId: "tarsim2024",
    asOf: "2024",
    kind: "resmi",
  }),
  sigortaliAlanOrani: f({
    id: "sigortaliAlanOrani",
    label: "İşlenen tarım alanının sigortalı payı (≈ her 7 dekardan 1'i)",
    value: 15,
    prefix: "≈%",
    unit: "",
    sourceId: "turktob",
    asOf: "2024",
    kind: "hesap",
    derivation: "35,6 milyon dekar sigortalı alan (TARSİM 2024) ÷ ~240 milyon dekar işlenen tarım alanı (TÜİK/TÜRKTOB 2024) ≈ %15",
  }),
  ciftciSayisiCKS: f({
    id: "ciftciSayisiCKS",
    label: "ÇKS'ye kayıtlı çiftçi",
    value: 2.25,
    decimals: 2,
    unit: "milyon",
    sourceId: "milliyetCks",
    asOf: "2025",
    kind: "resmi",
  }),
  koyBazliOdemeSuresi: f({
    id: "koyBazliOdemeSuresi",
    label: "Köy verimi açıklandıktan sonra ödeme (en geç)",
    value: 30,
    prefix: "≤",
    unit: "gün",
    sourceId: "tarsimKoyBazli",
    asOf: "2026",
    kind: "resmi",
  }),
  koyBazliUrunSayisi: f({
    id: "koyBazliUrunSayisi",
    label: "Köy bazlı kuraklık verim sigortasındaki kuru tarım ürünü",
    value: 9,
    unit: "ürün",
    sourceId: "tarsimKoyBazli",
    asOf: "2026",
    kind: "resmi",
  }),
  koyBazliDestek: f({
    id: "koyBazliDestek",
    label: "Köy bazlı üründe devlet prim desteği",
    value: 70,
    prefix: "%",
    unit: "",
    sourceId: "havuz2026",
    asOf: "2026",
    kind: "resmi",
  }),
  tekirdagPilotKatilim: f({
    id: "tekirdagPilotKatilim",
    label: "Tekirdağ parsel bazlı pilotta sigortalılık (2026)",
    value: 80,
    prefix: "%",
    unit: "+",
    sourceId: "sabahTekirdag",
    asOf: "24.08.2026",
    kind: "resmi",
  }),
  parametrikPazar2031: f({
    id: "parametrikPazar2031",
    label: "Global parametrik sigorta pazarı (2031 tahmini)",
    value: 29.3,
    decimals: 1,
    prefix: "$",
    unit: "milyar",
    sourceId: "allied",
    asOf: "2031 tahmini",
    kind: "resmi",
  }),
  dijitalTLUcuncuAsama: f({
    id: "dijitalTLUcuncuAsama",
    label: "Dijital TL 3. aşamadaki proje (Ağu 2026)",
    value: 23,
    unit: "proje",
    sourceId: "alomaliyeDtl",
    asOf: "Ağu 2026",
    kind: "resmi",
  }),
  dijitalTLBasvuru: f({
    id: "dijitalTLBasvuru",
    label: "Dijital TL ekosistem çağrısına başvuru",
    value: 85,
    unit: "başvuru",
    sourceId: "alomaliyeDtl",
    asOf: "Ağu 2026",
    kind: "resmi",
  }),
  dijitalTLProgramlanabilir: f({
    id: "dijitalTLProgramlanabilir",
    label: "3. aşamada programlanabilir ödeme projesi",
    value: 17,
    unit: "proje",
    sourceId: "alomaliyeDtl",
    asOf: "Ağu 2026",
    kind: "resmi",
  }),
  sanliurfaKayip2025: f({
    id: "sanliurfaKayip2025",
    label: "Şanlıurfa kuru tarımda kayıp (Mayıs 2025, TZOB)",
    value: 100,
    prefix: "%",
    unit: "'e varan",
    sourceId: "sanliurfaGazetesi",
    asOf: "17.05.2025",
    kind: "resmi",
  }),
  sentinel2Cozunurluk: f({
    id: "sentinel2Cozunurluk",
    label: "Sentinel-2 çözünürlük",
    value: 10,
    unit: "m",
    sourceId: "copernicus",
    asOf: "2026",
    kind: "resmi",
  }),
  sentinel2Gecis: f({
    id: "sentinel2Gecis",
    label: "Sentinel-2 geçiş sıklığı",
    value: 5,
    prefix: "~",
    unit: "gün",
    sourceId: "copernicus",
    asOf: "2026",
    kind: "resmi",
  }),
  ortalamaBitkiselPrim: f({
    id: "ortalamaBitkiselPrim",
    label: "Ortalama bitkisel poliçe primi (2024)",
    value: 5570,
    prefix: "≈₺",
    unit: "",
    sourceId: "tarsim2024",
    asOf: "2024",
    kind: "hesap",
    derivation: "₺15,02 milyar bitkisel prim ÷ 2.697.381 bitkisel poliçe ≈ ₺5.570",
  }),
  izlemeUcreti: f({
    id: "izlemeUcreti",
    label: "Parsel başı sezonluk izleme ücreti (örnek)",
    value: 50,
    prefix: "₺",
    unit: "",
    sourceId: "algovest",
    asOf: "2026",
    kind: "varsayim",
    derivation: "Ortalama bitkisel primin ~%1'i; takım varsayımı, pilotta netleşecek.",
  }),
  samYillik: f({
    id: "samYillik",
    label: "SAM: tüm bitkisel poliçelere parsel izleme (yıllık)",
    value: 135,
    prefix: "~₺",
    unit: "milyon/yıl",
    sourceId: "algovest",
    asOf: "2024 verisiyle",
    kind: "hesap",
    derivation: "2,70 milyon bitkisel poliçe × ₺50 izleme ücreti ≈ ₺135 milyon/yıl (veri/API gelirleri hariç)",
  }),
  somAlt: f({
    id: "somAlt",
    label: "SOM alt sınır (ilk 3 yıl, poliçelerin %2'si)",
    value: 2.7,
    decimals: 1,
    prefix: "~₺",
    unit: "milyon/yıl",
    sourceId: "algovest",
    asOf: "2024 verisiyle",
    kind: "hesap",
    derivation: "54 bin poliçe (%2) × ₺50 ≈ ₺2,7 milyon/yıl",
  }),
  somUst: f({
    id: "somUst",
    label: "SOM üst sınır (ilk 3 yıl, poliçelerin %5'i)",
    value: 6.8,
    decimals: 1,
    prefix: "~₺",
    unit: "milyon/yıl",
    sourceId: "algovest",
    asOf: "2024 verisiyle",
    kind: "hesap",
    derivation: "135 bin poliçe (%5) × ₺50 ≈ ₺6,8 milyon/yıl",
  }),
  istasyonParselBasi: f({
    id: "istasyonParselBasi",
    label: "Köy istasyonu + gateway payı, parsel başı donanım (150 parsellik köy)",
    value: 8,
    prefix: "~$",
    unit: "",
    sourceId: "algovest",
    asOf: "2026",
    kind: "varsayim",
    derivation: "1 istasyon ~$500–1.000 + gateway payı ~$100–200 ≈ $1.200 ÷ 150 parsel ≈ $8 (yaklaşık; gerçek teklif alınacak)",
  }),
  tarlaBasiSensor: f({
    id: "tarlaBasiSensor",
    label: "Tarla başı sensör paketi, parsel başı (eski model)",
    value: 100,
    prefix: "~$",
    unit: "",
    sourceId: "algovest",
    asOf: "2026",
    kind: "varsayim",
    derivation: "Hobi parçalarıyla bile ~$80–150; saha dayanıklılığında daha fazla (yaklaşık)",
  }),
  zincirIhtiyacTps: f({
    id: "zincirIhtiyacTps",
    label: "1 milyon poliçe × günde 1 kayıt için gereken işlem hızı",
    value: 12,
    prefix: "~",
    unit: "işlem/sn",
    sourceId: "algovest",
    asOf: "2026",
    kind: "hesap",
    derivation: "1.000.000 kayıt ÷ 86.400 sn ≈ 11,6 işlem/sn; Merkle köküyle günde 1 işlem yeterli",
  }),
  /* ERA5 (gerçek veri) — `npm run fetch:weather` çıktısı (data/climate-siverek.json → summary).
     tests/facts.test.ts bu değerlerin veri dosyasıyla aynı olduğunu doğrular. */
  era5Sezon2025Yagis: f({
    id: "era5Sezon2025Yagis",
    label: "Siverek 2024–25 sezonu yağışı (Kas–Haz, ERA5)",
    value: 390,
    unit: "mm",
    sourceId: "era5",
    asOf: "2025",
    kind: "hesap",
    derivation: "ERA5 günlük yağış, 1 Kas 2024 – 30 Haz 2025 toplamı, 37,75°K 39,32°D",
  }),
  era5SezonNormal: f({
    id: "era5SezonNormal",
    label: "Siverek 30 sezon ortalaması (Kas–Haz, 1991/92–2020/21, ERA5)",
    value: 545,
    unit: "mm",
    sourceId: "era5",
    asOf: "1991–2021",
    kind: "hesap",
    derivation: "1991/92–2020/21 arası 30 sezonun Kas–Haz yağış toplamlarının ortalaması",
  }),
  era5Sezon2025Acik: f({
    id: "era5Sezon2025Acik",
    label: "2024–25 sezonunda normale göre yağış açığı (ERA5)",
    value: 28,
    prefix: "%",
    unit: "",
    sourceId: "era5",
    asOf: "2025",
    kind: "hesap",
    derivation: "1 − 390 / 545 ≈ %28",
  }),
  era5KurakSira: f({
    id: "era5KurakSira",
    label: "2024–25, son 35 sezonun en kurak 5 sezonundan biri (ERA5)",
    value: 5,
    unit: "/ 35",
    sourceId: "era5",
    asOf: "1991/92–2025/26",
    kind: "hesap",
    derivation: "35 sezonun Kas–Haz toplamları küçükten büyüğe sıralandığında 2024–25 beşinci (2013–14 ile eşit)",
  }),
  backtestTetikSezon: f({
    id: "backtestTetikSezon",
    label: "Geriye dönük testte iki yağış tanığının birlikte tetiklendiği sezon (ERA5, 35 sezon)",
    value: 7,
    unit: "/ 35 sezon",
    sourceId: "era5",
    asOf: "1991/92–2025/26",
    kind: "hesap",
    derivation:
      "Kritik dönemde (1 Nis–20 May) aynı gün hem meteoroloji tanığı (SPI-30 ≤ −1,5 veya yağış < %40 normal) hem 30 günlük yağış ≤ 10 mm. Tetiklenen: 1992, 1999, 2004, 2008, 2016, 2021, 2022. Uydu ve toprak nemi dahil değil → üst yaklaşım. (scripts/backtest.ts)",
  }),
  backtestTetikOlasiligi: f({
    id: "backtestTetikOlasiligi",
    label: "Tetik olasılığı — yağışa dayalı üst yaklaşım (ERA5 backtest)",
    value: 20,
    prefix: "≤%",
    unit: "",
    sourceId: "era5",
    asOf: "1991/92–2025/26",
    kind: "hesap",
    derivation: "7 / 35 sezon = %20. Uydu ve istasyon toprak nemi koşulu eklendiğinde oran düşer; pilotta gerçek verimle doğrulanacak.",
  }),
} satisfies Record<string, Fact>;

export type FactId = keyof typeof FACTS;

export function getFact(id: FactId): Fact {
  return FACTS[id];
}

export function factSource(fact: Fact) {
  return SOURCES[fact.sourceId];
}

const nf = (decimals = 0) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** Türkçe biçimli değer (ön ek + sayı), birimsiz. Null ise null. */
export function formatFactValue(fact: Fact): string | null {
  if (fact.value === null) return null;
  return `${fact.prefix ?? ""}${nf(fact.decimals ?? 0).format(fact.value)}`;
}

export function formatFact(fact: Fact): string {
  const v = formatFactValue(fact);
  if (v === null) return "veri bekleniyor";
  return fact.unit ? `${v} ${fact.unit}`.replace(" '", "'").replace(" +", "+") : v;
}
