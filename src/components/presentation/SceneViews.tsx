"use client";
/**
 * SAHNE GÖRÜNÜMLERİ — sabit 1920×1080 tuval (StageCanvas), içerik alanı 1728×804 px.
 * Her sahne tek mesaj taşır; yazılar 8–10 m'den okunacak boyutta (stage-kit.tsx tipografi ölçeği).
 */
import dynamic from "next/dynamic";
import { useState } from "react";
import { COPY } from "@/content/copy";
import { outcomeFor } from "@/engine/decision";
import { CROP_LABEL, SOIL_LABEL, type Verdict, type WitnessKey } from "@/engine/types";
import { ParcelMap } from "@/components/ui/ParcelMap";
import { NDVIChart, NDVILegend } from "@/components/ui/NDVIChart";
import { VoteRing } from "@/components/ui/VoteRing";
import { DecisionBadge } from "@/components/ui/DecisionBadge";
import { PhoneMock } from "@/components/ui/PhoneMock";
import { QR, useOrigin } from "@/components/ui/QR";
import { LiveBadge, SampleDataBadge } from "@/components/ui/Badges";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { fmtNum, shortHash } from "@/components/ui/cn";
import { witnessRows } from "@/components/demo/WitnessPanel";
import { useFocusSeries } from "@/components/demo/useFocusSeries";
import { formatDateTR } from "@/lib/dates";
import { SEASON } from "@/sim/scenarios";
import { getParcel } from "@/sim/parcels";
import { focusParcel, useLive } from "@/store/sim";
import { Eyebrow, KeyHint, StageMoisture, StagePayment, StagePipeline, StagePricing, StageStat, StageTimelines, StageWitness, Sub, Title } from "./stage-kit";

const FieldSimulator = dynamic(() => import("@/scene3d/FieldSimulator").then((m) => m.FieldSimulator), { ssr: false });

const verdictsOf = (f: ReturnType<typeof focusParcel>) =>
  f ? { satellite: f.witnesses.satellite.verdict, station: f.witnesses.station.verdict, meteo: f.witnesses.meteo.verdict } : { satellite: null, station: null, meteo: null };

/* 1 · Mehmet Amca */
export function SceneMehmet() {
  const sim = useLive((s) => s.sim);
  const ndvi = Object.fromEntries((sim?.parcels ?? []).map((p) => [p.id, p.ndvi]));
  const p = getParcel("P-1182")!;
  return (
    <div className="grid h-full grid-cols-[1000px_1fr] items-center gap-16">
      <div>
        <Eyebrow i={0} />
        <Title size={96}>
          Kuraklık Nisan&apos;da,
          <br />
          para Eylül&apos;de.
        </Title>
        <Sub className="max-w-[960px]">Siverek&apos;te 80 dönüm kıraç buğday. Mart&apos;ta yağmur yok, Nisan&apos;da buğday başak vermeden sararıyor. Kredi Haziran&apos;da; sigortanın parası hasattan sonra.</Sub>
        <div className="mt-12 grid grid-cols-2 gap-12">
          <StageStat factId="sanliurfaKayip2025" size={104} tone="red" />
          <StageStat factId="era5Sezon2025Acik" size={104} tone="wheat" label="Siverek 2024–25 sezonu yağış açığı (ERA5)" />
        </div>
        <p className="mt-10 text-[20px] leading-snug text-dim">{COPY.mehmetNote}</p>
      </div>
      <div className="panel ticks flex h-full min-h-0 flex-col p-8">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[22px] text-dim">P-1182 · Karakoyun, Siverek</span>
          <SampleDataBadge className="!px-4 !py-1.5 !text-[15px]" />
        </div>
        <div className="grid min-h-0 flex-1 place-items-center py-4">
          <ParcelMap ndvi={ndvi} focus="P-1182" showVillage stage className="h-full max-h-[600px]" />
        </div>
        <div className="text-[22px] text-dim">
          {p.irrigated ? "Sulu" : "Kıraç"} {CROP_LABEL[p.crop].toLocaleLowerCase("tr-TR")} · {p.areaDonum} dönüm · {SOIL_LABEL[p.soilType].toLocaleLowerCase("tr-TR")} toprak · örnek senaryo
        </div>
      </div>
    </div>
  );
}

/* 2 · Bugün nasıl ödeniyor */
export function SceneTimelines() {
  return (
    <div className="flex h-full flex-col">
      <Eyebrow i={1} />
      <Title size={80}>Köy ortalaması iyiyse hiç ödenmiyor.</Title>
      <div className="mt-8">
        <StageTimelines />
      </div>
      <div className="mt-auto grid grid-cols-3 gap-14">
        <StageStat factId="koyBazliOdemeSuresi" size={64} label="Ödeme, köy verimi açıklandıktan sonra" />
        <StageStat factId="hasarIhbari2024" size={64} label="Hasar ihbarı (2024): her birine eksper" />
        <StageStat factId="tekirdagPilotKatilim" size={64} tone="green" />
      </div>
    </div>
  );
}

/* 3 · Üç tanık (tıklanabilir oylama) */
const CYCLE: Verdict[] = ["EVET", "HAYIR", "VERI_YOK"];
const DESC: Record<WitnessKey, string> = {
  satellite: "~5 günde bir: NDVI, aynı dönemin normaline göre düştü mü?",
  station: "Köyün tarafsız istasyonu: 30 günlük yağış ve kök bölgesi nemi.",
  meteo: "Resmi / bağımsız bölgesel veri: SPI-30 kuraklık indisi.",
};

export function SceneWitnesses() {
  const [v, setV] = useState<Record<WitnessKey, Verdict>>({ satellite: "EVET", station: "EVET", meteo: "HAYIR" });
  const yes = (Object.values(v) as Verdict[]).filter((x) => x === "EVET").length;
  const outcome = outcomeFor(yes);
  const cycle = (k: WitnessKey) => setV((s) => ({ ...s, [k]: CYCLE[(CYCLE.indexOf(s[k]) + 1) % CYCLE.length] }));
  return (
    <div className="flex h-full flex-col">
      <Eyebrow i={2} />
      <Title size={80}>Üç tanık. İkisi yeterli.</Title>
      <Sub>Zararı değil, zarara sebep olan olayı ölçüyoruz. Yapay zekâ tanık değil, hakem.</Sub>
      <div className="mt-8 grid min-h-0 flex-1 grid-cols-[1fr_460px] items-center gap-16">
        <div className="grid gap-5">
          {(["satellite", "station", "meteo"] as WitnessKey[]).map((k) => (
            <StageWitness key={k} kind={k} verdict={v[k]} detail={DESC[k]} onClick={() => cycle(k)} />
          ))}
          <p className="text-[20px] text-dim">Tanığa tıklayın: EVET → HAYIR → VERİ YOK. VERİ YOK oy sayılmaz.</p>
        </div>
        <div className="flex flex-col items-center gap-6">
          <VoteRing key={JSON.stringify(v)} verdicts={v} outcome={outcome} size={400} />
          <DecisionBadge key={outcome} outcome={outcome} size="lg" />
        </div>
      </div>
    </div>
  );
}

/* 4 · 3D saha */
export function SceneField({ preset }: { preset: number }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-8">
        <Eyebrow i={3} />
        <KeyHint>Shift+1–6 kamera · X kesit · E patlat · F veri akışı</KeyHint>
      </div>
      <Title size={72}>Kurduğumuz istasyonun dijital ikizi.</Title>
      <div className="mt-7 min-h-0 flex-1 overflow-hidden rounded-3xl border border-line">
        <ErrorBoundary label="3D saha">
          <FieldSimulator stage initialPreset={preset} height="100%" />
        </ErrorBoundary>
      </div>
    </div>
  );
}

/* 5 · Jüri testi (canlı donanım) */
export function SceneJury() {
  return (
    <div className="flex h-full flex-col">
      <Eyebrow i={4} />
      <Title size={64}>Sayın jüri, sensörü kuru toprağa koyar mısınız?</Title>
      <div className="mt-7 grid min-h-0 flex-1 grid-cols-[1fr_760px] gap-10">
        <div className="min-h-0 overflow-hidden rounded-3xl border border-line">
          <ErrorBoundary label="3D kesit">
            <FieldSimulator stage initialPreset={3} liveSoil height="100%" />
          </ErrorBoundary>
        </div>
        <StageMoisture />
      </div>
    </div>
  );
}

/* 6 · Zaman makinesi */
export function SceneTimeMachine() {
  const sim = useLive((s) => s.sim);
  const f = focusParcel(sim);
  const series = useFocusSeries(sim?.scenario, sim?.focusParcelId);
  const rows = f ? witnessRows(f.witnesses) : null;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-8">
        <div>
          <Eyebrow i={5} />
          <Title size={96}>{sim ? formatDateTR(sim.date, { year: true }) : "—"}</Title>
        </div>
        <div className="flex flex-col items-end gap-4 pt-1">
          <SampleDataBadge className="!px-4 !py-1.5 !text-[16px]" />
          <div className="font-mono text-[32px] text-text">{sim?.playing ? `1 sn = ${sim.speed} gün` : "duraklatıldı"}</div>
          <KeyHint>Space · oynat / duraklat</KeyHint>
        </div>
      </div>
      <div className="mt-6 grid min-h-0 flex-1 grid-cols-[1fr_680px] gap-10">
        <div className="panel flex min-h-0 flex-col px-8 py-6">
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-mono text-[22px] text-dim">
              NDVI · {f?.id} · {f?.window.label}
            </span>
            <span className="font-mono text-[52px] font-bold leading-none text-wheat-fg">{f?.ndvi != null ? fmtNum(f.ndvi, 2) : "—"}</span>
          </div>
          <div className="mt-2 min-h-0 flex-1">
            {series && sim && (
              <NDVIChart obs={series.obs} normals={series.normals} crop={series.crop} seasonStart={SEASON.start} seasonEnd={SEASON.end} from="2026-02-01" to="2026-06-15" cursor={sim.date} stage height={330} decisionDate={f?.decision?.simDate} />
            )}
          </div>
          <NDVILegend stage />
        </div>
        <div className="grid content-center gap-5">
          {rows
            ? rows.map((r) => <StageWitness key={r.kind} kind={r.kind} verdict={r.verdict} detail={r.detail} size="md" />)
            : [0, 1, 2].map((i) => <div key={i} className="h-[140px] animate-pulse rounded-3xl bg-surface-2" />)}
        </div>
      </div>
    </div>
  );
}

/* 7 · Karar */
export function SceneDecision() {
  const sim = useLive((s) => s.sim);
  const f = focusParcel(sim);
  const d = f?.decision ?? null;
  const title = d ? (d.outcome === "ODE" ? `${d.yesCount}/3 EVET → ÖDE` : d.outcome === "GRI_BOLGE" ? "1/3 → GRİ BÖLGE" : "0/3 → ÖDEME YOK") : "Karar bekleniyor";
  return (
    <div className="grid h-full grid-cols-[620px_1fr] items-center gap-16">
      <div className="flex justify-center">
        <VoteRing verdicts={verdictsOf(f)} outcome={d?.outcome ?? null} size={600} />
      </div>
      <div>
        <Eyebrow i={6} />
        <Title size={88}>{title}</Title>
        {d ? (
          <>
            <div className="mt-10">
              <StagePipeline decision={d} />
            </div>
            <div className="mt-8 font-mono text-[21px] text-dim">
              kanıt /k/{d.code} · evidenceHash {shortHash(d.evidenceHash, 10)}
            </div>
          </>
        ) : (
          <Sub>Zaman makinesini oynatın (6. sahne, Space). Tanıklardan ikisi EVET dediğinde karar burada belirir.</Sub>
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
  const d = focusParcel(sim)?.decision;
  return (
    <div className="flex h-full flex-col">
      <Eyebrow i={7} />
      <Title size={80}>Para FAST ile IBAN&apos;a. Kripto yok.</Title>
      <div className="mt-8 grid min-h-0 flex-1 grid-cols-[1fr_400px_320px] gap-12">
        {d?.outcome === "ODE" ? (
          <StagePayment payment={payments[d.code] ?? null} amountTl={d.amountTl} />
        ) : (
          <div className="panel grid place-items-center p-10 text-center text-[30px] text-dim">Önce bir ödeme kararı gerekiyor (6–7. sahne).</div>
        )}
        <div className="flex items-center justify-center">
          <PhoneMock messages={sms} stage screenHeight={470} />
        </div>
        <div className="flex flex-col items-center justify-center gap-6">
          {d && origin && <QR value={`${origin}/k/${d.code}`} size={300} label={`kanıt: /k/${d.code}`} />}
          <p className="text-center text-[24px] leading-snug text-dim">Telefonunuzla okutun: kararın tüm delili; hash&apos;i kendiniz doğrulayın.</p>
          <p className="text-center text-[19px] leading-snug text-dim">Kripto yok: ödemede kripto varlık kullanımı yasaktır (TCMB, 16.04.2021). Zincir yalnız banka referansının parmak izini tutar.</p>
        </div>
      </div>
    </div>
  );
}

/* 9 · Manipülasyon testi */
export function SceneManipulation() {
  const sim = useLive((s) => s.sim);
  const f = focusParcel(sim);
  const flags = sim?.station.flags ?? [];
  const d = f?.decision;
  const rows = f ? witnessRows(f.witnesses) : null;
  const flag = flags[flags.length - 1];
  return (
    <div className="grid h-full grid-cols-[1fr_540px] items-center gap-16">
      <div>
        <div className="flex items-center justify-between gap-6">
          <Eyebrow i={8} />
          <LiveBadge className="!px-4 !py-1.5 !text-[15px]" />
        </div>
        <Title size={88}>{sim ? formatDateTR(sim.date, { year: true }) : "—"}</Title>
        <Sub className="max-w-[1040px]">Yağış yokken bir saatte +15 puan nem: sensör sulandı. İstasyon tanığı devre dışı; tek tanık kalıyor.</Sub>
        <div className="mt-7 grid gap-3">
          {rows
            ? rows.map((r) => <StageWitness key={r.kind} kind={r.kind} verdict={r.verdict} size="md" />)
            : [0, 1, 2].map((i) => <div key={i} className="h-[82px] animate-pulse rounded-3xl bg-surface-2" />)}
        </div>
        {flag && (
          <div className="mt-5 rounded-2xl border-2 border-wheat bg-wheat/10 px-7 py-3.5 text-[23px] leading-snug text-wheat-fg" role="alert">
            <b>ŞÜPHELİ VERİ:</b> {flag.label} — {flag.detail}
          </div>
        )}
      </div>
      <div className="flex flex-col items-center gap-8">
        <VoteRing verdicts={verdictsOf(f)} outcome={d?.outcome ?? null} size={440} />
        {d && <DecisionBadge outcome={d.outcome} size="lg" />}
      </div>
    </div>
  );
}

/* 0 · Ticari */
export function SceneCommercial({ backtestP }: { backtestP: number }) {
  return (
    <div className="flex h-full flex-col">
      <Eyebrow i={9} />
      <Title size={72}>Çiftçiden değil, sigortacıdan.</Title>
      <Sub className="!mt-4 max-w-[1640px] !text-[26px]">{COPY.commercial.body}</Sub>
      <div className="mt-7 grid min-h-0 flex-1 grid-cols-[760px_1fr] gap-14">
        <div className="grid grid-cols-2 content-center gap-x-12 gap-y-10">
          <StageStat factId="samYillik" size={60} tone="wheat" />
          <StageStat factId="somUst" size={60} tone="green" label="SOM üst sınır (ilk 3 yıl, %5)" />
          <StageStat factId="izlemeUcreti" size={60} />
          <StageStat factId="tarsimBitkiselPolice2024" size={60} />
        </div>
        <StagePricing backtestP={backtestP} />
      </div>
    </div>
  );
}
