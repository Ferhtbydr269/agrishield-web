"use client";
/** Sahne görünümleri (1920×1080 projeksiyon, 8–10 m'den okunur): dev tipografi, tek mesaj. */
import dynamic from "next/dynamic";
import { Keyboard } from "lucide-react";
import { COPY } from "@/content/copy";
import { SCENES } from "@/content/scenes";
import { Stat } from "@/components/ui/Stat";
import { ParcelMap } from "@/components/ui/ParcelMap";
import { TwoTimelines } from "@/components/ui/TwoTimelines";
import { NDVIChart, NDVILegend } from "@/components/ui/NDVIChart";
import { VoteRing } from "@/components/ui/VoteRing";
import { DecisionBadge } from "@/components/ui/DecisionBadge";
import { BlockCard } from "@/components/ui/BlockCard";
import { PaymentCard } from "@/components/ui/PaymentCard";
import { PhoneMock } from "@/components/ui/PhoneMock";
import { QR, useOrigin } from "@/components/ui/QR";
import { SampleDataBadge, ChainModeBadge, LiveBadge } from "@/components/ui/Badges";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { fmtNum, shortHash } from "@/components/ui/cn";
import { ThreeWitnessesInteractive } from "@/components/sections/Solution";
import { PremiumCalculator } from "@/components/sections/PremiumCalculator";
import { WitnessPanel } from "@/components/demo/WitnessPanel";
import { DecisionPipeline } from "@/components/demo/DecisionPipeline";
import { LiveMoisturePanel } from "@/components/demo/LiveMoisture";
import { useFocusSeries } from "@/components/demo/useFocusSeries";
import { formatDateTR } from "@/lib/dates";
import { SEASON } from "@/sim/scenarios";
import { focusParcel, useLive } from "@/store/sim";

const FieldSimulator = dynamic(() => import("@/scene3d/FieldSimulator").then((m) => m.FieldSimulator), { ssr: false });

function SceneTitle({ i, children, sub }: { i: number; children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-7">
      <div className="font-mono text-[18px] uppercase tracking-[0.2em] text-wheat-fg">
        {SCENES[i].key} · {SCENES[i].title}
      </div>
      <h2 className="mt-3 text-[56px] font-extrabold leading-[1.04] xl:text-[64px]">{children}</h2>
      {sub && <div className="mt-4 max-w-[1300px] text-[24px] leading-snug text-dim">{sub}</div>}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-1.5 font-mono text-[16px] text-dim">
      <Keyboard className="size-4" aria-hidden /> {children}
    </span>
  );
}

/* 1 · Mehmet Amca */
export function SceneMehmet() {
  const sim = useLive((s) => s.sim);
  const ndvi = Object.fromEntries((sim?.parcels ?? []).map((p) => [p.id, p.ndvi]));
  return (
    <div className="grid h-full grid-cols-[1.25fr_1fr] items-center gap-14">
      <div>
        <SceneTitle i={0} sub="Siverek'te 80 dönüm kıraç buğday. Mart'ta yağmur yok, Nisan'da buğday başak vermeden sararıyor. Kredi Haziran'da; sigortanın parası hasattan sonra.">
          Kuraklık Nisan'da,
          <br />
          para Eylül'de.
        </SceneTitle>
        <div className="grid grid-cols-2 gap-10">
          <Stat factId="sanliurfaKayip2025" size="xl" tone="red" />
          <Stat factId="era5Sezon2025Acik" size="xl" tone="wheat" label="Siverek 2024–25 sezonu yağış açığı (ERA5)" />
        </div>
        <p className="mt-8 text-[18px] text-dim">{COPY.mehmetNote}</p>
      </div>
      <div className="panel ticks p-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[18px] text-dim">P-1182 · Karakoyun · Siverek</span>
          <SampleDataBadge />
        </div>
        <ParcelMap ndvi={ndvi} focus="P-1182" showVillage stage className="max-h-[600px]" />
      </div>
    </div>
  );
}

/* 2 · Bugün nasıl ödeniyor */
export function SceneTimelines() {
  return (
    <div className="flex h-full flex-col justify-center">
      <SceneTitle i={1}>Köy ortalaması iyiyse hiç ödenmiyor.</SceneTitle>
      <TwoTimelines stage />
      <div className="mt-8 grid grid-cols-3 gap-10">
        <Stat factId="koyBazliOdemeSuresi" size="lg" />
        <Stat factId="hasarIhbari2024" size="lg" />
        <Stat factId="tekirdagPilotKatilim" size="lg" tone="green" />
      </div>
    </div>
  );
}

/* 3 · Üç tanık */
export function SceneWitnesses() {
  return (
    <div className="flex h-full flex-col justify-center">
      <SceneTitle i={2} sub="Zararı değil, zarara sebep olan olayı ölçüyoruz. Yapay zekâ tanık değil, hakem.">
        Üç tanık. İkisi yeterli.
      </SceneTitle>
      <ThreeWitnessesInteractive stage />
    </div>
  );
}

/* 4 · 3D saha */
export function SceneField({ preset }: { preset: number }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-end justify-between">
        <SceneTitle i={3}>Kurduğumuz istasyonun dijital ikizi.</SceneTitle>
        <Hint>Shift+1–6 kamera · L etiket · X kesit · E patlat · F veri akışı</Hint>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-line">
        <ErrorBoundary label="3D saha">
          <FieldSimulator stage initialPreset={preset} height="100%" />
        </ErrorBoundary>
      </div>
    </div>
  );
}

/* 5 · Jüri testi */
export function SceneJury() {
  return (
    <div className="flex h-full flex-col">
      <SceneTitle i={4}>Sayın jüri, sensörü kuru toprağa koyar mısınız?</SceneTitle>
      <div className="grid min-h-0 flex-1 grid-cols-[1.3fr_1fr] gap-8">
        <div className="min-h-0 overflow-hidden rounded-2xl border border-line">
          <ErrorBoundary label="3D kesit">
            <FieldSimulator stage initialPreset={3} liveSoil height="100%" />
          </ErrorBoundary>
        </div>
        <div className="min-h-0">
          <LiveMoisturePanel stage />
        </div>
      </div>
    </div>
  );
}

/* 6 · Zaman makinesi */
export function SceneTimeMachine() {
  const sim = useLive((s) => s.sim);
  const f = focusParcel(sim);
  const series = useFocusSeries(sim?.scenario, sim?.focusParcelId);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-8">
        <SceneTitle i={5}>
          {sim ? formatDateTR(sim.date) : "—"}
        </SceneTitle>
        <div className="flex flex-col items-end gap-3 pt-2">
          <SampleDataBadge />
          <Hint>Space oynat/duraklat</Hint>
          <div className="font-mono text-[22px] text-dim">{sim?.playing ? `1 sn = ${sim.speed} gün` : "duraklatıldı"}</div>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[1.6fr_1fr] gap-8">
        <div className="panel p-6">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-mono text-[20px] text-dim">NDVI · {f?.id} · {f?.window.label}</span>
            <span className="font-mono text-[30px] font-bold text-wheat-fg">{f?.ndvi != null ? fmtNum(f.ndvi, 2) : "—"}</span>
          </div>
          {series && sim && (
            <NDVIChart obs={series.obs} normals={series.normals} crop={series.crop} seasonStart={SEASON.start} seasonEnd={SEASON.end} from="2026-02-01" to="2026-06-15" cursor={sim.date} stage height={420} decisionDate={f?.decision?.simDate} />
          )}
          <div className="mt-3">
            <NDVILegend stage />
          </div>
        </div>
        <WitnessPanel w={f?.witnesses} stage compact />
      </div>
    </div>
  );
}

/* 7 · Karar */
export function SceneDecision() {
  const sim = useLive((s) => s.sim);
  const blocks = useLive((s) => s.blocks);
  const f = focusParcel(sim);
  const d = f?.decision ?? null;
  const v = f ? { satellite: f.witnesses.satellite.verdict, station: f.witnesses.station.verdict, meteo: f.witnesses.meteo.verdict } : { satellite: null, station: null, meteo: null };
  const block = d ? blocks.find((b) => b.decisionCode === d.code && b.kind === "decision") : null;
  return (
    <div className="grid h-full grid-cols-[1fr_1.15fr] items-center gap-14">
      <div className="flex flex-col items-center">
        <VoteRing verdicts={v} outcome={d?.outcome ?? null} size={560} />
      </div>
      <div>
        <SceneTitle i={6}>{d ? (d.outcome === "ODE" ? `${d.yesCount}/3 EVET → ÖDE` : d.outcome === "GRI_BOLGE" ? "1/3 → GRİ BÖLGE" : "0/3 → ÖDEME YOK") : "Karar bekleniyor"}</SceneTitle>
        {d ? (
          <div className="grid gap-6">
            <DecisionPipeline decision={d} stage />
            {block && (
              <div className="max-w-[640px]">
                <div className="mb-2 flex items-center gap-3">
                  <ChainModeBadge />
                  <span className="font-mono text-[18px] text-dim">tx {shortHash(d.txHash, 10)}</span>
                </div>
                <BlockCard block={block} highlight />
              </div>
            )}
          </div>
        ) : (
          <p className="text-[28px] text-dim">Zaman makinesini oynatın (6. sahne, Space). Tanıklardan ikisi EVET dediğinde karar burada belirir.</p>
        )}
      </div>
    </div>
  );
}

/* 8 · Ödeme */
export function ScenePayment() {
  const sim = useLive((s) => s.sim);
  const payments = useLive((s) => s.payments);
  const sms = useLive((s) => s.sms);
  const origin = useOrigin();
  const f = focusParcel(sim);
  const d = f?.decision;
  return (
    <div className="grid h-full grid-cols-[1.3fr_auto_auto] items-center gap-10">
      <div>
        <SceneTitle i={7}>Para FAST ile IBAN'a. Kripto yok.</SceneTitle>
        {d?.outcome === "ODE" ? <PaymentCard payment={payments[d.code] ?? null} amountTl={d.amountTl} stage /> : <p className="text-[28px] text-dim">Önce bir ödeme kararı gerekiyor (6–7. sahne).</p>}
      </div>
      <PhoneMock messages={sms} stage />
      <div className="flex flex-col items-center gap-4">
        {d && origin && <QR value={`${origin}/k/${d.code}`} size={260} label={`kanıt: /k/${d.code}`} />}
        <p className="max-w-[260px] text-center text-[20px] text-dim">Telefonunuzla okutun: kararın tüm delili, hash'i kendiniz doğrulayın.</p>
      </div>
    </div>
  );
}

/* 9 · Manipülasyon */
export function SceneManipulation() {
  const sim = useLive((s) => s.sim);
  const f = focusParcel(sim);
  const flags = sim?.station.flags ?? [];
  const d = f?.decision;
  const v = f ? { satellite: f.witnesses.satellite.verdict, station: f.witnesses.station.verdict, meteo: f.witnesses.meteo.verdict } : { satellite: null, station: null, meteo: null };
  return (
    <div className="grid h-full grid-cols-[1.3fr_1fr] items-center gap-12">
      <div>
        <SceneTitle i={8} sub="Yağış yokken bir saatte +15 puan nem: sensör sulandı. İstasyon tanığı devre dışı; tek tanık kalıyor.">
          {sim ? formatDateTR(sim.date) : "—"}
        </SceneTitle>
        <WitnessPanel w={f?.witnesses} stage compact />
        {flags.length > 0 && (
          <div className="mt-6 rounded-2xl border-2 border-wheat bg-wheat/10 p-5 text-[24px] text-wheat-fg" role="alert">
            ŞÜPHELİ VERİ: {flags[flags.length - 1].label} — {flags[flags.length - 1].detail}
          </div>
        )}
        <div className="mt-6 flex gap-3">
          <Hint>Space oynat</Hint>
          <LiveBadge />
        </div>
      </div>
      <div className="flex flex-col items-center gap-8">
        <VoteRing verdicts={v} outcome={d?.outcome ?? null} size={420} />
        {d && <DecisionBadge outcome={d.outcome} size="lg" />}
      </div>
    </div>
  );
}

/* 0 · Ticari */
export function SceneCommercial({ backtestP }: { backtestP: number }) {
  return (
    <div className="grid h-full grid-cols-[1.1fr_1fr] items-center gap-10">
      <div>
        <SceneTitle i={9} sub={COPY.commercial.body}>
          Çiftçiden değil, sigortacıdan.
        </SceneTitle>
        <div className="grid grid-cols-2 gap-x-10 gap-y-8">
          <Stat factId="samYillik" size="lg" tone="wheat" />
          <Stat factId="somUst" size="lg" tone="green" label="SOM üst sınır (ilk 3 yıl, %5)" />
          <Stat factId="izlemeUcreti" size="lg" />
          <Stat factId="tarsimBitkiselPolice2024" size="lg" />
        </div>
      </div>
      <PremiumCalculator backtestP={backtestP} stage />
    </div>
  );
}
