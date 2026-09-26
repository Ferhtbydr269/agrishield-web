"use client";
import { Droplets, Sun, Eraser, Gauge } from "lucide-react";
import { postJson } from "@/lib/api";
import { useDevice } from "@/store/device";
import { LiveBadge } from "@/components/ui/Badges";
import { SoilGauge } from "@/components/ui/SoilGauge";
import { WitnessChip } from "@/components/ui/Witness";
import { cn, fmtNum } from "@/components/ui/cn";

/** Canlı nem grafiği (son ~2 dk) — eşik çizgisi killi toprak solma noktası (%18). */
export function MoistureSparkline({ height = 120, stage = false, threshold = 18 }: { height?: number; stage?: boolean; threshold?: number }) {
  const readings = useDevice((s) => s.readings);
  const W = 600;
  const H = height;
  const now = readings.length ? readings[readings.length - 1].receivedAt : Date.now();
  const span = 150_000;
  const pts = readings.filter((r) => r.soilMoisture != null && now - r.receivedAt <= span);
  const X = (t: number) => ((t - (now - span)) / span) * W;
  const Y = (v: number) => 6 + (1 - v / 45) * (H - 12);
  const d = pts.length > 1 ? `M ${pts.map((r) => `${X(r.receivedAt)},${Y(r.soilMoisture!)}`).join(" L ")}` : "";
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Canlı toprak nemi">
      <rect x="0" y={Y(threshold)} width={W} height={H - Y(threshold)} fill="var(--red)" opacity="0.08" />
      <line x1="0" x2={W} y1={Y(threshold)} y2={Y(threshold)} stroke="var(--red)" strokeDasharray="4 5" />
      <text x="6" y={Y(threshold) - 5} fontSize={stage ? 16 : 12} fill="var(--red-fg)" fontFamily="var(--font-mono)">
        solma noktası %{threshold} (killi)
      </text>
      <path d={d} fill="none" stroke="var(--soil)" strokeWidth={stage ? 4 : 2.5} strokeLinejoin="round" />
      {last && <circle cx={X(last.receivedAt)} cy={Y(last.soilMoisture!)} r={stage ? 7 : 5} fill="var(--soil)" stroke="var(--bg)" strokeWidth="2" />}
    </svg>
  );
}

/** HIL paneli: canlı cihaz / simüle cihaz, anlık nem, canlı yer tanığı, gecikme, sahne yedeği düğmeleri */
export function LiveMoisturePanel({ stage = false, compact = false }: { stage?: boolean; compact?: boolean }) {
  const state = useDevice((s) => s.state);
  const witness = useDevice((s) => s.liveWitness);
  const latency = useDevice((s) => s.displayLatencyMs);
  const last = useDevice((s) => s.readings[s.readings.length - 1]);
  const simulated = state?.status !== "canli";
  const pot = async (p: "islak" | "kuru") => postJson("/api/device", { pot: p }).catch(() => undefined);
  const clear = async () => postJson("/api/device", { clearFlags: true }).catch(() => undefined);
  return (
    <div className={cn("panel p-5", stage && "p-7")} data-testid="live-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="eyebrow">Yer istasyonu · canlı ölçüm</div>
        <LiveBadge />
      </div>
      <div className="mt-4">
        <SoilGauge value={last?.soilMoisture ?? null} threshold={18} soilLabel="killi" size={stage ? "stage" : "md"} label="Toprak nemi (canlı)" />
      </div>
      {!compact && (
        <div className="mt-4 rounded-lg border border-line bg-bg/40 p-2">
          <MoistureSparkline stage={stage} height={stage ? 170 : 110} />
        </div>
      )}
      <div className="mt-4">
        <WitnessChip kind="station" verdict={witness?.verdict ?? null} detail={witness?.reason} size={stage ? "lg" : "md"} live />
      </div>
      <div className={cn("mt-3 flex flex-wrap items-center gap-2 font-mono text-dim", stage ? "text-sm" : "text-[0.7rem]")}>
        <Gauge className="size-3.5" aria-hidden />
        ölçüm → ekran: {latency != null ? `${fmtNum(latency / 1000, 2)} sn` : "—"}
        {state?.seq != null && <span>· paket #{state.seq}</span>}
        {state?.flags.length ? <span className="text-wheat-fg">· şüpheli: {state.flags[state.flags.length - 1].label}</span> : null}
      </div>
      {simulated && (
        <div className="mt-4 rounded-lg border border-wheat/40 bg-wheat/5 p-3">
          <div className="text-xs text-wheat-fg">Gerçek cihaz bağlı değil — sahne yedeği (simüle cihaz):</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => void pot("kuru")} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm hover:bg-surface-2" data-testid="pot-kuru">
              <Sun className="size-4 text-wheat-fg" aria-hidden /> Kuru saksıya taşı
            </button>
            <button type="button" onClick={() => void pot("islak")} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm hover:bg-surface-2" data-testid="pot-islak">
              <Droplets className="size-4 text-sky-fg" aria-hidden /> Islak saksıya taşı
            </button>
            {state?.flags.length ? (
              <button type="button" onClick={() => void clear()} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm hover:bg-surface-2">
                <Eraser className="size-4" aria-hidden /> Bayrağı temizle
              </button>
            ) : null}
          </div>
        </div>
      )}
      <p className={cn("mt-3 text-dim", stage ? "text-sm" : "text-[0.7rem]")}>Demo cihazında yağış ölçer yok (0 mm kabul). Canlı tanık yalnız istasyonun kendi ölçümünü değerlendirir; sahada LoRa, demoda Wi-Fi.</p>
    </div>
  );
}
