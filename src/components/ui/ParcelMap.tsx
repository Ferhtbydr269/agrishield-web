"use client";
/**
 * Parsel haritası — yerel GeoJSON'dan kendi çizdiğimiz SVG (uzaktan harita karosu YOK, internetsiz).
 * Parseller NDVI'ye göre renklenir (kahve → yeşil), istasyon ve köy/gateway işaretlidir.
 */
import geo from "@data/parcels.json";
import { useMemo } from "react";
import { cn } from "./cn";

type Pt = [number, number];
interface Feature {
  properties: { id: string; kind: string; name?: string; crop?: string; areaDonum?: number };
  geometry: { type: string; coordinates: unknown };
}

const FEATURES = (geo as unknown as { features: Feature[] }).features;

export function ndviColor(ndvi: number | null | undefined): string {
  if (ndvi == null) return "var(--surface-2)";
  const t = Math.max(0, Math.min(1, (ndvi - 0.15) / (0.65 - 0.15)));
  // #8A5D06 → #2F9E6B
  const a = [0x8a, 0x5d, 0x06];
  const b = [0x2f, 0x9e, 0x6b];
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]} ${c[1]} ${c[2]})`;
}

export function ParcelMap({
  ndvi = {},
  focus,
  highlight,
  showVillage = false,
  labels = true,
  className,
  onSelect,
  stage = false,
}: {
  ndvi?: Record<string, number | null>;
  focus?: string;
  highlight?: string | null;
  showVillage?: boolean;
  labels?: boolean;
  className?: string;
  onSelect?: (id: string) => void;
  stage?: boolean;
}) {
  const { polys, station, village, gateway, toXY, view } = useMemo(() => {
    const parcels = FEATURES.filter((f) => f.properties.kind === "parcel");
    const all: Pt[] = parcels.flatMap((f) => (f.geometry.coordinates as Pt[][])[0]);
    const st = FEATURES.find((f) => f.properties.kind === "station");
    const vi = FEATURES.find((f) => f.properties.kind === "village");
    const gw = FEATURES.find((f) => f.properties.kind === "gateway");
    const pts = [...all, ...(showVillage && vi ? [vi.geometry.coordinates as Pt] : [])];
    const lat0 = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const kx = Math.cos((lat0 * Math.PI) / 180);
    const xs = pts.map((p) => p[0] * kx);
    const ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const padF = 0.08;
    const w = maxX - minX;
    const h = maxY - minY;
    const S = 1000 / Math.max(w, h);
    const toXY = (p: Pt): Pt => [((p[0] * kx - minX) + w * padF) * S, ((maxY - p[1]) + h * padF) * S];
    const view = { w: w * (1 + 2 * padF) * S, h: h * (1 + 2 * padF) * S };
    return {
      polys: parcels.map((f) => ({ id: f.properties.id, crop: f.properties.crop, area: f.properties.areaDonum, pts: (f.geometry.coordinates as Pt[][])[0].map(toXY) })),
      station: st ? toXY(st.geometry.coordinates as Pt) : null,
      village: vi && showVillage ? toXY(vi.geometry.coordinates as Pt) : null,
      gateway: gw && showVillage ? toXY(gw.geometry.coordinates as Pt) : null,
      toXY,
      view,
    };
  }, [showVillage]);
  void toXY;

  const fs = stage ? 30 : 24;
  return (
    <svg viewBox={`0 0 ${view.w} ${view.h}`} className={cn("w-full", className)} role="img" aria-label="Parsel haritası (örnek sınırlar)">
      <defs>
        <pattern id="rows" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
          <line x1="0" y1="0" x2="14" y2="0" stroke="#000" strokeWidth="2" opacity="0.14" />
        </pattern>
      </defs>
      {polys.map((p) => {
        const d = `M ${p.pts.map((q) => q.join(",")).join(" L ")} Z`;
        const cx = p.pts.slice(0, -1).reduce((s, q) => s + q[0], 0) / (p.pts.length - 1);
        const cy = p.pts.slice(0, -1).reduce((s, q) => s + q[1], 0) / (p.pts.length - 1);
        const isFocus = p.id === (highlight ?? focus);
        return (
          <g key={p.id} onClick={onSelect ? () => onSelect(p.id) : undefined} className={onSelect ? "cursor-pointer" : undefined}>
            <path d={d} fill={ndviColor(ndvi[p.id])} style={{ transition: "fill 420ms cubic-bezier(.2,.8,.2,1)" }} />
            <path d={d} fill="url(#rows)" />
            <path d={d} fill="none" stroke={isFocus ? "var(--wheat)" : "var(--line-strong)"} strokeWidth={isFocus ? 6 : 2.5} />
            {labels && (
              <g>
                <rect x={cx - 70} y={cy - fs * 0.95} width={140} height={fs * 1.35} rx={8} fill="var(--bg)" opacity="0.82" />
                <text x={cx} y={cy + fs * 0.05} textAnchor="middle" fontSize={fs} fontFamily="var(--font-mono)" fontWeight="700" fill={isFocus ? "var(--wheat-fg)" : "var(--text)"}>
                  {p.id}
                </text>
              </g>
            )}
          </g>
        );
      })}
      {station && (
        <g>
          <circle cx={station[0]} cy={station[1]} r={stage ? 16 : 13} fill="var(--soil)" stroke="var(--bg)" strokeWidth="4" />
          <circle cx={station[0]} cy={station[1]} r={stage ? 30 : 24} fill="none" stroke="var(--soil)" strokeWidth="2" opacity="0.6" className="pulse-dot" />
        </g>
      )}
      {village && (
        <g>
          <rect x={village[0] - 16} y={village[1] - 16} width={32} height={32} rx={6} fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth="3" />
          <text x={village[0] + 26} y={village[1] + 8} fontSize={fs * 0.9} fill="var(--text-dim)" fontFamily="var(--font-mono)">
            köy · gateway
          </text>
        </g>
      )}
      {gateway && station && <line x1={gateway[0]} y1={gateway[1]} x2={station[0]} y2={station[1]} stroke="var(--sky)" strokeWidth="2.5" strokeDasharray="8 10" opacity="0.7" />}
    </svg>
  );
}
