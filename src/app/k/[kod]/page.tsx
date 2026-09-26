/**
 * KANIT SAYFASI (QR hedefi, herkese açık, mobil öncelikli) — AGRISHIELD_PROMPT.md Bölüm 10.
 * Tek bir kararın tüm delili: üç tanık, kural, hakem modeli, zincir kaydı, ödeme, kendin doğrula. Kişisel veri yok.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CloudSun, ExternalLink, FileCheck2, Landmark, Link2, RadioTower, Satellite, Scale, BrainCircuit, ShieldCheck } from "lucide-react";
import { t, type Lang } from "@/content/i18n";
import { sealedText } from "@/engine/evidence";
import { BASIS_LABEL, FLAG_LABEL, type Evidence, type FlagCode, type Verdict } from "@/engine/types";
import { formatDateTR, formatDateTimeTR } from "@/lib/dates";
import { SCENARIOS, isScenarioKey } from "@/sim/scenarios";
import { getParcel } from "@/sim/parcels";
import { db } from "@/server/db";
import { ensureRuntime } from "@/server/runtime";
import { IBAN_MASK } from "@/server/payments";
import { DecisionBadge } from "@/components/ui/DecisionBadge";
import { SampleDataBadge, SimBadge, Pill } from "@/components/ui/Badges";
import { QR } from "@/components/ui/QR";
import { VerifyHash } from "@/components/proof/VerifyHash";
import { COPY } from "@/content/copy";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ kod: string }> }): Promise<Metadata> {
  const { kod } = await params;
  return { title: `Kanıt ${kod.toUpperCase()}`, description: `AgriShield kararı ${kod.toUpperCase()}: üç tanık, kural, zincir kaydı ve doğrulanabilir hash.` };
}

const num = (v: unknown, d = 1) => (typeof v === "number" ? v.toLocaleString("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d }) : "—");
const pct = (v: unknown) => (typeof v === "number" ? `${v < 0 ? "−" : "+"}%${Math.abs(v * 100).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}` : "—");
const VERDICT_CLS: Record<Verdict, string> = {
  EVET: "border-green/60 bg-green/10 text-green-fg",
  HAYIR: "border-red/50 bg-red/10 text-red-fg",
  VERI_YOK: "border-wheat/60 bg-wheat/10 text-wheat-fg",
};

function Verdict({ v, lang }: { v: Verdict; lang: Lang }) {
  return <span className={`rounded-lg border px-2.5 py-1 font-mono text-sm font-bold ${VERDICT_CLS[v]}`}>{t(`v.${v}` as "v.EVET", lang)}</span>;
}

function Row({ k, v, strong }: { k: string; v: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-1.5 last:border-0">
      <dt className="text-sm text-dim">{k}</dt>
      <dd className={`text-right font-mono text-sm ${strong ? "font-bold text-text" : ""}`}>{v}</dd>
    </div>
  );
}

function Card({ icon: Icon, tone, title, children, testid }: { icon: typeof Satellite; tone: string; title: string; children: React.ReactNode; testid?: string }) {
  return (
    <section className="panel p-5" data-testid={testid}>
      <h2 className="flex items-center gap-2 font-sans text-base font-bold tracking-normal">
        <Icon className={`size-5 ${tone}`} aria-hidden /> {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function ProofPage({ params, searchParams }: { params: Promise<{ kod: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { kod } = await params;
  const sp = await searchParams;
  const lang: Lang = sp.lang === "en" ? "en" : "tr";
  const en = lang === "en";
  await ensureRuntime();
  if (!/^[0-9A-Fa-f]{4}$/.test(kod)) notFound();
  const code = kod.toUpperCase();
  const d = await db.decision.findUnique({ where: { code } });
  if (!d) notFound();
  const blocks = await db.chainBlock.findMany({ where: { decisionCode: code }, orderBy: { number: "asc" } });
  const ev = JSON.parse(d.evidence) as Evidence;
  const sealed = sealedText(ev);
  const parcel = getParcel(d.parcelId);
  const w = ev.witnesses;
  const sat = w.satellite as Record<string, unknown>;
  const st = w.station as Record<string, unknown>;
  const me = w.meteo as Record<string, unknown>;
  const rules = ev.rules as Record<string, unknown>;
  const scenario = isScenarioKey(d.scenario) ? SCENARIOS[d.scenario] : null;
  const decBlock = blocks.find((b) => b.kind === "decision");
  const payBlock = blocks.find((b) => b.kind === "payment");
  const flags = (st.flags as FlagCode[] | undefined) ?? [];
  const synthetic = ev.context.dataNote.includes("örnek");

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
      {/* 1 · karar rozeti + tarih + parsel takma adı */}
      <header className="panel ticks p-6" data-testid="proof-header">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="eyebrow flex items-center gap-2">
            <FileCheck2 className="size-4 text-wheat-fg" aria-hidden /> {t("proof.title", lang)} · <span className="text-text">/k/{code}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {synthetic && <SampleDataBadge />}
            {d.status === "durduruldu" && <Pill tone="red">DURDURULDU</Pill>}
            {d.status === "itiraz_penceresi" && <Pill tone="wheat">İTİRAZ PENCERESİ</Pill>}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <DecisionBadge outcome={d.outcome as "ODE"} size="lg" />
          <div>
            <div className="font-display text-3xl font-extrabold">
              {d.yesCount}/3 {t("v.EVET", lang)}
              {d.outcome === "ODE" && <span className="ml-2 text-green-fg">· ₺{(d.amountTl ?? 0).toLocaleString("tr-TR")}</span>}
            </div>
            <div className="text-sm text-dim">
              {formatDateTR(d.simDate)} · {d.parcelId}
              {parcel && ` · ${parcel.district} · ${parcel.crop === "bugday" ? (parcel.irrigated ? "sulu buğday" : "kıraç buğday") : "kırmızı mercimek"} · ${parcel.areaDonum} dönüm`}
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm text-dim">
          {BASIS_LABEL[ev.decision.basis] ?? ""}
          {scenario && ` · senaryo: ${scenario.label}`}. {d.outcome === "ODE" ? t("o.ODE.sub", lang) : d.outcome === "GRI_BOLGE" ? t("o.GRI_BOLGE.sub", lang) : t("o.ODEME_YOK.sub", lang)}.
        </p>
        {synthetic && <p className="mt-2 text-xs text-wheat-fg">{ev.context.dataNote}. Tanık değerleri örnek senaryodandır; meteoroloji normali gerçek ERA5 verisidir.</p>}
      </header>

      {/* 2 · üç tanık */}
      <h2 className="eyebrow mb-3 mt-8">{t("proof.witnesses", lang)}</h2>
      <div className="grid gap-4" data-testid="proof-witnesses">
        <Card icon={Satellite} tone="text-sky-fg" title={`${t("w.satellite", lang)} · ${String(sat.source ?? "")}`} testid="witness-satellite">
          <div className="mb-2 flex justify-end">
            <Verdict v={sat.verdict as Verdict} lang={lang} />
          </div>
          <dl>
            <Row k="NDVI (son bulutsuz geçiş)" v={num(sat.ndvi, 2)} strong />
            <Row k="Normal (geçmiş yılların ortancası)" v={num(sat.normalMedian, 2)} />
            <Row k="Anomali" v={pct(sat.anomaly)} strong />
            <Row k="Eşik (döneme göre)" v={typeof rules.ndviThreshold === "number" ? pct(rules.ndviThreshold) : "tetik kapalı"} />
            <Row k="Bulutluluk" v={typeof sat.cloud === "number" ? `%${Math.round((sat.cloud as number) * 100)}` : "—"} />
            <Row k="Geçiş tarihi" v={sat.obsDate ? formatDateTR(String(sat.obsDate), { short: true }) : "—"} />
            {sat.s1z != null && <Row k="Sentinel-1 yüzey nemi z" v={num(sat.s1z, 2)} />}
          </dl>
        </Card>
        <Card icon={RadioTower} tone="text-soil-fg" title={`${t("w.station", lang)} · ${String(st.stationId ?? "")}`} testid="witness-station">
          <div className="mb-2 flex justify-end">
            <Verdict v={st.verdict as Verdict} lang={lang} />
          </div>
          <dl>
            <Row k="30 günlük yağış" v={`${num(st.rain30mm)} mm`} strong />
            <Row k="Yağış eşiği" v={`≤ ${num(rules.rain30Max, 0)} mm`} />
            <Row k="Kök bölgesi nemi" v={`%${num(st.soilMoisture)}`} strong />
            <Row k={`Solma noktası (${st.soilType === "tinli" ? "tınlı" : String(st.soilType)})`} v={`%${num(st.threshold, 0)}`} />
            <Row k="Veri kaynağı" v={String(st.source)} />
          </dl>
          {flags.length > 0 && (
            <div className="mt-3 rounded-lg border border-wheat/60 bg-wheat/10 p-3 text-sm text-wheat-fg" data-testid="proof-flags">
              <b>Şüpheli veri:</b> {flags.map((f) => FLAG_LABEL[f] ?? f).join(", ")} — istasyon tanığı inceleme yapılana kadar sayılmaz.
            </div>
          )}
        </Card>
        <Card icon={CloudSun} tone="text-sky-fg" title={`${t("w.meteo", lang)} · ${String(me.source ?? "")}`} testid="witness-meteo">
          <div className="mb-2 flex justify-end">
            <Verdict v={me.verdict as Verdict} lang={lang} />
          </div>
          <dl>
            <Row k="SPI-30" v={num(me.spi30, 2)} strong />
            <Row k="SPI eşiği (çok kurak)" v={`≤ ${num(rules.spiThreshold)}`} />
            <Row k="30 günlük bölgesel yağış" v={`${num(me.rain30mm)} mm`} />
            <Row k="Uzun yıllar 30 günlük ortalaması (ERA5 1991–2020)" v={`${num(me.rain30Normal)} mm`} />
            <Row k="Oran eşiği" v={`< %${Math.round(Number(rules.rainRatioMax ?? 0.4) * 100)}`} />
          </dl>
        </Card>
      </div>

      {/* 3 · kural */}
      <div className="mt-8 grid gap-4">
        <Card icon={Scale} tone="text-wheat-fg" title={t("proof.rule", lang)} testid="proof-rule">
          <dl>
            <Row k="Fenolojik pencere" v={`${String(rules.windowLabel)} (ağırlık ${num(rules.weight)})`} strong />
            <Row k="NDVI eşiği" v={`${num(rules.ndviBaseThreshold, 2)} / ağırlık = ${typeof rules.ndviThreshold === "number" ? num(rules.ndviThreshold, 3) : "tetik kapalı"}`} />
            <Row k="Oylama" v={String(rules.vote)} />
            <Row k="Dayanak" v={BASIS_LABEL[ev.decision.basis]} />
          </dl>
          <p className="mt-3 text-sm text-dim">
            Kuraklık her dönemde aynı zararı vermez: kritik başaklanma döneminde eşik −%25; erken dönemlerde daha sert düşüş gerekir; hasat penceresinde uydu tanığı daima
            HAYIR döner (hasadı kuraklık sanmaz). Emniyetler: sezonda 1 tetik, 7 gün karantina, köy/gün devre kesici, itiraz penceresi.
          </p>
        </Card>

        {/* 4 · model */}
        <Card icon={BrainCircuit} tone="text-violet-fg" title={t("proof.model", lang)} testid="proof-model">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-dim">Risk skoru</span>
            <span className="font-display text-3xl font-extrabold text-violet-fg">{num(ev.model.riskScore, 2)}</span>
          </div>
          <div className="mt-3 grid gap-2">
            {ev.model.topFactors.map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between text-sm">
                  <span>{k}</span>
                  <span className="font-mono text-dim">%{Math.round(v * 100)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-surface-2">
                  <div className="h-2 rounded-full bg-violet" style={{ width: `${Math.round(v * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-dim">
            Yapay zekâ tanık değil, hakem: bu skor ödeme kararını vermez. Prototip hakem modeli açıklanabilir, uzman ayarlı bir skordur (eğitilmiş model değil); katkılar SHAP
            mantığıyla. Üretimde XGBoost + SHAP.
          </p>
        </Card>

        {/* 5 · zincir */}
        <Card icon={Link2} tone="text-chain-fg" title={t("proof.chain", lang)} testid="proof-chain">
          <div className="mb-2 flex flex-wrap justify-end gap-2">
            {d.chainMode === "amoy" ? <Pill tone="chain">POLYGON AMOY TESTNET</Pill> : <SimBadge label="TAKLİT ZİNCİR" title="Yerel SHA-256 zinciri; gerçek testnet için CHAIN_MODE=amoy" />}
          </div>
          <dl>
            <Row k="evidenceHash" v={<span className="break-all text-green-fg" data-testid="evidence-hash">{d.evidenceHash}</span>} strong />
            <Row k="İşlem no" v={<span className="break-all">{d.txHash ?? "zincire yazılıyor…"}</span>} />
            <Row k="Blok" v={d.blockNumber != null ? `#${d.blockNumber}` : "—"} />
            {decBlock && <Row k="Blok mührü" v={<span className="break-all">{decBlock.hash}</span>} />}
            {decBlock && <Row k="Önceki mühür" v={<span className="break-all">{decBlock.prevHash}</span>} />}
            {decBlock && <Row k="Zincire yazılma (gerçek saat)" v={formatDateTimeTR(decBlock.ts.getTime())} />}
          </dl>
          {d.explorerUrl ? (
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <a href={d.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-fg underline underline-offset-2">
                Polygonscan'de aç <ExternalLink className="size-4" aria-hidden />
              </a>
              <QR value={d.explorerUrl} size={120} label="explorer" />
            </div>
          ) : (
            <p className="mt-3 text-xs text-dim">Bu kayıt yerel taklit zincirdedir (SİMÜLASYON). Gerçek Polygon Amoy test ağında görmek için sunucu CHAIN_MODE=amoy ile çalıştırılır.</p>
          )}
        </Card>

        {/* 6 · ödeme */}
        <Card icon={Landmark} tone="text-wheat-fg" title={t("proof.payment", lang)} testid="proof-payment">
          {d.outcome === "ODE" ? (
            <>
              <div className="mb-2 flex justify-end">
                <SimBadge />
              </div>
              <dl>
                <Row k="Tutar" v={`₺${(d.amountTl ?? 0).toLocaleString("tr-TR")}`} strong />
                <Row k="Kanal" v="FAST · TL · kayıtlı IBAN" />
                <Row k="Alıcı" v={IBAN_MASK} />
                <Row k="Referans (simülasyon)" v={d.paymentRefText ?? "bekliyor"} />
                <Row k="Referansın zincirdeki parmak izi" v={<span className="break-all">{d.paymentRef ?? "—"}</span>} />
                {payBlock && <Row k="Ödeme bloğu" v={`#${payBlock.number}`} />}
              </dl>
              <p className="mt-3 text-xs text-dim">{COPY.paymentCard}</p>
            </>
          ) : (
            <p className="text-sm text-dim">Bu kararda ödeme onayı yok ({d.outcome === "GRI_BOLGE" ? "vaka eksper incelemesinde" : "itiraz hakkı korunur"}).</p>
          )}
          {d.smsText && (
            <div className="mt-4 rounded-xl bg-surface-2 p-3 text-sm">
              <div className="eyebrow mb-1 !text-[0.62rem]">Çiftçiye giden SMS (taklit · maskeli numara)</div>
              {d.smsText}
            </div>
          )}
        </Card>

        {/* 7 · kendin doğrula */}
        <details className="panel group p-5" data-testid="proof-verify" open={sp.dogrula === "1"}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold">
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-green-fg" aria-hidden /> {t("proof.verify", lang)}
            </span>
            <span className="font-mono text-sm text-dim group-open:hidden">aç ▾</span>
          </summary>
          <div className="mt-4">
            <VerifyHash sealed={sealed} expected={d.evidenceHash} en={en} />
          </div>
        </details>
      </div>

      {/* 8 · KVKK */}
      <footer className="mt-8 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <p className="text-sm text-dim">
          <b className="text-text">{t("proof.kvkk", lang)}</b>
        </p>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-sky-fg underline underline-offset-2">
            AgriShield
          </Link>
          <Link href={`/api/decision/${code}`} className="font-mono text-xs text-dim underline underline-offset-2">
            JSON
          </Link>
        </div>
      </footer>
    </div>
  );
}
