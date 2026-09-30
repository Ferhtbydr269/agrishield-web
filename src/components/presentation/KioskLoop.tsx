"use client";
/**
 * KIOSK / STANT MODU (/?kiosk=1) — 90 sn'lik döngü, sunumla aynı 1920×1080 tuvalde (her ekrana orantılı sığar):
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
import { PhoneMock } from "@/components/ui/PhoneMock";
import { VoteRing } from "@/components/ui/VoteRing";
import { NDVIChart, NDVILegend } from "@/components/ui/NDVIChart";
import { witnessRows } from "@/components/demo/WitnessPanel";
import { useFocusSeries } from "@/components/demo/useFocusSeries";
import { formatDateTR } from "@/lib/dates";
import { SEASON } from "@/sim/scenarios";
import { StageCanvas } from "./StageCanvas";
import { StagePayment, StageWitness } from "./stage-kit";

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
  const rows = f ? witnessRows(f.witnesses) : null;
  return (
    <StageCanvas testId="kiosk" label="AgriShield stant döngüsü">
      {/* üst */}
      <div className="absolute left-[72px] right-[72px] top-[36px] flex items-center gap-6">
        <LogoMark size={52} />
        <span className="font-display text-[44px] font-extrabold">AgriShield</span>
        <span className="ml-4 text-[34px] text-dim">{s.title}</span>
        <div className="ml-auto flex items-center gap-4">
          <SampleDataBadge className="!px-4 !py-1.5 !text-[16px]" />
          <span className="font-mono text-[20px] text-dim">dokunun → keşfedin</span>
        </div>
      </div>
      <div className="absolute left-[72px] right-[72px] top-[118px] grid grid-cols-4 gap-3">
        {STEPS.map((x, i) => (
          <div key={x.key} className="h-2.5 overflow-hidden rounded-full bg-line">
            {i === step && <div key={`${cycle}-${i}`} className="h-full bg-wheat" style={{ animation: `kiosk-fill ${x.sec}s linear forwards` }} />}
            {i < step && <div className="h-full bg-green" />}
          </div>
        ))}
      </div>
      <style>{`@keyframes kiosk-fill { from { width: 0 } to { width: 100% } }`}</style>

      {/* gövde: 1776×856 */}
      <div className="absolute bottom-[72px] left-[72px] right-[72px] top-[168px]">
        {s.key === "tur" && (
          <div className="h-full overflow-hidden rounded-3xl border border-line">
            <FieldSimulator stage autoTour height="100%" />
          </div>
        )}
        {s.key === "zaman" && (
          <div className="grid h-full grid-cols-[1fr_700px] gap-10">
            <div className="panel flex min-h-0 flex-col px-9 py-7">
              <div className="font-display text-[88px] font-extrabold leading-none">{sim ? formatDateTR(sim.date, { year: true }) : "—"}</div>
              <div className="mt-4 min-h-0 flex-1">
                {series && sim && <NDVIChart obs={series.obs} normals={series.normals} crop={series.crop} seasonStart={SEASON.start} seasonEnd={SEASON.end} from="2026-02-01" to="2026-06-15" cursor={sim.date} stage height={430} />}
              </div>
              <NDVILegend stage />
            </div>
            <div className="grid content-center gap-5">
              {rows ? rows.map((r) => <StageWitness key={r.kind} kind={r.kind} verdict={r.verdict} detail={r.detail} size="md" />) : null}
            </div>
          </div>
        )}
        {s.key === "karar" && (
          <div className="grid h-full grid-cols-[500px_1fr_400px] items-center gap-12">
            <VoteRing verdicts={f ? { satellite: f.witnesses.satellite.verdict, station: f.witnesses.station.verdict, meteo: f.witnesses.meteo.verdict } : { satellite: null, station: null, meteo: null }} outcome={f?.decision?.outcome ?? null} size={500} />
            <div className="h-[640px]">
              {f?.decision?.outcome === "ODE" ? (
                <StagePayment payment={payments[f.decision.code] ?? null} amountTl={f.decision.amountTl} />
              ) : (
                <div className="panel grid h-full place-items-center text-[34px] text-dim">Karar bekleniyor…</div>
              )}
            </div>
            <PhoneMock messages={sms} stage screenHeight={560} />
          </div>
        )}
        {s.key === "qr" && (
          <div className="grid h-full grid-cols-3 items-center gap-12 text-center">
            {[
              { url: origin ? `${origin}/k/7F3A` : "", title: "Kanıt sayfası", sub: "Bir kararın tüm delili. Hash'i kendiniz doğrulayın.", icon: false },
              { url: origin ? `${origin}/asistan` : "", title: "Asistana sor", sub: "“Neden blokzincir?” · “Basis risk nedir?”", icon: true },
              { url: origin, title: "AgriShield", sub: "Kuraklık Nisan'da olur. Para da Nisan'da gelmeli.", icon: false },
            ].map((q) => (
              <div key={q.title} className="flex flex-col items-center gap-6">
                {q.url && <QR value={q.url} size={340} />}
                <div className="flex items-center gap-3 text-[44px] font-bold">
                  {q.icon && <MessageCircleQuestion className="size-11 text-violet-fg" aria-hidden />}
                  {q.title}
                </div>
                <div className="max-w-[500px] text-[26px] leading-snug text-dim">{q.sub}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </StageCanvas>
  );
}
