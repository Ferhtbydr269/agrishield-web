"use client";
import type { Witnesses } from "@/engine/types";
import { WitnessChip } from "@/components/ui/Witness";
import { cn, fmtNum } from "@/components/ui/cn";

const pct = (x: number | null) => (x == null ? "—" : `${x < 0 ? "−" : "+"}%${fmtNum(Math.abs(x) * 100, 1)}`);

/** Üç tanık: karar + ölçülen değer + eşik + gerekçe (motorun kendi açıklaması) */
export function WitnessPanel({ w, stage = false, compact = false }: { w: Witnesses | null | undefined; stage?: boolean; compact?: boolean }) {
  const size = stage ? "lg" : "md";
  if (!w) return <div className="grid gap-3">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-2" />)}</div>;
  const s = w.satellite;
  const st = w.station;
  const m = w.meteo;
  const rows = [
    {
      kind: "satellite" as const,
      verdict: s.verdict,
      detail:
        s.ndvi != null
          ? `NDVI ${fmtNum(s.ndvi, 2)} · normal ${fmtNum(s.normalMedian ?? 0, 2)} · ${pct(s.anomaly)} · eşik ${s.window.triggerEnabled ? pct(s.threshold) : "kapalı"}`
          : s.s1z != null
            ? `Sentinel-1 yüzey nemi z = ${fmtNum(s.s1z, 2)}`
            : s.reason,
      reason: s.reason,
      meta: `${s.source} · ${s.window.label}${s.obsDate ? ` · geçiş ${s.obsDate.slice(5)}` : ""}`,
    },
    {
      kind: "station" as const,
      verdict: st.verdict,
      detail: `30 g yağış ${st.rain30mm != null ? fmtNum(st.rain30mm, 1) : "—"} mm (≤10) · nem %${st.soilMoisture != null ? fmtNum(st.soilMoisture, 1) : "—"} (< %${st.threshold})`,
      reason: st.reason,
      meta: `${st.stationId} · ${st.soilType === "tinli" ? "tınlı" : st.soilType} · kaynak: ${st.source}`,
    },
    {
      kind: "meteo" as const,
      verdict: m.verdict,
      detail: `SPI-30 ${m.spi30 != null ? fmtNum(m.spi30, 2) : "—"} (≤ −1,5) · 30 g yağış ${m.rain30mm != null ? fmtNum(m.rain30mm, 1) : "—"} / normal ${m.rain30Normal != null ? fmtNum(m.rain30Normal, 1) : "—"} mm`,
      reason: m.reason,
      meta: `${m.source} · normal: ERA5 1991–2020 (gerçek)`,
    },
  ];
  return (
    <div className="grid gap-3" data-testid="witness-panel">
      {rows.map((r) => (
        <div key={r.kind}>
          <WitnessChip kind={r.kind} verdict={r.verdict} detail={r.detail} size={size} />
          {!compact && (
            <div className={cn("mt-1 px-1 text-dim", stage ? "text-sm" : "text-[0.72rem]")}>
              <span className="font-mono">{r.meta}</span>
              <span className="mx-1.5">·</span>
              {r.reason}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
