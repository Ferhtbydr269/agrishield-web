"use client";
/**
 * SUNUM MODU (AGRISHIELD_PROMPT.md 13.2) + KIOSK (13.3)
 *  P: aç/kapa · 1–9, 0: sahne · ←/→ · Space: zaman makinesi · R: sıfırla · B: karart · Esc: çık
 *  Tam ekran, koyu tema, üstte ilerleme şeridi, sağ altta 15:00 geri sayım, 3 sn hareketsizlikte imleç gizlenir.
 *  Tüm ekranlar SSE ile senkron: /sunucu'daki tuş buradaki sahneyi de değiştirir.
 */
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { SCENES } from "@/content/scenes";
import { postJson, sim as simApi } from "@/lib/api";
import { SCENARIOS } from "@/sim/scenarios";
import { usePresentation } from "@/store/presentation";
import { focusParcel, useLive } from "@/store/sim";
import { LogoMark } from "@/components/brand/Logo";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { cn } from "@/components/ui/cn";
import type { SeasonPoint } from "@/components/ui/Era5Chart";
import type { BacktestSeason } from "@/components/sections/Commercial";
import { StageTimer } from "./StageTimer";
import { KioskLoop } from "./KioskLoop";
import {
  SceneCommercial,
  SceneDecision,
  SceneField,
  SceneJury,
  SceneManipulation,
  SceneMehmet,
  ScenePayment,
  SceneTimeMachine,
  SceneTimelines,
  SceneWitnesses,
} from "./SceneViews";

const isTyping = (el: EventTarget | null) => el instanceof HTMLElement && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);

/** Sahneye girişte otomatik hazırlık (sahnede el ile ayar yapılmasın) */
async function onEnterScene(index: number) {
  const st = useLive.getState();
  const sim = st.sim;
  const f = focusParcel(sim);
  try {
    if (index === 4) {
      // Jüri testi: canlı bayrakları temizle (kurulumdaki sıçrama şüpheli sayılmasın)
      await postJson("/api/device", { clearFlags: true });
    }
    if (index === 5) {
      // Zaman makinesi: kuraklık senaryosu, ödeme 8. sahneye kadar bekletilir
      await simApi.settings({ holdPayment: true });
      if (!sim || sim.scenario !== "kuraklik-2025" || f?.decision) await simApi.load("kuraklik-2025");
      else if (!sim.playing && sim.date > SCENARIOS["kuraklik-2025"].stageStart && !f?.decision) await simApi.seek(SCENARIOS["kuraklik-2025"].stageStart);
    }
    if (index === 7 && f?.decision?.outcome === "ODE") {
      // Ödeme sahnesi: bekletilen ödemeyi serbest bırak
      await postJson("/api/payout", { decisionId: f.decision.id }).catch(() => undefined);
    }
    if (index === 8) {
      await simApi.settings({ holdPayment: false });
      if (sim?.scenario !== "manipulasyon") {
        await simApi.load("manipulasyon");
        await simApi.seek(SCENARIOS.manipulasyon.stageStart);
      }
    }
  } catch {
    /* sahne hazırlığı başarısızsa sunum sürer */
  }
}

export function Presentation({ children, backtestP }: { children: React.ReactNode; season2025: SeasonPoint[]; seasons: BacktestSeason[]; backtestP: number }) {
  const { present, index, blackout, startedAt, kiosk, togglePresent, setScene, next, prev, toggleBlackout, setKiosk } = usePresentation();
  const [sceneStartedAt, setSceneStartedAt] = useState(() => Date.now());
  const [fieldPreset, setFieldPreset] = useState(1);
  const lastIndex = useRef<number | null>(null);

  // ?kiosk=1 → stant döngüsü
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("kiosk") === "1") setKiosk(true);
    if (q.get("sunum") === "1") togglePresent(true);
  }, [setKiosk, togglePresent]);

  // sahne değişimi: süre sayacı + otomatik hazırlık
  useEffect(() => {
    if (!present) {
      lastIndex.current = null;
      return;
    }
    if (lastIndex.current === index) return;
    lastIndex.current = index;
    setSceneStartedAt(Date.now());
    if (index === 3) {
      setFieldPreset(1);
      const t = setTimeout(() => setFieldPreset(2), 6000);
      void onEnterScene(index);
      return () => clearTimeout(t);
    }
    void onEnterScene(index);
  }, [present, index]);

  // tam ekran + koyu tema zorunlu (çıkınca önceki tema geri gelir)
  useEffect(() => {
    const root = document.documentElement;
    if (present) {
      const prevTheme = root.getAttribute("data-theme");
      root.setAttribute("data-theme", "dark");
      if (!document.fullscreenElement) root.requestFullscreen?.().catch(() => undefined);
      return () => {
        if (prevTheme) root.setAttribute("data-theme", prevTheme);
        if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
      };
    }
  }, [present]);

  // imleç 3 sn hareketsizse gizlenir
  useEffect(() => {
    if (!present) return;
    const root = document.documentElement;
    let t: ReturnType<typeof setTimeout>;
    const wake = () => {
      root.removeAttribute("data-cursor");
      clearTimeout(t);
      t = setTimeout(() => root.setAttribute("data-cursor", "hidden"), 3000);
    };
    wake();
    window.addEventListener("mousemove", wake);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mousemove", wake);
      root.removeAttribute("data-cursor");
    };
  }, [present]);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === "p" || k === "P") {
        e.preventDefault();
        togglePresent();
        return;
      }
      if (!present) return;
      if (/^[0-9]$/.test(k)) {
        e.preventDefault();
        setScene(k === "0" ? 9 : Number(k) - 1);
      } else if (k === "ArrowRight" || k === "PageDown") {
        e.preventDefault();
        next();
      } else if (k === "ArrowLeft" || k === "PageUp") {
        e.preventDefault();
        prev();
      } else if (k === " ") {
        e.preventDefault();
        const s = useLive.getState().sim;
        if (s) void simApi.play(s.playing ? 0 : s.speed || SCENARIOS[s.scenario].stageSpeed);
      } else if (k === "r" || k === "R") {
        e.preventDefault();
        void simApi.reset();
      } else if (k === "b" || k === "B") {
        e.preventDefault();
        toggleBlackout();
      } else if (k === "Escape") {
        togglePresent(false);
      } else if (index === 3 && /^[1-6]$/.test(k)) {
        setFieldPreset(Number(k));
      }
    },
    [present, index, togglePresent, setScene, next, prev, toggleBlackout],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  const scene = (() => {
    switch (index) {
      case 0:
        return <SceneMehmet />;
      case 1:
        return <SceneTimelines />;
      case 2:
        return <SceneWitnesses />;
      case 3:
        return <SceneField preset={fieldPreset} />;
      case 4:
        return <SceneJury />;
      case 5:
        return <SceneTimeMachine />;
      case 6:
        return <SceneDecision />;
      case 7:
        return <ScenePayment />;
      case 8:
        return <SceneManipulation />;
      default:
        return <SceneCommercial backtestP={backtestP} />;
    }
  })();

  return (
    <>
      {children}
      {kiosk && !present && <KioskLoop onExit={() => setKiosk(false)} />}
      <AnimatePresence>
        {present && (
          <motion.div
            key="stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[80] flex flex-col bg-bg"
            data-theme="dark"
            role="dialog"
            aria-label={`Sunum modu — sahne ${SCENES[index].key}: ${SCENES[index].title}`}
            data-testid="presentation"
          >
            {/* ilerleme şeridi */}
            <div className="flex items-center gap-4 px-10 pt-5">
              <LogoMark size={30} />
              <div className="grid flex-1 grid-cols-10 gap-1.5">
                {SCENES.map((s, i) => (
                  <button key={s.key} type="button" onClick={() => setScene(i)} className="group text-left" aria-label={`Sahne ${s.key}: ${s.title}`}>
                    <div className={cn("h-1.5 rounded-full transition-colors", i < index ? "bg-green" : i === index ? "bg-wheat" : "bg-line")} />
                    <div className={cn("mt-1 truncate font-mono text-[13px]", i === index ? "text-text" : "text-dim")}>
                      {s.key} · {s.title}
                    </div>
                  </button>
                ))}
              </div>
              <span className="font-mono text-[15px] text-dim">
                {index + 1}/10
              </span>
              <button type="button" onClick={() => togglePresent(false)} className="grid size-9 place-items-center rounded-full border border-line text-dim hover:text-text" aria-label="Sunum modundan çık (Esc)">
                <X className="size-4" aria-hidden />
              </button>
            </div>
            {/* sahne */}
            <div className="relative min-h-0 flex-1 px-14 pb-28 pt-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
                  className="h-full"
                >
                  <ErrorBoundary label={SCENES[index].title}>{scene}</ErrorBoundary>
                </motion.div>
              </AnimatePresence>
            </div>
            {/* alt: ipucu + süre */}
            <div className="pointer-events-none absolute bottom-6 left-14 max-w-[900px] font-mono text-[15px] text-dim">P çık · 1–0 sahne · ←/→ · Space zaman · R sıfırla · B karart</div>
            <div className="absolute bottom-5 right-8">
              <StageTimer startedAt={startedAt} sceneIndex={index} sceneStartedAt={sceneStartedAt} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {blackout && <div className="blackout" aria-hidden onClick={toggleBlackout} />}
    </>
  );
}
