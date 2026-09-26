/**
 * 3D sahne yerleşimi — dünya koordinatları, 1 birim = 1 metre, +Z kuzey (AGRISHIELD_PROMPT.md 12.1).
 *   parseller 60×40 m'lik plakalar, aralarında 3 m tarla yolu
 *   istasyon (0, 0, 28) — P-1182'nin kuzey kenarında, tarafsız noktada
 *   köy/gateway (-60, 0, -40) · kamera başlangıç (46, 26, 52) → hedef (0, 2, 0)
 */
export type V3 = [number, number, number];

export interface ParcelLayout {
  id: string;
  /** köşe noktaları (x, z) — saat yönünün tersine */
  corners: [number, number][];
  center: [number, number];
  wheat: number;
}

export const PARCEL_LAYOUT: ParcelLayout[] = [
  // P-1182 (odak): iki sütunun altına yayılır, kuzey kenarı z=28
  { id: "P-1182", corners: [[-61.5, -12], [61.5, -12], [61.5, 26.5], [-61.5, 26.5]], center: [0, 7], wheat: 2400 },
  // P-1244 (kuzeybatı, sulu buğday)
  { id: "P-1244", corners: [[-61.5, 31], [-1.5, 31], [-1.5, 71], [-61.5, 71]], center: [-31.5, 51], wheat: 2100 },
  // P-1207 (kuzeydoğu, kırmızı mercimek)
  { id: "P-1207", corners: [[1.5, 31], [61.5, 31], [61.5, 71], [1.5, 71]], center: [31.5, 51], wheat: 2100 },
];

export const STATION_POS: V3 = [0, 0, 28];
export const VILLAGE_POS: V3 = [-60, 0, -40];
export const GATEWAY_POS: V3 = [-57, 9.4, -37];
export const CLOUD_API_POS: V3 = [-57, 60, -37];
export const FIELD_BOUNDS = { minX: -64, maxX: 64, minZ: -15, maxZ: 74 };

/** Toprak kesiti (kesit modunda zeminden çıkarılan dilim), istasyonun güneyinde */
export const CUT = { x0: -1.4, x1: 1.4, z0: 28.9, z1: 32.4, depth: 1.25 };
/** Kesitte düşey abartı: 60 cm → 1,2 m (etiketler gerçek derinliği gösterir) */
export const DEPTH_EXAG = 2;

export interface CameraPreset {
  key: number;
  label: string;
  position: V3;
  target: V3;
  minDistance: number;
}

export const PRESETS: CameraPreset[] = [
  { key: 1, label: "Tüm saha", position: [62, 58, 96], target: [0, 0, 22], minDistance: 6 },
  { key: 2, label: "İstasyon yakın plan", position: [3.4, 2.7, 33.2], target: [0, 1.75, 28], minDistance: 2.5 },
  { key: 3, label: "Toprak kesiti", position: [0.9, 1.75, 34.8], target: [0, -0.6, 29.3], minDistance: 2 },
  { key: 4, label: "Uydu görüşü", position: [0, 150, 98], target: [0, 0, 28], minDistance: 6 },
  { key: 5, label: "Veri akışı", position: [8, 62, 128], target: [4, 24, 16], minDistance: 6 },
  { key: 6, label: "Köy + gateway", position: [-18, 26, 14], target: [-58, 6, -38], minDistance: 6 },
];

export const START_CAMERA = { position: [46, 26, 52] as V3, target: [0, 2, 0] as V3 };
