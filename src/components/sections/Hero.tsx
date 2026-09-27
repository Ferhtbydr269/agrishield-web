"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowDown, Box, FileCheck2, Play } from "lucide-react";
import { useLang } from "@/components/shell/useLang";
import { ParcelMap } from "@/components/ui/ParcelMap";
import { WitnessChip } from "@/components/ui/Witness";
import { DecisionBadge } from "@/components/ui/DecisionBadge";
import { SampleDataBadge } from "@/components/ui/Badges";
import { sim as simApi } from "@/lib/api";
import { formatDateTR } from "@/lib/dates";
import { focusParcel, useLive } from "@/store/sim";
import { SCENARIOS } from "@/sim/scenarios";
import { getParcel } from "@/sim/parcels";
import { CROP_LABEL, SOIL_LABEL } from "@/engine/types";

function Contours() {
  // Topoğrafik eş yükselti çizgileri — prosedürel, dış görsel yok
  const lines = Array.from({ length: 11 }, (_, i) => {
    const r = 80 + i * 46;
    return `M ${-40} ${360 + i * 6} C ${220} ${240 - r * 0.3}, ${520} ${420 + r * 0.25}, ${1480} ${250 + i * 18}`;
  });
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {lines.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="var(--soil)" strokeOpacity={0.07 + (i % 3) * 0.02} strokeWidth="1.2" />
      ))}
      <path d="M -60 120 C 380 -40, 1100 -30, 1500 180" fill="none" stroke="var(--sky)" strokeOpacity="0.28" strokeWidth="1.2" strokeDasharray="2 7" />
      <circle r="5" fill="var(--sky)">
        <animateMotion dur="26s" repeatCount="indefinite" path="M -60 120 C 380 -40, 1100 -30, 1500 180" />
      </circle>
    </svg>
  );
}

export function Hero() {
  const { t } = useLang();
  const simState = useLive((s) => s.sim);
  const latestCode = useLive((s) => s.latestCode);
  const decisions = useLive((s) => s.decisions);
  const connected = useLive((s) => s.connected);
  const f = focusParcel(simState);
  const latest = latestCode ? decisions[latestCode] : Object.values(decisions).sort((a, b) => b.ts - a.ts)[0];
  const ndvi = Object.fromEntries((simState?.parcels ?? []).map((p) => [p.id, p.ndvi]));

  const startDemo = async () => {
    const s = SCENARIOS["kuraklik-2025"];
    await simApi.load(s.key).catch(() => undefined);
    document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => void simApi.play(s.stageSpeed).catch(() => undefined), 700);
  };

  return (
    <section id="ust" className="snap-section relative overflow-hidden" aria-label="Giriş">
      <div className="bg-grid absolute inset-0 opacity-60" aria-hidden />
      <Contours />
      <div className="relative mx-auto grid min-h-[calc(100dvh-4rem)] max-w-[1360px] items-center gap-12 px-4 pb-16 pt-12 sm:px-8 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <motion.div initial={{ y: 8 }} animate={{ y: 0 }} transition={{ duration: 0.42 }} className="eyebrow text-wheat-fg">
            {t("hero.eyebrow")}
          </motion.div>
          <motion.h1
            initial={{ y: 12 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.42, delay: 0.06 }}
            className="mt-5 text-balance text-[clamp(2.7rem,6.2vw,5.6rem)] font-extrabold leading-[0.98]"
          >
            {t("hero.title")}
          </motion.h1>
          <motion.p initial={{ y: 6 }} animate={{ y: 0 }} transition={{ duration: 0.42, delay: 0.14 }} className="mt-7 max-w-2xl text-lg leading-relaxed text-dim sm:text-xl">
            {t("hero.subtitle")}
          </motion.p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void startDemo()}
              className="inline-flex items-center gap-2 rounded-full bg-wheat px-6 py-3 font-semibold text-[#1a1305] transition-transform hover:-translate-y-0.5"
              data-testid="cta-demo"
            >
              <Play className="size-4" aria-hidden /> {t("hero.ctaDemo")}
            </button>
            <a href="#saha" className="inline-flex items-center gap-2 rounded-full border border-line-strong px-6 py-3 font-semibold text-text transition-colors hover:bg-surface-2">
              <Box className="size-4" aria-hidden /> {t("hero.ctaField")}
            </a>
            <Link href="/k/7F3A" className="inline-flex items-center gap-2 rounded-full border border-line-strong px-6 py-3 font-semibold text-text transition-colors hover:bg-surface-2">
              <FileCheck2 className="size-4" aria-hidden /> {t("hero.ctaProof")}
            </Link>
          </div>

          <dl className="mt-12 grid max-w-2xl grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-surface/70" data-testid="hero-counters">
            <div className="px-4 py-4 sm:px-5">
              <dt className="eyebrow !text-[0.65rem]">{t("hero.activeParcels")}</dt>
              <dd className="mt-1.5 font-display text-3xl font-extrabold tabular" data-testid="counter-parcels">
                {simState ? simState.parcels.length : "—"}
              </dd>
            </div>
            <div className="px-4 py-4 sm:px-5">
              <dt className="eyebrow !text-[0.65rem]">{t("hero.lastDecision")}</dt>
              <dd className="mt-1.5" data-testid="counter-decision">
                {latest ? (
                  <Link href={`/k/${latest.code}`} className="group inline-flex flex-col">
                    <span className="font-mono text-lg font-bold text-text group-hover:text-wheat-fg">{latest.code}</span>
                    <span className="font-mono text-[0.7rem] text-dim">{latest.outcome === "ODE" ? "ÖDE" : latest.outcome === "GRI_BOLGE" ? "GRİ BÖLGE" : "ÖDEME YOK"} · {latest.parcelId}</span>
                  </Link>
                ) : (
                  <span className="font-display text-3xl font-extrabold">—</span>
                )}
              </dd>
            </div>
            <div className="px-4 py-4 sm:px-5">
              <dt className="eyebrow !text-[0.65rem]">{t("hero.systemStatus")}</dt>
              <dd className="mt-2" data-testid="counter-status">
                <Link href="/durum" className="inline-flex items-center gap-2 font-semibold">
                  <span className={`size-2.5 rounded-full ${connected ? "bg-green pulse-dot" : "bg-wheat"}`} aria-hidden />
                  {connected ? "çalışıyor" : "bağlanıyor"}
                </Link>
                <div className="mt-0.5 font-mono text-[0.7rem] text-dim">{simState ? `${simState.scenarioLabel}` : "…"}</div>
              </dd>
            </div>
          </dl>
        </div>

        {/* Ölçüm aleti paneli: canlı parsel + üç tanık */}
        <motion.aside
          initial={{ x: 14 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.42, delay: 0.1 }}
          className="panel ticks relative p-5"
          aria-label="Canlı parsel paneli"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="eyebrow">Parsel {f?.id ?? "P-1182"} · Siverek</div>
              <div className="mt-1 font-semibold">
                {(() => {
                  const p = getParcel(f?.id ?? "P-1182")!;
                  return `${p.irrigated ? "Sulu" : "Kıraç"} ${CROP_LABEL[p.crop].toLocaleLowerCase("tr-TR")} · ${p.areaDonum} dönüm · ${SOIL_LABEL[p.soilType].toLocaleLowerCase("tr-TR")} toprak`;
                })()}
              </div>
            </div>
            <SampleDataBadge />
          </div>
          <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-4">
            <div className="rounded-xl border border-line bg-bg/50 p-2">
              <ParcelMap ndvi={ndvi} focus={f?.id ?? "P-1182"} className="max-h-[300px]" />
            </div>
            <div className="text-right font-mono text-xs text-dim">
              <div>simülasyon günü</div>
              <div className="mt-1 text-lg font-bold text-text">{simState ? formatDateTR(simState.date, { short: true }) : "—"}</div>
              <div className="mt-3">NDVI</div>
              <div className="text-lg font-bold text-wheat-fg">{f?.ndvi != null ? f.ndvi.toFixed(2).replace(".", ",") : "—"}</div>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            <WitnessChip kind="satellite" verdict={f?.witnesses.satellite.verdict ?? null} size="sm" />
            <WitnessChip kind="station" verdict={f?.witnesses.station.verdict ?? null} size="sm" />
            <WitnessChip kind="meteo" verdict={f?.witnesses.meteo.verdict ?? null} size="sm" />
          </div>
          {f?.decision && (
            <div className="mt-4">
              <DecisionBadge outcome={f.decision.outcome} size="sm" />
            </div>
          )}
        </motion.aside>
      </div>
      <a href="#problem" className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-2 font-mono text-xs text-dim lg:flex" aria-label="Probleme in">
        <ArrowDown className="size-4 animate-bounce" aria-hidden /> kaydır
      </a>
    </section>
  );
}
