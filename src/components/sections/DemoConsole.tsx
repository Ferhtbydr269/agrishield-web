"use client";
import { AnimatePresence, motion } from "motion/react";
import { BrainCircuit } from "lucide-react";
import { useLive, focusParcel } from "@/store/sim";
import { Section } from "@/components/ui/Section";
import { NDVIChart, NDVILegend } from "@/components/ui/NDVIChart";
import { VoteRing } from "@/components/ui/VoteRing";
import { PhoneMock } from "@/components/ui/PhoneMock";
import { PaymentCard } from "@/components/ui/PaymentCard";
import { BlockCard } from "@/components/ui/BlockCard";
import { ChainModeBadge } from "@/components/ui/Badges";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { fmtTl } from "@/components/ui/cn";
import { SCENARIOS, SEASON, type ScenarioKey } from "@/sim/scenarios";
import { DecisionPipeline } from "@/components/demo/DecisionPipeline";
import { EventLog } from "@/components/demo/EventLog";
import { LiveMoisturePanel } from "@/components/demo/LiveMoisture";
import { ScenarioPicker, TimeMachine } from "@/components/demo/TimeMachine";
import { useFocusSeries } from "@/components/demo/useFocusSeries";
import { WitnessPanel } from "@/components/demo/WitnessPanel";

export function DecisionAnnouncer() {
  const code = useLive((s) => s.latestCode);
  const d = useLive((s) => (s.latestCode ? s.decisions[s.latestCode] : null));
  const text = d
    ? `Karar: ${d.outcome === "ODE" ? `öde, ${fmtTl(d.amountTl)} TL` : d.outcome === "GRI_BOLGE" ? "gri bölge, eksper incelemesi" : "ödeme yok"}`
    : "";
  return (
    <div className="sr-only" aria-live="polite" role="status" key={code ?? "none"}>
      {text}
    </div>
  );
}

export function EarlyWarningCard() {
  const early = useLive((s) => s.early);
  const runId = useLive((s) => s.sim?.runId);
  if (!early) return null;
  return (
    <AnimatePresence>
      <motion.div key={`${runId}-${early.at}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="panel border-violet/50 p-4">
        <div className="flex items-center gap-2 text-violet-fg">
          <BrainCircuit className="size-4" aria-hidden />
          <span className="eyebrow !text-violet-fg">Hakem erken uyarısı · {early.date}</span>
        </div>
        <p className="mt-2 text-sm leading-snug">{early.text}</p>
        <p className="mt-1 text-xs text-dim">Tahmin ödeme kararı değildir; yalnız önlem içindir.</p>
      </motion.div>
    </AnimatePresence>
  );
}

export function DemoConsole() {
  const sim = useLive((s) => s.sim);
  const blocks = useLive((s) => s.blocks);
  const sms = useLive((s) => s.sms);
  const payments = useLive((s) => s.payments);
  const f = focusParcel(sim);
  const series = useFocusSeries(sim?.scenario, sim?.focusParcelId);
  const decision = f?.decision ?? null;
  const meta = sim ? SCENARIOS[sim.scenario as ScenarioKey] : null;
  const voteVerdicts = f
    ? { satellite: f.witnesses.satellite.verdict, station: f.witnesses.station.verdict, meteo: f.witnesses.meteo.verdict }
    : { satellite: null, station: null, meteo: null };

  return (
    <Section
      id="demo"
      index="05"
      eyebrow="Canlı demo"
      title="Zaman makinesi, karar, zincir, ödeme."
      lead="Sunucudaki zaman makinesi tek gerçeğin kaynağıdır; sahnedeki tüm ekranlar aynı anda aynı günü görür. Tanıklardan ikisi EVET dediğinde karar otomatik üretilir."
      detailHref={f ? `/parsel/${f.id}` : undefined}
      detailLabel="Parsel detayı"
    >
      <DecisionAnnouncer />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <ScenarioPicker />
        {meta && <p className="max-w-2xl text-sm text-dim">{meta.description}</p>}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div className="grid content-start gap-6">
          <ErrorBoundary label="Zaman makinesi">
            <TimeMachine />
          </ErrorBoundary>
          <ErrorBoundary label="NDVI grafiği">
            <div className="panel p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="eyebrow">NDVI · {f?.id ?? "—"} · {f?.window.label ?? ""}</div>
                <div className="font-mono text-sm">
                  NDVI <b className="text-wheat-fg">{f?.ndvi != null ? f.ndvi.toFixed(2).replace(".", ",") : "—"}</b>
                  <span className="text-dim"> / normal {f?.ndviNormal != null ? f.ndviNormal.toFixed(2).replace(".", ",") : "—"}</span>
                </div>
              </div>
              {series && sim ? (
                <NDVIChart obs={series.obs} normals={series.normals} crop={series.crop} seasonStart={SEASON.start} seasonEnd={SEASON.end} cursor={sim.date} decisionDate={decision?.simDate} />
              ) : (
                <div className="h-[260px] animate-pulse rounded-lg bg-surface-2" />
              )}
              <div className="mt-3">
                <NDVILegend />
              </div>
            </div>
          </ErrorBoundary>
          <ErrorBoundary label="Tanıklar">
            <div className="panel p-5">
              <div className="eyebrow mb-3">Üç tanık · {sim?.date ?? ""}</div>
              <WitnessPanel w={f?.witnesses} />
            </div>
          </ErrorBoundary>
        </div>
        <div className="grid content-start gap-6">
          <ErrorBoundary label="Oylama">
            <div className="panel ticks flex flex-col items-center p-5" data-testid="vote-panel">
              <div className="eyebrow self-start">Oylama halkası · akıllı sözleşme EVET'leri sayar</div>
              <div className="my-4">
                <VoteRing verdicts={voteVerdicts} outcome={decision?.outcome ?? null} size={250} />
              </div>
              <div className="w-full">
                <DecisionPipeline decision={decision} />
              </div>
            </div>
          </ErrorBoundary>
          <EarlyWarningCard />
          <ErrorBoundary label="Canlı donanım">
            <LiveMoisturePanel />
          </ErrorBoundary>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto_1fr]">
        <div className="grid content-start gap-6">
          {decision?.outcome === "ODE" && <PaymentCard payment={payments[decision.code] ?? null} amountTl={decision.amountTl} />}
          <div className="panel p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="eyebrow">Zincir blokları</div>
              <ChainModeBadge />
            </div>
            <div className="grid gap-3">
              {blocks.slice(0, 3).map((b, i) => (
                <BlockCard key={`${b.number}-${b.txHash}`} block={b} highlight={i === 0 && b.decisionCode === decision?.code} compact />
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-center">
          <PhoneMock messages={sms} />
        </div>
        <EventLog />
      </div>
    </Section>
  );
}
