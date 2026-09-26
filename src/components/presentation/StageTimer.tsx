"use client";
import { useEffect, useState } from "react";
import { SCENES, TALK_SECONDS } from "@/content/scenes";
import { cn } from "@/components/ui/cn";

const mmss = (s: number) => {
  const neg = s < 0;
  const a = Math.abs(Math.round(s));
  return `${neg ? "−" : ""}${Math.floor(a / 60)}:${String(a % 60).padStart(2, "0")}`;
};

/** 15:00 geri sayım + sahnenin hedef süresi (30 sn kala sarı, aşınca kırmızı) */
export function StageTimer({ startedAt, sceneIndex, sceneStartedAt, large = false }: { startedAt: number | null; sceneIndex: number; sceneStartedAt: number; large?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const remaining = startedAt ? TALK_SECONDS - (now - startedAt) / 1000 : TALK_SECONDS;
  const scene = SCENES[sceneIndex];
  const elapsed = (now - sceneStartedAt) / 1000;
  const left = scene.targetSec - elapsed;
  const tone = left < 0 ? "text-red-fg" : left <= 30 ? "text-wheat-fg" : "text-green-fg";
  const totalTone = remaining < 0 ? "text-red-fg" : remaining <= 60 ? "text-wheat-fg" : "text-text";
  return (
    <div className={cn("flex items-end gap-5 rounded-2xl border border-line bg-surface/90 px-5 py-3 backdrop-blur", large && "gap-8 px-8 py-5")} role="timer" aria-label="Sunum süresi">
      <div>
        <div className="font-mono text-[0.65rem] uppercase tracking-widest text-dim">sahne {scene.key} · hedef {mmss(scene.targetSec)}</div>
        <div className={cn("font-mono font-bold tabular", tone, large ? "text-5xl" : "text-2xl")}>{mmss(elapsed)}</div>
      </div>
      <div>
        <div className="font-mono text-[0.65rem] uppercase tracking-widest text-dim">kalan</div>
        <div className={cn("font-mono font-bold tabular", totalTone, large ? "text-7xl" : "text-4xl")} data-testid="stage-countdown">
          {mmss(remaining)}
        </div>
      </div>
    </div>
  );
}
