"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { diffDays, addDays, formatDateTR } from "@/lib/dates";
import { sim as simApi } from "@/lib/api";
import { SCENARIOS, SCENARIO_KEYS, SEASON, type ScenarioKey } from "@/sim/scenarios";
import { useLive } from "@/store/sim";
import { SampleDataBadge } from "@/components/ui/Badges";
import { cn } from "@/components/ui/cn";

const SPEEDS = [1, 4, 7, 15, 30];

export function ScenarioPicker({ stage = false }: { stage?: boolean }) {
  const scenario = useLive((s) => s.sim?.scenario);
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Senaryo">
      {SCENARIO_KEYS.map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={scenario === k}
          onClick={() => void simApi.load(k)}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
            scenario === k ? "border-wheat bg-wheat/15 font-semibold text-wheat-fg" : "border-line text-dim hover:text-text",
            stage && "text-lg",
          )}
          data-testid={`scenario-${k}`}
        >
          {SCENARIOS[k].short}
        </button>
      ))}
    </div>
  );
}

export function TimeMachine({ stage = false }: { stage?: boolean }) {
  const s = useLive((st) => st.sim);
  const [drag, setDrag] = useState<number | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const total = diffDays(SEASON.end, SEASON.start);
  const idx = s ? diffDays(s.date, SEASON.start) : 0;
  const value = drag ?? idx;

  useEffect(() => () => void (debounce.current && clearTimeout(debounce.current)), []);

  if (!s) return <div className="panel h-40 animate-pulse" />;
  const meta = SCENARIOS[s.scenario as ScenarioKey];
  const onSeek = (v: number) => {
    setDrag(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      void simApi.seek(addDays(SEASON.start, v)).finally(() => setDrag(null));
    }, 160);
  };

  return (
    <div className={cn("panel p-5", stage && "p-7")} data-testid="time-machine">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow">Zaman makinesi · {s.scenarioLabel}</div>
          <div className={cn("mt-1 font-display font-extrabold tabular leading-none", stage ? "text-7xl" : "text-5xl")} data-testid="sim-date">
            {formatDateTR(drag != null ? addDays(SEASON.start, drag) : s.date)}
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-dim">
            {s.playing ? (
              <>
                <span className="size-2 rounded-full bg-green pulse-dot" aria-hidden /> akıyor · 1 sn = {s.speed} gün
              </>
            ) : (
              <>duraklatıldı</>
            )}
            {s.synthetic && <SampleDataBadge className="ml-1" />}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void simApi.play(s.playing ? 0 : s.speed || meta.stageSpeed)}
            className={cn("inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold", s.playing ? "border border-line-strong text-text" : "bg-wheat text-[#1a1305]")}
            data-testid="sim-play"
            aria-label={s.playing ? "Duraklat (Space)" : "Oynat (Space)"}
          >
            {s.playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
            {s.playing ? "Duraklat" : "Oynat"}
          </button>
          <button type="button" onClick={() => void simApi.seek(meta.stageStart)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2.5 text-sm text-dim hover:text-text" title="Sahne başlangıcına git">
            <SkipForward className="size-4" aria-hidden /> {formatDateTR(meta.stageStart, { year: false })}
          </button>
          <button type="button" onClick={() => void simApi.reset()} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2.5 text-sm text-dim hover:text-text" title="Sıfırla (R)">
            <RotateCcw className="size-4" aria-hidden /> Sıfırla
          </button>
        </div>
      </div>
      <div className="mt-5">
        <label htmlFor="sim-seek" className="sr-only">
          Simülasyon tarihi
        </label>
        <input
          id="sim-seek"
          type="range"
          min={0}
          max={total}
          value={value}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="w-full"
          aria-valuetext={formatDateTR(addDays(SEASON.start, value))}
        />
        <div className="mt-1 flex justify-between font-mono text-[0.7rem] text-dim">
          <span>{formatDateTR(SEASON.start, { short: true })}</span>
          <span>kritik dönem: 1 Nis – 20 May</span>
          <span>{formatDateTR(SEASON.end, { short: true })}</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs text-dim">hız (gün/sn):</span>
        {SPEEDS.map((sp) => (
          <button
            key={sp}
            type="button"
            onClick={() => void simApi.play(sp)}
            className={cn("rounded-md border px-2.5 py-1 font-mono text-xs", s.playing && s.speed === sp ? "border-wheat text-wheat-fg" : "border-line text-dim hover:text-text")}
          >
            {sp}×
          </button>
        ))}
      </div>
    </div>
  );
}
