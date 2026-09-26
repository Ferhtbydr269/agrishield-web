import type { ParcelInfo } from "@/engine/types";

/**
 * Seed parselleri — takma adlı (P-1182 gibi), kişisel veri YOK.
 * "Mehmet Amca" kurgu bir karakterdir ve ekranda "örnek senaryo" notuyla geçer.
 */
export const PARCELS: (ParcelInfo & { role: string; story?: string; policy: { sumInsuredTl: number; payoutRate: number; subsidyRate: number } })[] = [
  {
    id: "P-1182",
    name: "Siverek / Karakoyun mevkii",
    village: "Karakoyun",
    district: "Siverek",
    crop: "bugday",
    areaDonum: 80,
    soilType: "killi",
    irrigated: false,
    role: "Kuraklık senaryosu — 3/3 EVET",
    story: "Mehmet Amca (örnek senaryo): 80 dönüm kıraç buğday",
    policy: { sumInsuredTl: 100_000, payoutRate: 0.5, subsidyRate: 0.7 },
  },
  {
    id: "P-1207",
    name: "Siverek / Karakoyun kuzeydoğu",
    village: "Karakoyun",
    district: "Siverek",
    crop: "kirmizi_mercimek",
    areaDonum: 45,
    soilType: "tinli",
    irrigated: false,
    role: "Gri bölge — 1/3 EVET, eksper",
    policy: { sumInsuredTl: 60_000, payoutRate: 0.5, subsidyRate: 0.7 },
  },
  {
    id: "P-1244",
    name: "Siverek / Karakoyun kuzeybatı",
    village: "Karakoyun",
    district: "Siverek",
    crop: "bugday",
    areaDonum: 120,
    soilType: "tinli",
    irrigated: true,
    role: "Sağlıklı — 0/3, ödeme yok",
    policy: { sumInsuredTl: 150_000, payoutRate: 0.5, subsidyRate: 0.5 },
  },
];

export const STATION = {
  id: "IST-SVK-01",
  village: "Karakoyun",
  /** P-1182'nin kuzey kenarında, tarla yolunun başında (tarafsız nokta) */
  note: "Kooperatif/sigortacı istasyonu — çiftçinin kontrolünde değil, kilitli, kurcalama sensörlü.",
};

export const VILLAGE = { name: "Karakoyun (örnek köy)", district: "Siverek", province: "Şanlıurfa" };

export function getParcel(id: string) {
  return PARCELS.find((p) => p.id === id) ?? null;
}

/** NDVI "normal aralık" eğrisi tipi */
export function curveKind(p: ParcelInfo): "kirac_bugday" | "mercimek" | "sulu_bugday" {
  if (p.crop === "kirmizi_mercimek") return "mercimek";
  return p.irrigated ? "sulu_bugday" : "kirac_bugday";
}
