"use client";
/**
 * /parsel/[id] — NDVI grafiği, gün gün tanık geçmişi, poliçe kartı, karar günlüğü (Bölüm 5).
 * Seçili gün: şeride tıklanan gün ▸ yoksa (aynı senaryo) zaman makinesinin günü ▸ yoksa motorun karar günü.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Droplets, FileText, Landmark, MapPinned, ShieldCheck, Sprout } from "lucide-react";
import type { ParcelDetail } from "@/server/parcel-detail";
import type { DecisionBasis, Outcome } from "@/engine/types";
import { BASIS_LABEL, CROP_LABEL, SOIL_LABEL, type Crop, type SoilType } from "@/engine/types";
import { effectiveNdviThreshold } from "@/engine/phenology";
import { formatDateTR } from "@/lib/dates";
import { SCENARIOS, SCENARIO_KEYS } from "@/sim/scenarios";
import { PARCELS } from "@/sim/parcels";
import { useLive } from "@/store/sim";
import { NDVIChart, NDVILegend } from "@/components/ui/NDVIChart";
import { ParcelMap } from "@/components/ui/ParcelMap";
import { DecisionBadge } from "@/components/ui/DecisionBadge";
import { Pill, SampleDataBadge } from "@/components/ui/Badges";
import { WitnessChip } from "@/components/ui/Witness";
import { cn, fmtNum, fmtTl } from "@/components/ui/cn";
import { WitnessStrip } from "./WitnessStrip";
import { MiniSeries } from "./MiniSeries";

type Verdict = "EVET" | "HAYIR" | "VERI_YOK";

export function ParcelView({
  d,
  engine,
  earlyWarning,
}: {
  d: ParcelDetail;
  engine: { outcome: Outcome; date: string; yesCount: number; amountTl: number; basis: DecisionBasis } | null;
  earlyWarning: string | null;
}) {
  const router = useRouter();
  const sim = useLive((s) => s.sim);
  const liveSame = sim?.scenario === d.scenario.key;
  const [picked, setPicked] = useState<string | null>(null);
  const day = picked ?? (liveSame && sim ? sim.date : (engine?.date ?? d.season.end));
  const tl = d.timeline;
  const point = useMemo(() => tl.find((p) => p.date === day) ?? tl[tl.length - 1], [tl, day]);
  const p = d.parcel;
  const crop = p.crop as Crop;
  const soil = p.soilType as SoilType;
  const th = d.policy?.thresholds as { rain30Max?: number; spiThreshold?: number; ndviAnomaly?: number; soilWilting?: Record<string, number> } | undefined;
  const wilting = th?.soilWilting?.[soil] ?? { killi: 18, tinli: 14, kumlu: 9 }[soil];
  const phen = d.phenology;
  const win = phen.find((w) => w.key === point.window);
  const effThr = win ? effectiveNdviThreshold(th?.ndviAnomaly ?? -0.25, win.weight) : -Infinity;
  const payout = d.policy ? d.policy.sumInsuredTl * d.policy.payoutRate : 0;
  const farmerShare = d.policy ? d.policy.premiumTl * (1 - d.policy.subsidyRate) : 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link href="/#saha" className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> Saha
      </Link>

      {/* başlık */}
      <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Parsel · takma ad</div>
          <h1 className="mt-1 font-mono text-5xl font-bold">{p.id}</h1>
          <p className="mt-2 text-lg text-dim">
            {p.name} · {CROP_LABEL[crop]} · {fmtNum(p.areaDonum, 0)} dönüm · {SOIL_LABEL[soil]} toprak · {p.irrigated ? "sulu" : "kıraç"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <SampleDataBadge />
            <Pill tone="dim">{p.role}</Pill>
            {p.irrigated && <Pill tone="sky" title="Sulu parselde köy istasyonunun yağış/nem ölçümü parseli temsil etmez">istasyon tanığı: veri yok (sulu)</Pill>}
          </div>
          {p.story && <p className="mt-2 text-sm text-dim">{p.story}</p>}
        </div>
        <nav aria-label="Senaryo" className="flex flex-wrap gap-1.5 rounded-xl border border-line bg-surface p-1">
          {SCENARIO_KEYS.map((k) => (
            <Link
              key={k}
              href={`/parsel/${p.id}?senaryo=${k}`}
              scroll={false}
              onClick={() => setPicked(null)}
              className={cn("rounded-lg px-3 py-1.5 text-sm", k === d.scenario.key ? "bg-wheat/15 font-semibold text-wheat-fg" : "text-dim hover:text-text")}
            >
              {SCENARIOS[k].short}
            </Link>
          ))}
        </nav>
      </header>
      <p className="mt-3 max-w-3xl text-sm text-dim">
        <b className="text-text">{d.scenario.label}:</b> {d.scenario.description}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1.7fr_1fr]">
        {/* sol: grafikler */}
        <div className="grid min-w-0 grid-cols-1 content-start gap-5">
          <section className="panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-sans text-base font-bold tracking-normal">Uydu: NDVI bu yıl ve normal aralık</h2>
              <NDVILegend />
            </div>
            <div className="mt-3">
              <NDVIChart obs={d.series.obs} normals={d.series.normals} crop={crop} seasonStart={d.season.start} seasonEnd={d.season.end} cursor={day} decisionDate={engine?.outcome === "ODE" ? engine.date : null} />
            </div>
          </section>

          <section className="panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-sans text-base font-bold tracking-normal">Tanık geçmişi — sezon boyunca gün gün</h2>
              <span className="text-xs text-dim">Bir güne tıklayın; sağdaki kart o günü gösterir.</span>
            </div>
            <WitnessStrip timeline={tl} phenology={phen} selected={day} onSelect={setPicked} decisionDate={engine?.date ?? null} liveDate={liveSame ? (sim?.date ?? null) : null} />
          </section>

          <section className="panel grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <MiniSeries title="NDVI anomalisi (normale göre)" data={tl.map((x) => ({ date: x.date, v: x.anomaly }))} threshold={th?.ndviAnomaly ?? -0.25} unit="%" pct domain={[-0.6, 0.3]} below selected={day} note="Eşik döneme göre değişir; kritik dönemde −%25." />
            <MiniSeries title="Toprak nemi (istasyon)" data={tl.map((x) => ({ date: x.date, v: x.soil }))} threshold={wilting} unit="%" domain={[0, 45]} below selected={day} note={`Solma noktası (${SOIL_LABEL[soil].toLowerCase()}): %${wilting}`} />
            <MiniSeries title="30 günlük yağış (istasyon)" data={tl.map((x) => ({ date: x.date, v: x.rain30 }))} threshold={th?.rain30Max ?? 10} unit="mm" domain={[0, 120]} below selected={day} note="≤ 10 mm ve nem solma noktasının altında → EVET" />
            <MiniSeries title="SPI-30 (meteoroloji)" data={tl.map((x) => ({ date: x.date, v: x.spi }))} threshold={th?.spiThreshold ?? -1.5} domain={[-3, 2.5]} below selected={day} note="≤ −1,5 (ya da yağış normalin %40'ının altında) → EVET" />
          </section>

          <section className="panel grid grid-cols-1 gap-5 p-5 sm:grid-cols-[1fr_1.1fr]">
            <div>
              <h2 className="flex items-center gap-2 font-sans text-base font-bold tracking-normal">
                <MapPinned className="size-5 text-sky-fg" aria-hidden /> Köy haritası
              </h2>
              <p className="mt-2 text-sm text-dim">Üç örnek parsel aynı köyde, aynı istasyonu paylaşıyor. Aynı kuraklıkta farklı sonuçlar çıkar: tarla bazında karar budur.</p>
              <ul className="mt-3 grid grid-cols-1 gap-1.5 text-sm">
                {PARCELS.map((x) => (
                  <li key={x.id}>
                    <Link
                      href={`/parsel/${x.id}?senaryo=${d.scenario.key}`}
                      className={cn("flex items-baseline gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2", x.id === p.id && "bg-wheat/10")}
                    >
                      <span className="shrink-0 whitespace-nowrap font-mono font-bold">{x.id}</span>
                      <span className="truncate text-dim">
                        {CROP_LABEL[x.crop as Crop]} · {x.irrigated ? "sulu" : "kıraç"} · {x.role}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-dim">
                <Droplets className="size-3.5 shrink-0" aria-hidden /> Kişisel veri yok: parsel takma adla, sınırlar örnektir.
              </p>
            </div>
            <ParcelMap focus={p.id} highlight={p.id} onSelect={(id) => router.push(`/parsel/${id}?senaryo=${d.scenario.key}`)} className="h-72" />
          </section>
        </div>

        {/* sağ: seçili gün, poliçe, kararlar */}
        <aside className="grid min-w-0 grid-cols-1 content-start gap-5">
          <section className="panel p-5" data-testid="parcel-day">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-sans text-base font-bold tracking-normal">
                <CalendarDays className="size-5 text-wheat-fg" aria-hidden /> {formatDateTR(point.date, { year: true })}
              </h2>
              {liveSame && sim?.date === point.date && <Pill tone="green">zaman makinesi burada</Pill>}
            </div>
            <div className="mt-1 text-sm text-dim">
              Dönem: {win?.label ?? "sezon dışı"}
              {win ? ` · ağırlık ${fmtNum(win.weight, 1)}` : ""}
              {win && !win.triggerEnabled ? " · tetik kapalı" : ""}
            </div>
            <div className="mt-3 grid gap-2">
              <WitnessChip kind="satellite" verdict={point.sat as Verdict} size="sm" />
              <WitnessChip kind="station" verdict={point.station as Verdict} size="sm" />
              <WitnessChip kind="meteo" verdict={point.meteo as Verdict} size="sm" />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-sm">
              <dt className="text-dim">NDVI anomalisi</dt>
              <dd className="text-right">{point.anomaly == null ? "—" : `${point.anomaly < 0 ? "−" : "+"}%${fmtNum(Math.abs(point.anomaly) * 100, 1)}`}</dd>
              <dt className="text-dim">etkin eşik</dt>
              <dd className="text-right">{Number.isFinite(effThr) ? `−%${fmtNum(Math.abs(effThr) * 100, 1)}` : "tetik kapalı"}</dd>
              <dt className="text-dim">30 gün yağış</dt>
              <dd className="text-right">{point.rain30 == null ? "—" : `${fmtNum(point.rain30, 1)} mm`}</dd>
              <dt className="text-dim">toprak nemi</dt>
              <dd className="text-right">{point.soil == null ? "—" : `%${fmtNum(point.soil, 1)}`}</dd>
              <dt className="text-dim">SPI-30</dt>
              <dd className="text-right">{point.spi == null ? "—" : fmtNum(point.spi, 2)}</dd>
              <dt className="text-dim">hakem risk skoru</dt>
              <dd className="text-right">{fmtNum(point.risk * 100, 0)}/100</dd>
            </dl>
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3">
              <span className="font-mono text-3xl font-bold">{point.yes}/3</span>
              <span className="text-sm text-dim">tanık EVET diyor{point.yes >= 2
                  ? win?.triggerEnabled
                    ? " → ödeme koşulu sağlanıyor"
                    : " → ama bu dönemde tetik kapalı, karar doğmaz"
                  : point.yes === 1
                    ? " → tek tanık, beklenir (ısrar ederse gri bölge)"
                    : ""}</span>
            </div>
          </section>

          <section className="panel p-5" data-testid="policy-card">
            <h2 className="flex items-center gap-2 font-sans text-base font-bold tracking-normal">
              <ShieldCheck className="size-5 text-green-fg" aria-hidden /> Poliçe {d.policy ? `· ${d.policy.season}` : ""}
            </h2>
            {d.policy ? (
              <>
                <dl className="mt-3 grid gap-1 text-sm">
                  {[
                    ["Teminat", `${fmtTl(d.policy.sumInsuredTl)} TL`],
                    ["Kuraklıkta ödeme", `${fmtTl(payout)} TL (%${fmtNum(d.policy.payoutRate * 100, 0)})`],
                    ["Yıllık prim", `${fmtTl(d.policy.premiumTl)} TL`],
                    ["Devlet prim desteği", `%${fmtNum(d.policy.subsidyRate * 100, 0)}`],
                    ["Çiftçinin payı", `${fmtTl(farmerShare)} TL`],
                    ["Durum", d.policy.status],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b border-line py-1.5 last:border-0">
                      <dt className="text-dim">{k}</dt>
                      <dd className="font-mono">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3 text-xs text-dim">
                  Prim, prim hesaplayıcısıyla aynı formülden gelir (beklenen hasar × yükleme). Örnek poliçedir; gerçek fiyatı sigorta şirketi/havuz belirler.
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-dim">Bu sezon için poliçe kaydı yok. `npm run seed` ile tohum verisini yükleyin.</p>
            )}
          </section>

          <section className="panel p-5">
            <h2 className="flex items-center gap-2 font-sans text-base font-bold tracking-normal">
              <Sprout className="size-5 text-green-fg" aria-hidden /> Motorun bu senaryodaki sonucu
            </h2>
            {engine ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <DecisionBadge outcome={engine.outcome} size="sm" />
                <span className="text-sm">
                  {formatDateTR(engine.date, { year: true })} · {engine.yesCount}/3 · {BASIS_LABEL[engine.basis]}
                  {engine.amountTl > 0 ? ` · ${fmtTl(engine.amountTl)} TL` : ""}
                </span>
              </div>
            ) : (
              <p className="mt-2 text-sm text-dim">Sezon boyunca otomatik karar oluşmuyor.</p>
            )}
            {earlyWarning && <p className="mt-2 text-sm text-dim">Erken uyarı: {formatDateTR(earlyWarning, { year: true })} (ilk tanık EVET dedi).</p>}
            <button type="button" onClick={() => engine && setPicked(engine.date)} disabled={!engine} className="mt-3 text-sm text-wheat-fg underline underline-offset-4 disabled:opacity-40">
              Karar gününü göster
            </button>
          </section>

          <section className="panel p-5" data-testid="decision-log">
            <h2 className="flex items-center gap-2 font-sans text-base font-bold tracking-normal">
              <FileText className="size-5 text-chain-fg" aria-hidden /> Karar günlüğü
            </h2>
            {d.decisions.length ? (
              <ul className="mt-3 grid grid-cols-1 gap-2">
                {d.decisions.map((x) => (
                  <li key={x.id}>
                    <Link href={`/k/${x.code}`} className="flex items-center gap-3 rounded-xl border border-line p-3 hover:border-wheat">
                      <DecisionBadge outcome={x.outcome} size="sm" withSub={false} />
                      <div className="min-w-0 text-sm">
                        <div className="font-mono font-bold">/k/{x.code}</div>
                        <div className="truncate text-dim">
                          {x.simDate ? formatDateTR(x.simDate, { year: true }) : ""} · {x.yesCount}/3 · {x.status}
                          {x.amountTl > 0 ? ` · ${fmtTl(x.amountTl)} TL` : ""}
                        </div>
                      </div>
                      {x.paymentRef && <Landmark className="ml-auto size-4 shrink-0 text-dim" aria-label="ödeme referansı var (SİMÜLASYON)" />}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-dim">Henüz karar yok. Zaman makinesini oynatın ya da demo konsolundan tetikleyin.</p>
            )}
          </section>
        </aside>
      </div>

      <section className="panel mt-5 overflow-x-auto p-5">
        <h2 className="font-sans text-base font-bold tracking-normal">Fenoloji penceresi — {CROP_LABEL[crop]}</h2>
        <table className="mt-3 w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-dim">
              <th className="py-1.5 font-normal">Dönem</th>
              <th className="py-1.5 font-normal">Tarih</th>
              <th className="py-1.5 font-normal">Ağırlık</th>
              <th className="py-1.5 font-normal">Etkin NDVI eşiği</th>
              <th className="py-1.5 font-normal">Tetik</th>
            </tr>
          </thead>
          <tbody>
            {phen.map((w) => {
              const e = effectiveNdviThreshold(th?.ndviAnomaly ?? -0.25, w.weight);
              return (
                <tr key={w.key} className={cn("border-t border-line", w.key === point.window && "bg-wheat/10")}>
                  <td className="py-2 font-semibold">{w.label}</td>
                  <td className="py-2 font-mono">
                    {w.start.split("-").reverse().join(".")} – {w.end.split("-").reverse().join(".")}
                  </td>
                  <td className="py-2 font-mono">{fmtNum(w.weight, 1)}</td>
                  <td className="py-2 font-mono">{Number.isFinite(e) && w.triggerEnabled ? `−%${fmtNum(Math.abs(e) * 100, 1)}` : "—"}</td>
                  <td className="py-2">{w.triggerEnabled ? "açık" : "kapalı (NDVI düşüşü normal)"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
