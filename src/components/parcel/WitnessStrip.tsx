"use client";
/** Sezon boyunca gün gün üç tanığın kararı + EVET sayısı + fenoloji dönemleri (kendi SVG'miz). */
import { useRef, useState } from "react";
import type { TimelinePoint } from "@/sim/evaluate";
import { formatDateTR, TR_MONTHS_SHORT } from "@/lib/dates";

interface Phase {
  key: string;
  label: string;
  weight: number;
  triggerEnabled: boolean;
}

const ROWS = [
  { key: "sat", label: "Uydu" },
  { key: "station", label: "İstasyon" },
  { key: "meteo", label: "Meteoroloji" },
] as const;

const FILL: Record<string, string> = { EVET: "var(--green)", HAYIR: "var(--surface-2)", VERI_YOK: "var(--wheat)" };
const PHASE_FILL: Record<string, string> = {
  cikis_kardeslenme: "var(--green-dim)",
  sapa_kalkma: "var(--green)",
  basaklanma: "var(--wheat)",
  olgunlasma: "var(--soil)",
  sezon_disi: "var(--line)",
};

export function WitnessStrip({
  timeline,
  phenology,
  selected,
  onSelect,
  decisionDate,
  liveDate,
}: {
  timeline: TimelinePoint[];
  phenology: Phase[];
  selected: string;
  onSelect: (d: string) => void;
  decisionDate: string | null;
  liveDate: string | null;
}) {
  const W = 800;
  const L = 86;
  const n = timeline.length;
  const cw = (W - L) / n;
  const rowH = 16;
  const top = 22;
  const yesTop = top + 3 * (rowH + 4) + 6;
  const yesH = 26;
  const H = yesTop + yesH + 20;
  const idx = (d: string | null) => (d ? timeline.findIndex((p) => p.date === d) : -1);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const pick = (clientX: number) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return null;
    const x = ((clientX - r.left) / r.width) * W;
    const i = Math.floor((x - L) / cw);
    return i >= 0 && i < n ? i : null;
  };

  // ay başları
  const months = timeline.map((p, i) => ({ p, i })).filter(({ p }) => p.date.endsWith("-01"));
  // dönem blokları
  const phases: { key: string; from: number; to: number }[] = [];
  timeline.forEach((p, i) => {
    const last = phases[phases.length - 1];
    if (last && last.key === p.window) last.to = i;
    else phases.push({ key: p.window, from: i, to: i });
  });
  const phaseLabel = (k: string) => phenology.find((w) => w.key === k)?.label ?? "Sezon dışı";
  const triggerOn = (k: string) => phenology.find((w) => w.key === k)?.triggerEnabled ?? false;
  const sel = idx(selected);
  const hv = hover != null ? timeline[hover] : null;

  return (
    <div className="relative mt-3">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-crosshair touch-none select-none"
        role="img"
        aria-label="Sezon boyunca tanık kararları"
        onPointerMove={(e) => setHover(pick(e.clientX))}
        onPointerLeave={() => setHover(null)}
        onPointerDown={(e) => {
          const i = pick(e.clientX);
          if (i != null) onSelect(timeline[i].date);
        }}
      >
        {/* dönem bandı */}
        {phases.map((ph) => (
          <g key={`${ph.key}-${ph.from}`}>
            <rect x={L + ph.from * cw} y={4} width={(ph.to - ph.from + 1) * cw} height={10} fill={PHASE_FILL[ph.key] ?? "var(--line)"} opacity={0.55} />
            {(ph.to - ph.from) * cw > 90 && (
              <text x={L + ph.from * cw + 4} y={12.5} fontSize={8.5} fill="var(--text)" opacity={0.85}>
                {phaseLabel(ph.key)}
              </text>
            )}
          </g>
        ))}
        <text x={0} y={12.5} fontSize={9} fill="var(--text-dim)">
          Dönem
        </text>

        {ROWS.map((r, ri) => {
          const y = top + ri * (rowH + 4);
          return (
            <g key={r.key}>
              <text x={0} y={y + 11.5} fontSize={10} fill="var(--text-dim)">
                {r.label}
              </text>
              {timeline.map((p, i) => (
                <rect key={p.date} x={L + i * cw} y={y} width={cw + 0.25} height={rowH} fill={FILL[p[r.key]] ?? "var(--line)"} opacity={p[r.key] === "VERI_YOK" ? 0.55 : 1} />
              ))}
            </g>
          );
        })}

        {/* EVET sayısı */}
        <text x={0} y={yesTop + 16} fontSize={10} fill="var(--text-dim)">
          EVET sayısı
        </text>
        <line x1={L} x2={W} y1={yesTop + yesH} y2={yesTop + yesH} stroke="var(--line)" />
        <line x1={L} x2={W} y1={yesTop + yesH - (2 / 3) * yesH} y2={yesTop + yesH - (2 / 3) * yesH} stroke="var(--red)" strokeDasharray="3 3" opacity={0.7} />
        {timeline.map((p, i) =>
          p.yes > 0 ? (
            <rect
              key={p.date}
              x={L + i * cw}
              y={yesTop + yesH - (p.yes / 3) * yesH}
              width={cw + 0.25}
              height={(p.yes / 3) * yesH}
              fill={p.yes >= 2 ? "var(--red)" : "var(--wheat)"}
              // tetiği kapalı dönemde (ör. olgunlaşma) oy sayılır ama karar doğmaz → soluk
              opacity={triggerOn(p.window) ? 1 : 0.3}
            />
          ) : null,
        )}

        {/* ay etiketleri */}
        {months.map(({ p, i }) => (
          <g key={p.date}>
            <line x1={L + i * cw} x2={L + i * cw} y1={top - 2} y2={yesTop + yesH + 2} stroke="var(--line-strong)" strokeWidth={0.6} opacity={0.6} />
            <text x={L + i * cw + 2} y={H - 4} fontSize={9.5} fill="var(--text-dim)">
              {TR_MONTHS_SHORT[Number(p.date.slice(5, 7)) - 1]}
            </text>
          </g>
        ))}

        {/* işaretler */}
        {idx(decisionDate) >= 0 && (
          <line x1={L + (idx(decisionDate) + 0.5) * cw} x2={L + (idx(decisionDate) + 0.5) * cw} y1={2} y2={yesTop + yesH + 4} stroke="var(--red-fg)" strokeWidth={1.4} strokeDasharray="4 2" />
        )}
        {idx(liveDate) >= 0 && <line x1={L + (idx(liveDate) + 0.5) * cw} x2={L + (idx(liveDate) + 0.5) * cw} y1={2} y2={yesTop + yesH + 4} stroke="var(--sky)" strokeWidth={1.4} />}
        {sel >= 0 && <rect x={L + sel * cw - 1} y={top - 3} width={cw + 2} height={yesTop + yesH - top + 6} fill="none" stroke="var(--wheat-fg)" strokeWidth={1.6} rx={1.5} />}
        {hover != null && <rect x={L + hover * cw} y={top - 3} width={cw} height={yesTop + yesH - top + 6} fill="var(--text)" opacity={0.18} />}
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dim">
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-sm bg-green" /> EVET
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-sm border border-line bg-surface-2" /> HAYIR
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-sm bg-wheat/60" /> VERİ YOK
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2.5 w-0.5 bg-red-fg" /> motorun karar günü
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-sm bg-red/30" /> soluk: tetiği kapalı dönem
        </span>
        {liveDate && (
          <span className="inline-flex items-center gap-1.5">
            <i className="h-2.5 w-0.5 bg-sky" /> zaman makinesi
          </span>
        )}
        <span className="ml-auto font-mono">{hv ? `${formatDateTR(hv.date, { year: true })} · ${hv.yes}/3` : " "}</span>
      </div>
    </div>
  );
}
