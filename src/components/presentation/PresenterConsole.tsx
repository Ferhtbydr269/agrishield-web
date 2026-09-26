"use client";
/**
 * /sunucu — İKİNCİ EKRAN (AGRISHIELD_PROMPT.md 13.2): sıradaki sahne, konuşma notu, süre,
 * "şimdi ne diyeceğim" satırı ve acil düğmeler. Buradaki tuş / ekranındaki sahneyi de değiştirir (SSE).
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FastForward, MonitorPlay, MonitorOff, Moon, Pause, Play, RefreshCcw, RotateCcw, Radio, Sun, Droplets, Eraser, Timer, Landmark } from "lucide-react";
import { SCENES } from "@/content/scenes";
import { addDays, formatDateTR } from "@/lib/dates";
import { postJson, sim as simApi } from "@/lib/api";
import { SCENARIOS, type ScenarioKey } from "@/sim/scenarios";
import { usePresentation } from "@/store/presentation";
import { useDevice } from "@/store/device";
import { focusParcel, useLive } from "@/store/sim";
import { StageTimer } from "./StageTimer";
import { LogoMark } from "@/components/brand/Logo";
import { ConnectionBadge, LiveBadge, ChainModeBadge } from "@/components/ui/Badges";
import { WitnessChip } from "@/components/ui/Witness";
import { DecisionBadge } from "@/components/ui/DecisionBadge";
import { cn } from "@/components/ui/cn";

function Btn({ onClick, children, tone = "dim", big = false, title }: { onClick: () => void; children: React.ReactNode; tone?: "dim" | "wheat" | "red" | "green"; big?: boolean; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition-colors",
        big ? "px-5 py-4 text-lg" : "px-3.5 py-2.5 text-sm",
        tone === "wheat" && "border-wheat bg-wheat/15 text-wheat-fg hover:bg-wheat/25",
        tone === "red" && "border-red/60 bg-red/10 text-red-fg hover:bg-red/20",
        tone === "green" && "border-green/60 bg-green/10 text-green-fg hover:bg-green/20",
        tone === "dim" && "border-line bg-surface text-text hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}

export function PresenterConsole() {
  const { index, present, blackout, startedAt, setScene, next, prev, togglePresent, toggleBlackout, resetTimer } = usePresentation();
  const sim = useLive((s) => s.sim);
  const log = useLive((s) => s.log);
  const payments = useLive((s) => s.payments);
  const device = useDevice((s) => s.state);
  const [sceneStartedAt, setSceneStartedAt] = useState(() => Date.now());
  const [msg, setMsg] = useState<string | null>(null);
  const f = focusParcel(sim);
  const scene = SCENES[index];
  const upcoming = SCENES[index + 1];

  useEffect(() => setSceneStartedAt(Date.now()), [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") next();
      else if (e.key === "ArrowLeft" || e.key === "PageUp") prev();
      else if (/^[0-9]$/.test(e.key)) setScene(e.key === "0" ? 9 : Number(e.key) - 1);
      else if (e.key === " ") {
        e.preventDefault();
        const s = useLive.getState().sim;
        if (s) void simApi.play(s.playing ? 0 : s.speed || SCENARIOS[s.scenario].stageSpeed);
      } else if (e.key === "b" || e.key === "B") toggleBlackout();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, setScene, toggleBlackout]);

  const act = async (label: string, fn: () => Promise<unknown>) => {
    setMsg(`${label}…`);
    try {
      await fn();
      setMsg(`${label}: tamam`);
    } catch (e) {
      setMsg(`${label}: ${e instanceof Error ? e.message : "hata"}`);
    }
    setTimeout(() => setMsg(null), 3500);
  };

  // Acil: senaryoyu karar gününün 2 gün öncesine sar ve hızlı oynat
  const fastForward = () =>
    act("Senaryo ileri sarıldı", async () => {
      const key = (sim?.scenario ?? "kuraklik-2025") as ScenarioKey;
      const meta = SCENARIOS[key];
      if (f?.decision) await simApi.load(key);
      await simApi.seek(addDays(meta.expected.date, -2));
      await simApi.play(2);
    });

  const heldDecision = f?.decision && payments[f.decision.code]?.phase === "held" ? f.decision : null;

  return (
    <div className="min-h-dvh bg-bg p-5 text-text" data-theme="dark">
      <header className="flex flex-wrap items-center gap-3">
        <LogoMark size={28} />
        <span className="font-display text-xl font-extrabold">Sunucu ekranı</span>
        <ConnectionBadge />
        <LiveBadge />
        <ChainModeBadge />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Link href="/" target="_blank" className="rounded-full border border-line px-3 py-1.5 text-sm text-dim hover:text-text">
            Ana ekranı aç ↗
          </Link>
        </div>
      </header>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        {/* şimdiki sahne */}
        <section className="panel ticks p-6" aria-live="polite">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-mono text-sm uppercase tracking-widest text-wheat-fg">
                Şimdi · sahne {scene.key} / 10 · {scene.speaker}
              </div>
              <h1 className="mt-2 text-5xl font-extrabold">{scene.title}</h1>
              <p className="mt-2 text-dim">{scene.screen}</p>
            </div>
            <StageTimer startedAt={startedAt} sceneIndex={index} sceneStartedAt={sceneStartedAt} large />
          </div>
          <div className="mt-6 rounded-2xl border border-line bg-surface-2 p-5">
            <div className="eyebrow">Söylenecek cümle</div>
            <p className="mt-2 text-3xl font-semibold leading-snug">“{scene.note}”</p>
          </div>
          <div className="mt-4 rounded-2xl border border-wheat/50 bg-wheat/10 p-4">
            <div className="eyebrow !text-wheat-fg">Şimdi ne diyeceğim / ne yapacağım</div>
            <p className="mt-1 text-xl">{scene.cue}</p>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Btn onClick={prev} big>
              <ChevronLeft className="size-5" aria-hidden /> Önceki
            </Btn>
            <Btn onClick={next} big tone="wheat">
              Sonraki <ChevronRight className="size-5" aria-hidden />
            </Btn>
            {upcoming && (
              <div className="text-dim">
                Sıradaki: <b className="text-text">{upcoming.key} · {upcoming.title}</b> — “{upcoming.note}”
              </div>
            )}
          </div>
          <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-10">
            {SCENES.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setScene(i)}
                className={cn("rounded-lg border px-2 py-2 text-left", i === index ? "border-wheat bg-wheat/15" : i < index ? "border-green/40 bg-green/5" : "border-line")}
              >
                <div className="font-mono text-xs text-dim">{s.key}</div>
                <div className="truncate text-xs font-semibold">{s.title}</div>
              </button>
            ))}
          </div>
        </section>

        {/* durum + acil düğmeler */}
        <section className="grid content-start gap-5">
          <div className="panel p-5">
            <div className="eyebrow">Ana ekran</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Btn onClick={() => togglePresent()} tone={present ? "green" : "dim"}>
                {present ? <MonitorOff className="size-4" aria-hidden /> : <MonitorPlay className="size-4" aria-hidden />} {present ? "Sunum modu açık" : "Sunum modunu aç"}
              </Btn>
              <Btn onClick={toggleBlackout} tone={blackout ? "red" : "dim"}>
                <Moon className="size-4" aria-hidden /> {blackout ? "Karartma açık (B)" : "Karart (B)"}
              </Btn>
              <Btn onClick={resetTimer}>
                <Timer className="size-4" aria-hidden /> Süreyi sıfırla
              </Btn>
              <Btn onClick={() => void act("Ana ekran yenileniyor", () => postJson("/api/scene", { reload: true, origin: "sunucu" }))} tone="red" title="Ana ekran takılırsa">
                <RefreshCcw className="size-4" aria-hidden /> Sahneyi yeniden yükle
              </Btn>
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <div className="eyebrow">Zaman makinesi · {sim?.scenarioLabel}</div>
              <span className="font-mono text-sm text-dim">{sim ? formatDateTR(sim.date, { short: true }) : "—"}</span>
            </div>
            <div className="mt-3 grid gap-2">
              <WitnessChip kind="satellite" verdict={f?.witnesses.satellite.verdict ?? null} size="sm" />
              <WitnessChip kind="station" verdict={f?.witnesses.station.verdict ?? null} size="sm" />
              <WitnessChip kind="meteo" verdict={f?.witnesses.meteo.verdict ?? null} size="sm" />
            </div>
            {f?.decision && (
              <div className="mt-3 flex items-center gap-3">
                <DecisionBadge outcome={f.decision.outcome} size="sm" />
                <span className="font-mono text-sm text-dim">/k/{f.decision.code} · {f.decision.status}</span>
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Btn onClick={() => void (sim && simApi.play(sim.playing ? 0 : sim.speed || SCENARIOS[sim.scenario].stageSpeed))} tone="wheat">
                {sim?.playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />} {sim?.playing ? "Duraklat" : "Oynat"} (Space)
              </Btn>
              <Btn onClick={() => void act("Sıfırlandı", () => simApi.reset())}>
                <RotateCcw className="size-4" aria-hidden /> Sıfırla (R)
              </Btn>
              <Btn onClick={fastForward} tone="red" title="Karar gününün 2 gün öncesine sar ve oynat">
                <FastForward className="size-4" aria-hidden /> Senaryoyu ileri sar
              </Btn>
              {heldDecision ? (
                <Btn onClick={() => void act("Ödeme gönderildi", () => postJson("/api/payout", { decisionId: heldDecision.id }))} tone="green">
                  <Landmark className="size-4" aria-hidden /> Ödemeyi şimdi gönder
                </Btn>
              ) : (
                <Btn onClick={() => void act("Kuraklık yüklendi", () => simApi.load("kuraklik-2025"))}>Kuraklık senaryosu</Btn>
              )}
              <Btn onClick={() => void act("Manipülasyon yüklendi", async () => {
                await simApi.load("manipulasyon");
                await simApi.seek(SCENARIOS.manipulasyon.stageStart);
              })}>Manipülasyon senaryosu</Btn>
              <Btn onClick={() => void act("Gri bölge yüklendi", () => simApi.load("gri-bolge"))}>Gri bölge senaryosu</Btn>
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <div className="eyebrow">Donanım (yer istasyonu)</div>
              <span className="font-mono text-sm">{device?.lastReading?.soilMoisture != null ? `%${device.lastReading.soilMoisture.toFixed(1).replace(".", ",")}` : "—"}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Btn onClick={() => void act("Donanım simülasyona çevrildi", () => postJson("/api/device", { forceSim: !device?.forceSim }))} tone={device?.forceSim ? "red" : "dim"}>
                <Radio className="size-4" aria-hidden /> {device?.forceSim ? "Simülasyon zorlanıyor (geri al)" : "Donanımı simülasyona çevir"}
              </Btn>
              <Btn onClick={() => void act("Bayraklar temizlendi", () => postJson("/api/device", { clearFlags: true }))}>
                <Eraser className="size-4" aria-hidden /> Şüpheli bayrakları temizle
              </Btn>
              <Btn onClick={() => void postJson("/api/device", { pot: "kuru" })}>
                <Sun className="size-4" aria-hidden /> Simüle: kuru saksı
              </Btn>
              <Btn onClick={() => void postJson("/api/device", { pot: "islak" })}>
                <Droplets className="size-4" aria-hidden /> Simüle: ıslak saksı
              </Btn>
            </div>
            <p className="mt-2 text-xs text-dim">Cihaz 20 sn veri göndermezse simüle cihaz otomatik devreye girer; rozet değişir.</p>
          </div>

          <div className="panel p-5">
            <div className="eyebrow">Son olaylar</div>
            <ul className="mt-2 grid gap-1 text-sm">
              {log.slice(0, 6).map((l) => (
                <li key={l.id} className="truncate">
                  <span className="font-mono text-xs text-dim">{new Date(l.at).toLocaleTimeString("tr-TR")}</span> {l.text}
                </li>
              ))}
            </ul>
          </div>
          {msg && <div className="fixed bottom-4 right-4 rounded-xl border border-line bg-surface px-4 py-3 shadow-xl" role="status">{msg}</div>}
        </section>
      </div>
    </div>
  );
}
