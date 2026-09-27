"use client";
/**
 * 2B SAHA GÖRÜNÜMÜ — WebGL yoksa ya da fps 30'un altına düşerse. Aynı hotspot kartları, aynı veri:
 * istasyonun yan görünüşü (SVG), toprak profili (10/30/60 cm), parsellerin NDVI rengi, rüzgâr, yağış.
 */
import { useState } from "react";
import { Info } from "lucide-react";
import { ndviColor } from "@/components/ui/ParcelMap";
import { useDevice } from "@/store/device";
import { useLive } from "@/store/sim";
import { PartCard } from "./PartCard";
import { moistureColor } from "./Station";

const SPOTS: { id: string; x: number; y: number; name: string }[] = [
  { id: "H3", x: 318, y: 40, name: "LoRa anteni" },
  { id: "H5", x: 350, y: 72, name: "Anemometre" },
  { id: "H2", x: 238, y: 92, name: "Güneş paneli" },
  { id: "H4", x: 206, y: 150, name: "Yağış ölçer" },
  { id: "H6", x: 396, y: 178, name: "Radyasyon kalkanı" },
  { id: "H7", x: 318, y: 238, name: "Elektronik kutu" },
  { id: "H8", x: 336, y: 256, name: "Durum LED'i" },
  { id: "H10", x: 262, y: 300, name: "Batarya" },
  { id: "H1", x: 302, y: 320, name: "Direk" },
  { id: "H9", x: 470, y: 440, name: "Toprak nem probları" },
];

export function Fallback2D({ reason, height = 640, liveSoil = false, onRetry }: { reason: string; height?: number | string; liveSoil?: boolean; onRetry?: () => void }) {
  const [sel, setSel] = useState<string | null>(null);
  const sim = useLive((s) => s.sim);
  const dev = useDevice((s) => s.readings[s.readings.length - 1]);
  const st = sim?.station;
  const soil = liveSoil && dev?.soilMoisture != null ? { s10: dev.soilMoisture, s30: dev.soilMoisture, s60: dev.soilMoisture } : { s10: st?.soil10 ?? 22, s30: st?.soil30 ?? 25, s60: st?.soil60 ?? 28 };
  const col = (m: number) => `#${moistureColor(m).getHexString()}`;
  const layers = [
    { k: "s10", y: 380, h: 40, label: "0–10 cm", v: soil.s10 },
    { k: "s30", y: 420, h: 60, label: "10–30 cm", v: soil.s30 },
    { k: "s60", y: 480, h: 70, label: "30–60 cm", v: soil.s60 },
  ];
  const parcels = sim?.parcels ?? [];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface" style={{ height }} data-testid="field-2d">
      <div className="flex items-center gap-2 border-b border-line bg-wheat/10 px-4 py-2 text-sm text-wheat-fg" role="status">
        <Info className="size-4" aria-hidden /> 2B saha görünümü — {reason}. Aynı veri ve parça kartları.
        {onRetry && (
          <button type="button" onClick={onRetry} className="ml-auto rounded-full border border-wheat/60 px-3 py-0.5 text-xs font-semibold hover:bg-wheat/15">
            3D'yi yeniden dene
          </button>
        )}
      </div>
      <div className="relative mx-auto aspect-[800/560] max-h-[calc(100%-2.5rem)] max-w-full">
      <svg viewBox="0 0 800 560" className="size-full" role="img" aria-label="İstasyon ve toprak profili şeması">
        <rect x="0" y="0" width="800" height="370" fill="var(--surface-2)" />
        {/* parseller şeridi */}
        {parcels.map((p, i) => (
          <g key={p.id}>
            <rect x={20 + i * 150} y={330} width={140} height={40} fill={ndviColor(p.ndvi)} stroke="var(--line-strong)" />
            <text x={90 + i * 150} y={355} textAnchor="middle" fontSize="14" fontFamily="var(--font-mono)" fill="var(--bg)" fontWeight="700">
              {p.id}
            </text>
          </g>
        ))}
        {/* toprak profili */}
        {layers.map((l) => (
          <g key={l.k}>
            <rect x="0" y={l.y} width="800" height={l.h} fill={col(l.v)} />
            <text x="16" y={l.y + l.h / 2 + 5} fontSize="14" fontFamily="var(--font-mono)" fill="#fff">
              {l.label}
            </text>
            <rect x="430" y={l.y + l.h / 2 - 4} width="120" height="8" fill="#2b2f2d" />
            <text x="560" y={l.y + l.h / 2 + 5} fontSize="16" fontFamily="var(--font-mono)" fontWeight="700" fill={l.v < 18 ? "#e05a47" : "#fff"}>
              %{l.v.toFixed(1).replace(".", ",")}
            </text>
          </g>
        ))}
        {/* istasyon yan görünüş */}
        <rect x="296" y="30" width="10" height="340" fill="#aeb7b3" />
        <rect x="200" y="84" width="96" height="8" fill="#1b2e5a" transform="rotate(-25 248 88)" />
        <rect x="316" y="10" width="4" height="60" fill="#2b2f2d" />
        <circle cx="318" cy="10" r="5" fill="#e05a47" />
        <line x1="300" y1="72" x2="350" y2="72" stroke="#aeb7b3" strokeWidth="3" />
        <g>
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={350 + Math.cos((i * 2 * Math.PI) / 3) * 16} cy={66 + Math.sin((i * 2 * Math.PI) / 3) * 5} r="5" fill="#f2f7f3" />
          ))}
        </g>
        <line x1="210" y1="150" x2="298" y2="150" stroke="#aeb7b3" strokeWidth="3" />
        <path d="M 190 128 L 222 128 L 214 150 L 198 150 Z" fill="#dfe3dd" />
        <rect x="199" y="150" width="14" height="30" fill="#dfe3dd" />
        <line x1="306" y1="180" x2="390" y2="180" stroke="#aeb7b3" strokeWidth="3" />
        {Array.from({ length: 6 }, (_, i) => (
          <rect key={i} x="378" y={160 + i * 7} width="36" height="5" rx="2" fill="#f4f5f0" />
        ))}
        <rect x="290" y="220" width="44" height="34" rx="3" fill="#d8dcd6" />
        <circle cx="330" cy="248" r="4" fill={st?.flags.length ? "#f08a24" : "#2f9e6b"} />
        <rect x="246" y="292" width="30" height="18" fill="#39413c" />
        <path d="M 306 370 L 306 400 L 430 420" stroke="#1d1f1e" strokeWidth="3" fill="none" />
        {/* rüzgâr ve yağış bilgisi */}
        <text x="600" y="40" fontSize="15" fontFamily="var(--font-mono)" fill="var(--text-dim)">
          rüzgâr {st?.windMs?.toFixed(1).replace(".", ",") ?? "—"} m/s
        </text>
        <text x="600" y="64" fontSize="15" fontFamily="var(--font-mono)" fill="var(--text-dim)">
          bugün yağış {st?.rainToday.toFixed(1).replace(".", ",") ?? "0"} mm
        </text>
        <text x="600" y="88" fontSize="15" fontFamily="var(--font-mono)" fill="var(--text-dim)">
          {sim?.date ?? ""}
        </text>
      </svg>
      {SPOTS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => setSel(s.id)}
          className="absolute -translate-x-1/2 -translate-y-1/2 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full border border-wheat/60 bg-bg/85 px-1.5 py-0.5 font-mono text-[11px] font-bold text-wheat-fg hover:bg-wheat hover:text-[#1a1305]"
          style={{ left: `${(s.x / 800) * 100}%`, top: `${(s.y / 560) * 100}%` }}
          aria-label={`${s.id}: ${s.name}`}
        >
          + {s.id}
        </button>
      ))}
      </div>
      <PartCard id={sel} onClose={() => setSel(null)} />
    </div>
  );
}
