"use client";
/**
 * KIOSK / STANT MODU (/?kiosk=1) — 90 sn'lik döngü:
 *   3D tur (25 sn) → zaman makinesi hızlandırılmış kuraklık (25 sn) → karar + ödeme (20 sn) → QR ve "Asistana sor" (20 sn)
 * Herhangi bir tıklama/tuş döngüyü durdurur.
 */
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { postJson, sim as simApi } from "@/lib/api";
import { focusParcel, useLive } from "@/store/sim";
import { QR, useOrigin } from "@/components/ui/QR";
import { LogoMark } from "@/components/brand/Logo";
import { SampleDataBadge } from "@/components/ui/Badges";
import { PaymentCard } from "@/components/ui/PaymentCard";
import { PhoneMock } from "@/components/ui/PhoneMock";
import { VoteRing } from "@/components/ui/VoteRing";
import { NDVIChart, NDVILegend } from "@/components/ui/NDVIChart";
import { WitnessPanel } from "@/components/demo/WitnessPanel";
import { useFocusSeries } from "@/components/demo/useFocusSeries";
import { formatDateTR } from "@/lib/dates";
import { SEASON } from "@/sim/scenarios";

const FieldSimulator = dynamic(() => import("@/scene3d/FieldSimulator").then((m) => m.FieldSimulator), { ssr: false });

const STEPS = [
  { key: "tur", sec: 25, title: "Kurduğumuz istasyonun dijital ikizi" },
  { key: "zaman", sec: 25, title: "Kuraklık sezonu, hızlandırılmış" },
  { key: "karar", sec: 20, title: "Üç tanık → karar → ödeme" },
  { key: "qr", sec: 20, title: "Telefonunuzla deneyin" },
] as const;

export function KioskLoop({ onExit }: { onExit: () => void }) {
  const [step, setStep] = useState(0);
  const [cycle, setCycle] = useState(0);
  const origin = useOrigin();
  const sim = useLive((s) => s.sim);
  const payments = useLive((s) => s.payments);
  const sms = useLive((s) => s.sms);
  const f = focusParcel(sim);
  const series = useFocusSeries(sim?.scenario, sim?.focusParcelId);
  const started = useRef(false);

  useEffect(() => {
    const stop = () => onExit();
    const t = setTimeout(() => {
      window.addEventListener("pointerdown", stop, { once: true });
      window.addEventListener("keydown", stop, { once: true });
    }, 500);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointerdown", stop);
      window.removeEventListener("keydown", stop);
    };
  }, [onExit]);

  // döngü zamanlaması
  useEffect(() => {
    const t = setTimeout(() => {
      if (step === STEPS.length - 1) {
        setStep(0);
        setCycle((c) => c + 1);
      } else setStep((s) => s + 1);
    }, STEPS[step].sec * 1000);
    return () => clearTimeout(t);
  }, [step]);

  // sunucu hazırlığı
  useEffect(() => {
    if (step === 0) {
      started.current = true;
      void (async () => {
        await simApi.settings({ holdPayment: false }).catch(() => undefined);
        await simApi.load("kuraklik-2025").catch(() => undefined);
      })();
    }
    if (step === 1) void simApi.play(3).catch(() => undefined);
    if (step === 2 && f?.decision?.outcome === "ODE") void postJson("/api/payout", { decisionId: f.decision.id }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, cycle]);

  const s = STEPS[step];
  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-bg" data-theme="dark" data-testid="kiosk">
      <div className="flex items-center gap-4 px-10 pt-6">
        <LogoMark size={34} />
        <span className="font-display text-3xl font-extrabold">AgriShield</span>
        <span className="ml-4 text-2xl text-dim">{s.title}</span>
        <div className="ml-auto flex items-center gap-3">
          <SampleDataBadge />
          <span className="font-mono text-sm text-dim">dokunun → keşfedin</span>
        </div>
      </div>
      <div className="mx-10 mt-4 grid grid-cols-4 gap-2">
        {STEPS.map((x, i) => (
          <div key={x.key} className="h-1.5 overflow-hidden rounded-full bg-line">
            {i === step && <div key={`${cycle}-${i}`} className="h-full bg-wheat" style={{ animation: `kiosk-fill ${x.sec}s linear forwards` }} />}
            {i < step && <div className="h-full bg-green" />}
          </div>
        ))}
      </div>
      <style>{`@keyframes kiosk-fill { from { width: 0 } to { width: 100% } }`}</style>
      <div className="min-h-0 flex-1 p-10">
        {s.key === "tur" && (
          <div className="h-full overflow-hidden rounded-2xl border border-line">
            <FieldSimulator stage autoTour height="100%" />
          </div>
        )}
        {s.key === "zaman" && (
          <div className="grid h-full grid-cols-[1.6fr_1fr] gap-8">
            <div className="panel p-6">
              <div className="font-display text-6xl font-extrabold">{sim ? formatDateTR(sim.date) : "—"}</div>
              {series && sim && <NDVIChart obs={series.obs} normals={series.normals} crop={series.crop} seasonStart={SEASON.start} seasonEnd={SEASON.end} from="2026-02-01" to="2026-06-15" cursor={sim.date} stage height={400} />}
              <NDVILegend stage />
            </div>
            <WitnessPanel w={f?.witnesses} stage compact />
          </div>
        )}
        {s.key === "karar" && (
          <div className="grid h-full grid-cols-[auto_1fr_auto] items-center gap-12">
            <VoteRing verdicts={f ? { satellite: f.witnesses.satellite.verdict, station: f.witnesses.station.verdict, meteo: f.witnesses.meteo.verdict } : { satellite: null, station: null, meteo: null }} outcome={f?.decision?.outcome ?? null} size={460} />
            {f?.decision?.outcome === "ODE" ? <PaymentCard payment={payments[f.decision.code] ?? null} amountTl={f.decision.amountTl} stage /> : <div className="text-3xl text-dim">Karar bekleniyor…</div>}
            <PhoneMock messages={sms} stage />
          </div>
        )}
        {s.key === "qr" && (
          <div className="grid h-full grid-cols-3 items-center gap-12 text-center">
            <div className="flex flex-col items-center gap-5">
              {origin && <QR value={`${origin}/k/7F3A`} size={300} />}
              <div className="text-3xl font-bold">Kanıt sayfası</div>
              <div className="text-xl text-dim">Bir kararın tüm delili. Hash'i kendiniz doğrulayın.</div>
            </div>
            <div className="flex flex-col items-center gap-5">
              {origin && <QR value={`${origin}/asistan`} size={300} />}
              <div className="flex items-center gap-2 text-3xl font-bold">
                <MessageCircleQuestion className="size-8 text-violet-fg" aria-hidden /> Asistana sor
              </div>
              <div className="text-xl text-dim">"Neden blokzincir?" · "Basis risk nedir?"</div>
            </div>
            <div className="flex flex-col items-center gap-5">
              {origin && <QR value={origin} size={300} />}
              <div className="text-3xl font-bold">AgriShield</div>
              <div className="text-xl text-dim">Kuraklık Nisan'da olur. Para da Nisan'da gelmeli.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
