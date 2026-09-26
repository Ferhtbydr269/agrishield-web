import { addDays, inMonthDayRange } from "@/lib/dates";
import type { Crop, PhenologyWindow } from "./types";

/**
 * Fenoloji penceresi — kuraklık her dönemde aynı zararı vermez.
 * Kıraç buğday (AGRISHIELD_PROMPT.md 8.2):
 *   Çıkış–kardeşlenme      15 Kas – 15 Şub   0,4
 *   Sapa kalkma            15 Şub – 31 Mar   0,8
 *   Başaklanma–tane dolumu  1 Nis – 20 May   1,0 (kritik)
 *   Olgunlaşma–hasat       20 May – 30 Haz   0,2 (NDVI düşüşü normaldir, tetik kapalı)
 * Kırmızı mercimek: pencere ~10 gün öne alınır. Arpa: ~7 gün öne alınır (buğdaydan erken olgunlaşır).
 * Efektif NDVI eşiği = −0,25 / ağırlık (ağırlık düşükse daha sert düşüş gerekir).
 */

const WHEAT: PhenologyWindow[] = [
  { key: "ekim", label: "Ekim – çıkış öncesi", start: "10-01", end: "11-14", weight: 0, triggerEnabled: false },
  { key: "cikis_kardeslenme", label: "Çıkış–kardeşlenme", start: "11-15", end: "02-14", weight: 0.4, triggerEnabled: true },
  { key: "sapa_kalkma", label: "Sapa kalkma", start: "02-15", end: "03-31", weight: 0.8, triggerEnabled: true },
  { key: "basaklanma", label: "Başaklanma–tane dolumu", start: "04-01", end: "05-20", weight: 1.0, triggerEnabled: true },
  { key: "olgunlasma", label: "Olgunlaşma–hasat", start: "05-21", end: "06-30", weight: 0.2, triggerEnabled: false },
];

function shiftWindows(ws: PhenologyWindow[], days: number): PhenologyWindow[] {
  const shift = (md: string) => addDays(`2001-${md}`, -days).slice(5);
  return ws.map((w) => ({ ...w, start: shift(w.start), end: shift(w.end) }));
}

export const PHENOLOGY: Record<Crop, PhenologyWindow[]> = {
  bugday: WHEAT,
  kirmizi_mercimek: shiftWindows(WHEAT, 10),
  arpa: shiftWindows(WHEAT, 7),
};

const OFF_SEASON: PhenologyWindow = {
  key: "sezon_disi",
  label: "Sezon dışı",
  start: "07-01",
  end: "09-30",
  weight: 0,
  triggerEnabled: false,
};

export function getWindow(crop: Crop, isoDate: string): PhenologyWindow {
  const ws = PHENOLOGY[crop];
  return ws.find((w) => inMonthDayRange(isoDate, w.start, w.end)) ?? OFF_SEASON;
}

/** Efektif NDVI eşiği: −0,25 / ağırlık. Ağırlık 0 ise −∞ (tetik yok). */
export function effectiveNdviThreshold(base: number, weight: number): number {
  if (weight <= 0) return -Infinity;
  return base / weight;
}

/** Kritik (son tetik açık) pencerenin bitiş tarihi, verilen sezon yılı için. */
export function lastTriggerWindowEnd(crop: Crop, seasonEndYear: number): string {
  const ws = PHENOLOGY[crop].filter((w) => w.triggerEnabled);
  const last = ws[ws.length - 1];
  return `${seasonEndYear}-${last.end}`;
}

/** Kritik dönemin (başaklanma–tane dolumu) son günü, "MM-DD" */
export function criticalWindowEnd(crop: Crop): string {
  return PHENOLOGY[crop].find((w) => w.key === "basaklanma")!.end;
}

export function phenologyTable(crop: Crop) {
  return PHENOLOGY[crop].filter((w) => w.key !== "ekim");
}
