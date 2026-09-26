/**
 * /kaynaklar — "Her rakamın bir kaynağı var" sayfası: rakamlar (facts.ts), hesaplar (#hesaplar),
 * karar motoru (#motor) ve kaynakça. Sitedeki SourceTag ve asistan cevapları buraya bağlanır.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Calculator, Cpu, ExternalLink, ListChecks } from "lucide-react";
import climate from "@data/climate-siverek.json";
import backtest from "@data/backtest.json";
import knowledge from "@data/knowledge.json";
import { FACTS, formatFact, type Fact, type FactKind } from "@/content/facts";
import { SOURCES } from "@/content/sources";
import { DEFAULT_THRESHOLDS, SOLMA_NOKTASI } from "@/engine/thresholds";
import { MODEL_NOTE, MODEL_WEIGHTS, EARLY_WARNING_SCORE } from "@/engine/model";
import { price } from "@/engine/pricing";
import { Era5Chart } from "@/components/ui/Era5Chart";
import { Pill, RealDataBadge } from "@/components/ui/Badges";

export const metadata: Metadata = {
  title: "Kaynaklar ve hesaplar",
  description: "AgriShield sitesindeki her rakamın kaynağı, AlgoVest hesaplarının formülleri ve karar motorunun kuralları.",
};

const nf = (v: number, d = 0) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
const KIND: Record<FactKind, { title: string; tone: "green" | "sky" | "wheat"; note: string }> = {
  resmi: { title: "Resmi / yayımlanmış", tone: "green", note: "Kurum raporu, resmi açıklama ya da haber kaynağı." },
  hesap: { title: "AlgoVest hesabı", tone: "sky", note: "Kamuya açık veriden yaptığımız hesap; formülü yanında." },
  varsayim: { title: "Varsayım", tone: "wheat", note: "Açıkça varsayım; ekranda da öyle etiketlenir, pilotta netleşecek." },
};

function H2({ id, icon: Icon, children }: { id: string; icon: typeof BookOpen; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-14 flex scroll-mt-24 items-center gap-3 text-3xl font-extrabold sm:text-4xl">
      <Icon className="size-7 shrink-0 text-wheat-fg" aria-hidden /> {children}
    </h2>
  );
}

function FactRow({ f }: { f: Fact }) {
  const s = SOURCES[f.sourceId];
  const external = /^https?:/.test(s.url);
  return (
    <tr id={`f-${f.id}`} className="scroll-mt-24 border-t border-line align-top">
      <td className="py-2.5 pr-3">
        <div className="font-semibold">{f.label}</div>
        {f.derivation && <div className="mt-0.5 text-xs text-dim">{f.derivation}</div>}
      </td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-right font-mono">{f.value === null ? <span className="text-dim">veri bekleniyor</span> : formatFact(f)}</td>
      <td className="py-2.5 pr-3 font-mono text-xs text-dim">{f.asOf}</td>
      <td className="py-2.5 text-sm">
        <a href={s.url} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="text-sky-fg underline decoration-line underline-offset-4 [overflow-wrap:anywhere]">
          {s.publisher}
        </a>
      </td>
    </tr>
  );
}

/** 35 sezonun Kas–Haz yağışı: sezon normali çizgisi + geriye dönük testte tetiklenen sezonlar işaretli. */
function SeasonBars() {
  const seasons = climate.seasons as { season: string; totalMm: number }[];
  const trig = new Set(backtest.summary.triggeredSeasons);
  const normal = climate.summary.seasonNormalMm;
  const W = 900;
  const H = 240;
  const pad = { l: 40, r: 8, t: 12, b: 44 };
  const max = Math.max(...seasons.map((s) => s.totalMm)) * 1.05;
  const bw = (W - pad.l - pad.r) / seasons.length;
  const Y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="1991/92–2025/26 sezon yağışları ve geriye dönük test">
      {[0, 200, 400, 600, 800].filter((v) => v < max).map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={Y(v)} y2={Y(v)} stroke="var(--line)" strokeWidth={0.6} />
          <text x={pad.l - 6} y={Y(v) + 3.5} fontSize={10} textAnchor="end" fill="var(--text-dim)">
            {v}
          </text>
        </g>
      ))}
      {seasons.map((s, i) => {
        const x = pad.l + i * bw;
        const isT = trig.has(s.season);
        const cur = s.season === "2024-2025";
        return (
          <g key={s.season}>
            <rect x={x + 1.5} y={Y(s.totalMm)} width={bw - 3} height={Y(0) - Y(s.totalMm)} fill={isT ? "var(--red)" : cur ? "var(--wheat)" : "var(--sky)"} opacity={isT || cur ? 0.95 : 0.5} rx={1.5} />
            {i % 2 === 0 && (
              <text x={x + bw / 2} y={H - pad.b + 14} fontSize={9} textAnchor="end" fill="var(--text-dim)" transform={`rotate(-45 ${x + bw / 2} ${H - pad.b + 14})`}>
                {s.season.slice(2, 4)}/{s.season.slice(7, 9)}
              </text>
            )}
          </g>
        );
      })}
      <line x1={pad.l} x2={W - pad.r} y1={Y(normal)} y2={Y(normal)} stroke="var(--green)" strokeDasharray="6 4" strokeWidth={1.5} />
      <text x={W - pad.r - 4} y={Y(normal) - 5} fontSize={11} textAnchor="end" fill="var(--green-fg)" stroke="var(--surface)" strokeWidth={4} paintOrder="stroke">
        sezon normali {normal} mm
      </text>
    </svg>
  );
}

export default function KaynaklarPage() {
  const groups = (["resmi", "hesap", "varsayim"] as FactKind[]).map((k) => ({ kind: k, facts: (Object.values(FACTS) as Fact[]).filter((f) => f.kind === k) }));
  const p = price({ sumInsuredTl: 100_000, payoutRate: 0.5, triggerProbability: backtest.summary.probability, subsidyRate: 0.7, loadRate: 0.25 });
  const rules = knowledge.rules;
  const rule = (id: string) => rules.find((r) => r.id === id);
  const season2025 = climate.season2025 as { d: string; p: number; c: number; n: number }[];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="eyebrow">Kaynaklar ve hesaplar</div>
      <h1 className="mt-1 text-4xl font-extrabold sm:text-6xl">Her rakamın bir kaynağı var.</h1>
      <p className="mt-3 max-w-3xl text-lg text-dim">
        Sitede gördüğünüz her sayı tek bir dosyadan gelir ve bir kaynağa bağlıdır. Doğrulanmamış değer ekranda rakam olarak gösterilmez; “veri bekleniyor” yazar.
        Kendi hesaplarımızın formülü açıktır; varsayımlar varsayım diye etiketlenir.
      </p>
      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Bu sayfada">
        {[
          ["#rakamlar", "Rakamlar"],
          ["#hesaplar", "Hesaplar"],
          ["#motor", "Karar motoru"],
          ["#kaynakca", "Kaynakça"],
        ].map(([h, l]) => (
          <a key={h} href={h} className="rounded-full border border-line px-3.5 py-1.5 text-sm hover:border-wheat">
            {l}
          </a>
        ))}
      </nav>

      {/* ───────── RAKAMLAR ───────── */}
      <H2 id="rakamlar" icon={ListChecks}>
        Rakamlar
      </H2>
      {groups.map((g) => (
        <section key={g.kind} className="panel mt-5 overflow-x-auto p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Pill tone={KIND[g.kind].tone}>{KIND[g.kind].title}</Pill>
            <span className="text-sm text-dim">{KIND[g.kind].note}</span>
          </div>
          <table className="mt-3 w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs text-dim">
                <th className="py-1.5 font-normal">Rakam</th>
                <th className="py-1.5 text-right font-normal">Değer</th>
                <th className="py-1.5 font-normal">Tarih</th>
                <th className="py-1.5 font-normal">Kaynak</th>
              </tr>
            </thead>
            <tbody>
              {g.facts.map((f) => (
                <FactRow key={f.id} f={f} />
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <p className="mt-3 text-sm text-dim">
        Kullanmadığımız rakamlar da var: kaynağı doğrulanamayan ya da güncelliğini yitirmiş ifadeler bilerek çıkarıldı. <code className="font-mono">npm run lint:facts</code> bunları kod tabanında tarar.
      </p>

      {/* ───────── HESAPLAR ───────── */}
      <H2 id="hesaplar" icon={Calculator}>
        Hesaplar
      </H2>

      <section className="panel mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-sans text-lg font-bold tracking-normal">1 · Siverek 2024–25 sezonu ne kadar kuraktı?</h3>
          <RealDataBadge label="GERÇEK VERİ · ERA5" />
        </div>
        <p className="mt-2 text-sm text-dim">
          ERA5 yeniden analiz verisinden Siverek (37,75°K 39,32°D) günlük yağışı indirildi. Kasım–Haziran kümülatif yağış, 30 sezonun günlük normalinin kümülatifiyle
          karşılaştırıldı.
        </p>
        <div className="mt-4">
          <Era5Chart data={season2025} />
        </div>
        <ul className="mt-4 grid gap-1 text-sm">
          {(["era5Sezon2025Yagis", "era5SezonNormal", "era5Sezon2025Acik", "era5KurakSira"] as const).map((id) => (
            <li key={id} className="flex flex-wrap items-baseline gap-x-2">
              <b className="font-mono">{formatFact(FACTS[id])}</b> <span>{FACTS[id].label}</span>
              {FACTS[id].derivation && <span className="text-dim">— {FACTS[id].derivation}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-sans text-lg font-bold tracking-normal">2 · Geriye dönük test: kural geçmişte kaç sezonda tetiklenirdi?</h3>
          <RealDataBadge label="GERÇEK VERİ · ERA5" />
        </div>
        <p className="mt-2 text-sm text-dim">{backtest.meta.method}</p>
        <div className="mt-4">
          <SeasonBars />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dim">
          <span className="inline-flex items-center gap-1.5">
            <i className="size-2.5 rounded-sm bg-red" /> iki tanıklı tetik oluşan sezon
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="size-2.5 rounded-sm bg-wheat" /> 2024–25
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="size-2.5 rounded-sm bg-sky/50" /> diğer sezonlar (Kas–Haz toplam yağış, mm)
          </span>
        </div>
        <p className="mt-4">
          <b className="font-mono">{formatFact(FACTS.backtestTetikSezon)}</b> · tetik olasılığı <b className="font-mono">{formatFact(FACTS.backtestTetikOlasiligi)}</b>. Tetiklenen sezonlar:{" "}
          {backtest.summary.triggeredSeasons.map((s) => s.replace("-", "/")).join(", ")}.
        </p>
        <p className="mt-2 text-sm text-dim">Sınır: {backtest.meta.limitation}</p>
        <p className="mt-2 text-sm text-dim">
          Dikkat: 2024–25 sezonu toplamda kurak olsa da (35 sezonda 5. en kurak) açığın büyük kısmı kışta oluştu; kritik dönemde (Nisan–Mayıs){" "}
          {nf(backtest.seasons.find((s) => s.season === "2024-2025")?.aprMayRainMm ?? 0)} mm yağış düştü ve bu yaklaşık kural o sezon tetiklenmezdi. Kural her kurak yılı
          değil, ürünün en hassas döneminde yaşanan kuraklığı yakalamak için tasarlandı; kış kuraklığının verime etkisini ve basis riskini pilot gerçek verimle ölçecek.
        </p>
      </section>

      <section className="panel mt-5 p-5">
        <h3 className="font-sans text-lg font-bold tracking-normal">3 · Prim: sigortacının gözüyle</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          <pre className="overflow-x-auto rounded-xl border border-line bg-surface-2 p-4 font-mono text-sm leading-relaxed">
            {`beklenen hasar = tetik olasılığı × (bedel × ödeme oranı)
brüt prim      = beklenen hasar × (1 + gider ve güvenlik payı)
çiftçi öder    = brüt prim × (1 − devlet desteği)`}
          </pre>
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
            <dt className="text-dim">Sigorta bedeli · ödeme oranı</dt>
            <dd className="text-right font-mono">100.000 TL · %50</dd>
            <dt className="text-dim">Tetik olasılığı (geriye dönük test)</dt>
            <dd className="text-right font-mono">%{nf(backtest.summary.probability * 100)}</dd>
            <dt className="text-dim">Beklenen hasar</dt>
            <dd className="text-right font-mono">{nf(p.expectedLossTl)} TL</dd>
            <dt className="text-dim">Brüt prim (+%25 pay)</dt>
            <dd className="text-right font-mono">{nf(p.grossPremiumTl)} TL</dd>
            <dt className="text-dim">Devlet desteği %70 → çiftçi öder</dt>
            <dd className="text-right font-mono font-bold">{nf(p.farmerPaysTl)} TL</dd>
          </dl>
        </div>
        <p className="mt-3 text-sm text-dim">
          Bu bir varsayım hesabıdır: gider/güvenlik payı ve destek oranı örnektir; gerçek fiyatı sigorta şirketi/havuz belirler. Ana sayfadaki prim hesaplayıcısı aynı
          fonksiyonu kullanır.
        </p>
      </section>

      <section className="panel mt-5 p-5">
        <h3 className="font-sans text-lg font-bold tracking-normal">4 · Pazar: aşağıdan yukarıya</h3>
        <ol className="mt-3 grid gap-2 text-sm">
          {(["ortalamaBitkiselPrim", "izlemeUcreti", "samYillik", "somAlt", "somUst"] as const).map((id, i) => (
            <li key={id} className="flex gap-3">
              <span className="font-mono text-dim">{i + 1}.</span>
              <span>
                <b>{FACTS[id].label}:</b> <span className="font-mono">{formatFact(FACTS[id])}</span>
                {FACTS[id].derivation && <span className="text-dim"> — {FACTS[id].derivation}</span>}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel mt-5 p-5">
        <h3 className="font-sans text-lg font-bold tracking-normal">5 · SPI-30 nasıl hesaplanıyor?</h3>
        <p className="mt-2 text-sm leading-relaxed text-dim">
          Yılın her günü için, 1991–2020 arasındaki 30 günlük toplam yağışlara iki parametreli gamma dağılımı uyduruldu (Thom tahmincisi; sıfır yağış olasılığı ayrıca
          tutulur). Bir günün SPI-30 değeri, o günkü 30 günlük toplamın bu dağılımdaki birikimli olasılığının standart normal karşılığıdır: SPI = Φ⁻¹(q + (1 − q)·G(x)).
          −1,5 ve altı “çok kurak” kabul edilir. Parametreler <code className="font-mono">data/climate-siverek.json</code> içinde, üretimi{" "}
          <code className="font-mono">npm run fetch:weather</code>.
        </p>
      </section>

      {/* ───────── MOTOR ───────── */}
      <H2 id="motor" icon={Cpu}>
        Karar motoru
      </H2>
      <p className="mt-3 max-w-3xl text-dim">
        Kurallar kodda tek bir yerde (<code className="font-mono">src/engine</code>) yaşar; bu sayfa, asistan ve testler aynı kaynaktan beslenir. Ödeme kararını model değil, üç
        bağımsız tanığın oylaması verir.
      </p>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        {["R:oylama", "R:uydu", "R:istasyon", "R:meteoroloji", "R:emniyet"].map((id) => {
          const r = rule(id);
          return r ? (
            <section key={id} className="panel p-5">
              <h3 className="font-sans text-base font-bold tracking-normal">{r.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-dim">{r.text}</p>
            </section>
          ) : null;
        })}
        <section className="panel p-5">
          <h3 className="font-sans text-base font-bold tracking-normal">Otomatik karar anı</h3>
          <ul className="mt-2 grid gap-1.5 text-sm leading-relaxed text-dim">
            <li>• Aynı gün ≥ 2 tanık EVET → hemen ÖDE (itiraz penceresi → zincir kaydı → ödeme → SMS).</li>
            <li>• Tek tanık {DEFAULT_THRESHOLDS.greyLocalPersistDays} gün ısrar ederse → GRİ BÖLGE (eksper incelemesi).</li>
            <li>• Kritik dönem (başaklanma–tane dolumu) biterken: dönem içinde en az bir EVET görüldüyse GRİ BÖLGE, hiç görülmediyse ÖDEME YOK.</li>
            <li>• Olgunlaşma–hasat döneminde tetik kapalıdır: hasatta NDVI düşüşü normaldir.</li>
          </ul>
        </section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="panel overflow-x-auto p-5">
          <h3 className="font-sans text-base font-bold tracking-normal">Eşikler (poliçe varsayılanı)</h3>
          <table className="mt-3 w-full min-w-[420px] text-sm">
            <tbody>
              {[
                ["NDVI anomalisi (ağırlık 1,0)", `≤ −%${nf(Math.abs(DEFAULT_THRESHOLDS.ndviAnomaly) * 100)}`],
                ["Geçerli optik geçiş: bulutluluk", `< %${nf(DEFAULT_THRESHOLDS.cloudMax * 100)}`],
                ["Sentinel-1 yedeğine geçiş", `${DEFAULT_THRESHOLDS.satStaleDays} gün bulutsuz geçiş yoksa · z ≤ ${nf(DEFAULT_THRESHOLDS.s1ZThreshold, 1)}`],
                ["30 günlük yağış (istasyon)", `≤ ${DEFAULT_THRESHOLDS.rain30Max} mm`],
                ["Solma noktası: killi / tınlı / kumlu", `%${SOLMA_NOKTASI.killi} / %${SOLMA_NOKTASI.tinli} / %${SOLMA_NOKTASI.kumlu}`],
                ["SPI-30 (meteoroloji)", `≤ ${nf(DEFAULT_THRESHOLDS.spiThreshold, 1)}`],
                ["ya da yağış / normal", `< %${nf(DEFAULT_THRESHOLDS.rainRatioMax * 100)} (normal ≥ ${DEFAULT_THRESHOLDS.rainRatioMinNormal} mm)`],
                ["Karantina", `${DEFAULT_THRESHOLDS.quarantineDays} gün`],
                ["Sezon tavanı", `${DEFAULT_THRESHOLDS.seasonTriggerCap} tetik / poliçe`],
              ].map(([k, v]) => (
                <tr key={k} className="border-t border-line first:border-0">
                  <td className="py-2 pr-3 text-dim">{k}</td>
                  <td className="py-2 text-right font-mono">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel p-5">
          <h3 className="font-sans text-base font-bold tracking-normal">Yapay zekâ = hakem, tanık değil</h3>
          <p className="mt-2 text-sm leading-relaxed text-dim">{MODEL_NOTE}</p>
          <pre className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface-2 p-3 font-mono text-xs leading-relaxed">
            {`logit = ${nf(MODEL_WEIGHTS.b0, 1)}
      + ${nf(MODEL_WEIGHTS.rain, 1)} × yağış açığı (0–1)
      + ${nf(MODEL_WEIGHTS.ndvi, 1)} × NDVI düşüşü / %25
      + ${nf(MODEL_WEIGHTS.soil, 1)} × nemin solma noktasına yakınlığı
      + ${nf(MODEL_WEIGHTS.spi, 1)} × (−SPI / 1,5)
      + ${nf(MODEL_WEIGHTS.phen, 1)} × dönem ağırlığı
risk  = σ(logit)      erken uyarı: risk ≥ ${nf(EARLY_WARNING_SCORE, 1)}`}
          </pre>
          <p className="mt-2 text-sm text-dim">Erken uyarı yalnızca çiftçiye önlem mesajıdır; tahmine dayanarak para ödenmez.</p>
        </section>
      </div>

      <section className="panel mt-4 p-5">
        <h3 className="font-sans text-base font-bold tracking-normal">Kanıt mührü (evidenceHash)</h3>
        <p className="mt-2 text-sm leading-relaxed text-dim">
          Her kararın kanıt paketi (üç tanığın ölçümü, eşikler, dönem, model çıktısı, oylama) sabit anahtar sırasıyla JSON’a çevrilir; zincir ve ödeme alanları hariç
          tutulur. <code className="font-mono">evidenceHash = 0x + SHA-256(JSON)</code>. Bu hash zincire yazılır. Kanıt sayfasındaki “kendin doğrula” bölümü aynı hesabı
          tarayıcınızda yapar; tek bir karakter değişse hash tutmaz. Örnek:{" "}
          <Link href="/k/7F3A?dogrula=1" className="text-sky-fg underline underline-offset-4">
            /k/7F3A
          </Link>
          .
        </p>
      </section>

      <section className="panel mt-4 p-5">
        <h3 className="font-sans text-base font-bold tracking-normal">Kod nerede?</h3>
        <ul className="mt-2 grid gap-1 font-mono text-sm sm:grid-cols-2">
          {[
            ["src/engine/decision.ts", "tanıklar + oylama + emniyetler"],
            ["src/engine/phenology.ts", "fenoloji penceresi"],
            ["src/engine/climate.ts", "SPI-30 ve iklim normali"],
            ["src/engine/anomaly.ts", "şüpheli veri tespiti"],
            ["src/engine/model.ts", "hakem modeli"],
            ["src/engine/pricing.ts", "prim"],
            ["src/engine/evidence.ts", "kanıt paketi + hash"],
            ["contracts/AgriShieldPolicy.sol", "akıllı sözleşme"],
            ["tests/unit/*.test.ts", "motor testleri"],
          ].map(([f, w]) => (
            <li key={f}>
              {f} <span className="font-sans text-dim">— {w}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ───────── KAYNAKÇA ───────── */}
      <H2 id="kaynakca" icon={BookOpen}>
        Kaynakça
      </H2>
      <ul className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        {Object.values(SOURCES).map((s) => {
          const external = /^https?:/.test(s.url);
          return (
            <li key={s.id} id={`s-${s.id}`} className="panel scroll-mt-24 p-4">
              <div className="font-semibold">{s.title}</div>
              <div className="text-sm text-dim">
                {s.publisher}
                {s.date ? ` · ${s.date}` : ""}
              </div>
              {s.note && <div className="mt-1 text-xs text-dim">{s.note}</div>}
              <a href={s.url} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="mt-2 inline-flex items-center gap-1 text-sm text-sky-fg underline underline-offset-4 [overflow-wrap:anywhere]">
                {external ? new URL(s.url).hostname : s.url} {external && <ExternalLink className="size-3.5 shrink-0" aria-hidden />}
              </a>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-sm text-dim">
        Kurum adları yalnızca kaynak göstermek için geçer; hiçbir kurumla ortaklık ya da onay ima edilmez. Demodaki parsel ve sezon verisi örnektir (ÖRNEK VERİ rozeti); iklim
        normali ve geriye dönük test gerçek ERA5 verisidir.
      </p>
    </main>
  );
}
