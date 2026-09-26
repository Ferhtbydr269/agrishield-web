"use client";
/**
 * 3D SAHA SİMÜLATÖRÜ (AGRISHIELD_PROMPT.md Bölüm 12) — sitenin yıldızı.
 * Tek sahnede: tarla, istasyon (H1–H10), uydu, gateway, veri akışı, karar ve ödeme.
 * Performans: ≤150k üçgen, doku yok (prosedürel), dpr [1, 1,5], post-processing yok, tek gölge ışığı.
 * WebGL yoksa / fps 30'un altına düşerse otomatik "2B Saha Görünümü". Kayıt: ?record=1 (12 sn tur, arayüz gizli).
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Tag, Scissors, Expand, Workflow, Cloud, Wind, Moon, Gauge } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { LiveBadge, SampleDataBadge } from "@/components/ui/Badges";
import { useLive } from "@/store/sim";
import { CameraRig } from "./CameraRig";
import { DataFlow } from "./DataFlow";
import { Clouds, Environment, Ground, Hills, Roads } from "./Environment";
import { Fallback2D } from "./Fallback2D";
import { Fields } from "./Fields";
import { PRESETS, START_CAMERA } from "./layout";
import { PartCard } from "./PartCard";
import { Satellites } from "./Satellites";
import { Station } from "./Station";
import { useSceneLive } from "./useSceneLive";
import { Village } from "./Village";
import { createLabelStore, LabelLayer, LabelProjector, LabelProvider } from "./labels";

export interface FieldSimulatorProps {
  stage?: boolean;
  initialPreset?: number;
  liveSoil?: boolean;
  height?: number | string;
  autoTour?: boolean;
}

interface Layers {
  labels: boolean;
  cut: boolean;
  explode: number;
  flow: boolean;
  clouds: boolean;
  wind: boolean;
  night: boolean;
}

const LAYER_KEYS: { key: keyof Layers; k: string; label: string; Icon: typeof Tag }[] = [
  { key: "labels", k: "L", label: "Etiketler", Icon: Tag },
  { key: "cut", k: "X", label: "Kesit", Icon: Scissors },
  { key: "explode", k: "E", label: "Patlat", Icon: Expand },
  { key: "flow", k: "F", label: "Veri akışı", Icon: Workflow },
  { key: "clouds", k: "C", label: "Bulut", Icon: Cloud },
  { key: "wind", k: "W", label: "Rüzgâr", Icon: Wind },
  { key: "night", k: "N", label: "Gece", Icon: Moon },
];

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * fps ve üçgen sayısı. Otomatik 2B yedeğe geçiş yalnız açılıştaki performans kontrolünde (ilk ~20 sn aktif çizim)
 * ve sayfa görünür + odaktayken yapılır: pencere bir an arkada kalınca tarayıcının kare hızını kısması 3D'yi kapatmaz.
 */
function PerfProbe({ onStats, onLow, auto }: { onStats: (fps: number, tris: number, calls: number) => void; onLow: () => void; auto: boolean }) {
  const { gl } = useThree();
  const acc = useRef({ t: 0, frames: 0, warm: 0, lowFor: 0, checked: 0 });
  useFrame((_, dt) => {
    const a = acc.current;
    // görünmezlikten dönüş / sekme değişimi gibi uzun aralar ölçüme girmez
    if (dt > 0.25) {
      a.t = 0;
      a.frames = 0;
      a.lowFor = 0;
      return;
    }
    a.t += dt;
    a.frames++;
    a.warm += dt;
    if (a.t >= 1) {
      const fps = a.frames / a.t;
      onStats(Math.round(fps), gl.info.render.triangles, gl.info.render.calls);
      const measurable = auto && document.visibilityState === "visible" && document.hasFocus() && a.checked < 20;
      if (measurable) {
        a.checked += a.t;
        if (a.warm > 5 && fps < 30) a.lowFor += a.t;
        else a.lowFor = 0;
        if (a.lowFor >= 5) onLow();
      } else a.lowFor = 0;
      a.t = 0;
      a.frames = 0;
    }
  });
  return null;
}

export function FieldSimulator({ stage = false, initialPreset = 1, liveSoil = false, height = 640, autoTour = false }: FieldSimulatorProps) {
  const live = useSceneLive();
  const [labelStore] = useState(() => createLabelStore());
  const wrap = useRef<HTMLDivElement>(null);
  const [preset, setPreset] = useState(initialPreset);
  const [nonce, setNonce] = useState(0);
  const [layers, setLayers] = useState<Layers>({ labels: true, cut: initialPreset === 3, explode: 0, flow: initialPreset === 5, clouds: true, wind: true, night: false });
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);
  const [stats, setStats] = useState({ fps: 0, tris: 0, calls: 0 });
  const [visible, setVisible] = useState(true);
  const [record, setRecord] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [autoPerf, setAutoPerf] = useState(true);
  const [nearStation, setNearStation] = useState(false);
  const simDate = useLive((s) => s.sim?.date);
  const scenario = useLive((s) => s.sim?.scenarioLabel);

  const goPreset = useCallback((p: number) => {
    setPreset(p);
    setNonce((n) => n + 1);
    setLayers((l) => ({ ...l, cut: p === 3 ? true : p === 1 || p === 4 || p === 6 ? false : l.cut, flow: p === 5, explode: p === 3 ? 0 : l.explode }));
  }, []);

  // dışarıdan (sunum modu) preset değişimi
  useEffect(() => {
    goPreset(initialPreset);
  }, [initialPreset, goPreset]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("fallback2d") === "1") setFallback("?fallback2d=1 ile istendi");
    else if (!webglAvailable()) setFallback("bu tarayıcıda WebGL yok");
    if (q.get("record") === "1") setRecord(true);
    if (q.get("perf") === "off") setAutoPerf(false);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
  }, []);

  // görünmüyorsa render etme (GPU'yu diğer bölümlere bırak)
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => setVisible(es[0]?.isIntersecting ?? true), { threshold: 0.02 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // otomatik tur: kiosk (4 sn) ve kayıt modu (12 sn'de 5 preset)
  useEffect(() => {
    if (!autoTour && !record) return;
    const seq = record ? [1, 2, 4, 5, 6] : [1, 2, 3, 4, 5, 6];
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % seq.length;
      goPreset(seq[i]);
    }, record ? 2400 : 4000);
    goPreset(seq[0]);
    return () => clearInterval(t);
  }, [autoTour, record, goPreset]);

  // istasyon hotspot'ları yalnız yakın presetlerde (kalabalık olmasın)
  useEffect(() => setNearStation(preset === 2 || preset === 3 || layers.explode > 0), [preset, layers.explode]);

  const toggle = useCallback((k: keyof Layers) => {
    setLayers((l) => {
      if (k === "explode") return { ...l, explode: l.explode > 0 ? 0 : 1 };
      return { ...l, [k]: !l[k] } as Layers;
    });
    if (k === "cut") setPreset((p) => p);
  }, []);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toUpperCase();
      const lk = LAYER_KEYS.find((x) => x.k === k);
      if (lk) {
        e.preventDefault();
        toggle(lk.key);
        if (lk.key === "cut" && !layers.cut) goPreset(3);
        if (lk.key === "flow" && !layers.flow) goPreset(5);
        return;
      }
      if (!stage && /^[1-6]$/.test(e.key)) {
        e.preventDefault();
        goPreset(Number(e.key));
      }
      if (e.key === "Escape") setSelected(null);
    },
    [toggle, stage, goPreset, layers.cut, layers.flow],
  );

  // sahne modunda harf kısayolları tüm pencerede; normal sayfada yalnız simülatör odaktayken/üzerindeyken
  useEffect(() => {
    if (stage) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
    const el = wrap.current;
    if (!el) return;
    let over = false;
    const enter = () => (over = true);
    const leave = () => (over = false);
    const handler = (e: KeyboardEvent) => {
      if (over || el.contains(document.activeElement)) onKey(e);
    };
    el.addEventListener("mouseenter", enter);
    el.addEventListener("mouseleave", leave);
    window.addEventListener("keydown", handler);
    return () => {
      el.removeEventListener("mouseenter", enter);
      el.removeEventListener("mouseleave", leave);
      window.removeEventListener("keydown", handler);
    };
  }, [stage, onKey]);

  // WebGL yoksa Canvas hiç kurulmaz; performans yedeğinde Canvas sökülmez, durdurulup gizlenir (sahne geçişinde yarış yok)
  if (fallback && !fallback.startsWith("düşük")) return <Fallback2D reason={fallback} height={height} liveSoil={liveSoil} />;
  const perfFallback = Boolean(fallback);

  const showUi = !record;
  const fade = layers.flow;

  return (
    <div
      ref={wrap}
      className={cn("relative overflow-hidden rounded-2xl border border-line bg-[#0b130f] outline-none", stage && "rounded-none border-0")}
      style={{ height: perfFallback ? undefined : height }}
      tabIndex={0}
      aria-label="3D saha simülatörü. 1–6 kamera, L etiket, X kesit, E patlat, F veri akışı, C bulut, W rüzgâr, N gece."
      data-testid="field-3d"
    >
      {perfFallback && <Fallback2D reason={fallback!} height={height} liveSoil={liveSoil} onRetry={() => setFallback(null)} />}
      <LabelProvider store={labelStore}>
      <div className={perfFallback ? "hidden" : "absolute inset-0"}>
      <Canvas
        dpr={[1, 1.5]}
        shadows="percentage"
        frameloop={visible && !perfFallback ? "always" : "never"}
        camera={{ position: START_CAMERA.position, fov: stage ? 40 : 42, near: 0.1, far: 1500 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
        }}
        onPointerMissed={() => setSelected(null)}
      >
        <fog attach="fog" args={["#8fa9a1", 220, 620]} />
        <Environment live={live} night={layers.night} fade={fade} />
        <Ground cut={layers.cut} fade={fade} />
        <Roads fade={fade} cut={layers.cut} />
        <Hills />
        <Fields live={live} fade={fade} windOn={layers.wind} labels={layers.labels && showUi && (preset === 1 || preset === 4)} />
        <Station
          live={live}
          explode={layers.explode}
          labels={layers.labels && showUi}
          cut={layers.cut}
          liveSoil={liveSoil}
          hover={hover}
          selected={selected}
          onHover={setHover}
          onSelect={setSelected}
          showHotspots={layers.labels && showUi && nearStation}
          windOn={layers.wind}
          farMarker={layers.labels && showUi && (preset === 1 || preset === 4 || preset === 6)}
          onZoom={() => goPreset(2)}
        />
        <Village live={live} dome={preset === 6} labels={layers.labels && showUi && (preset === 6 || preset === 1)} hover={hover} selected={selected} onHover={setHover} onSelect={setSelected} />
        <Satellites live={live} labels={layers.labels && showUi && preset !== 2 && preset !== 3} hover={hover} selected={selected} onHover={setHover} onSelect={setSelected} />
        <Clouds live={live} enabled={layers.clouds} />
        <DataFlow live={live} visible={layers.flow} />
        <CameraRig preset={preset} presetNonce={nonce} autoRotate={stage || autoTour} reducedMotion={reduced} />
        <PerfProbe onStats={(fps, tris, calls) => setStats({ fps, tris, calls })} onLow={() => setFallback("düşük performans (fps < 30)")} auto={autoPerf} />
        <LabelProjector store={labelStore} />
      </Canvas>
      </div>
      </LabelProvider>
      {!perfFallback && <LabelLayer store={labelStore} />}

      {showUi && !perfFallback && (
        <>
          {/* kamera presetleri */}
          <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-10.5rem)] flex-wrap gap-1.5" role="toolbar" aria-label="Kamera presetleri">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => goPreset(p.key)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs backdrop-blur transition-colors",
                  preset === p.key ? "border-wheat bg-wheat/20 font-semibold text-wheat-fg" : "border-line bg-bg/70 text-dim hover:text-text",
                  stage && "px-4 py-1.5 text-base",
                )}
                aria-pressed={preset === p.key}
              >
                <span className="font-mono">{p.key}</span> · {p.label}
              </button>
            ))}
          </div>
          {/* katman anahtarları */}
          <div className={cn("absolute right-3 top-3 z-10 flex flex-col items-end gap-1.5", selected && "hidden")} role="toolbar" aria-label="Katmanlar">
            {LAYER_KEYS.map((x) => {
              const on = x.key === "explode" ? layers.explode > 0 : Boolean(layers[x.key]);
              return (
                <button
                  key={x.key}
                  type="button"
                  onClick={() => {
                    toggle(x.key);
                    if (x.key === "cut" && !layers.cut) goPreset(3);
                    if (x.key === "flow" && !layers.flow) goPreset(5);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs backdrop-blur",
                    on ? "border-sky/60 bg-sky/15 text-sky-fg" : "border-line bg-bg/70 text-dim hover:text-text",
                    stage && "px-3.5 py-1.5 text-sm",
                  )}
                  aria-pressed={on}
                  title={`${x.label} (${x.k})`}
                >
                  <x.Icon className="size-3.5" aria-hidden />
                  {x.label}
                  <kbd className="font-mono text-[0.62rem] opacity-70">{x.k}</kbd>
                </button>
              );
            })}
          </div>
          {/* alt bilgi: patlatma kaydırıcısı + durum */}
          <div className="absolute inset-x-3 bottom-3 z-10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 rounded-full border border-line bg-bg/75 px-3 py-1.5 backdrop-blur">
              <label htmlFor="explode" className="text-xs text-dim">
                Patlatılmış görünüm
              </label>
              <input id="explode" type="range" min={0} max={1} step={0.01} value={layers.explode} onChange={(e) => setLayers((l) => ({ ...l, explode: Number(e.target.value) }))} className="w-28" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LiveBadge compact />
              <SampleDataBadge />
              <span className="rounded-full border border-line bg-bg/75 px-2.5 py-1 font-mono text-[0.68rem] text-dim backdrop-blur">
                {scenario ?? ""} · {simDate ?? ""}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-line bg-bg/75 px-2.5 py-1 font-mono text-[0.68rem] text-dim backdrop-blur" title="kare hızı · üçgen · çizim çağrısı" data-testid="perf">
                <Gauge className="size-3" aria-hidden /> {stats.fps} fps · {Math.round(stats.tris / 1000)}k üçgen · {stats.calls} çağrı
              </span>
            </div>
          </div>
          <PartCard id={selected} onClose={() => setSelected(null)} stage={stage} />
          {hover && !selected && (
            <div className="pointer-events-none absolute left-1/2 top-14 z-10 -translate-x-1/2 rounded-full bg-bg/85 px-3 py-1 font-mono text-xs text-wheat-fg">
              <Box className="mr-1 inline size-3" aria-hidden />
              {hover} — tıklayın
            </div>
          )}
        </>
      )}
    </div>
  );
}
