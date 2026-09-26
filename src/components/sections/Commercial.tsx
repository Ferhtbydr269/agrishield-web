import { COPY } from "@/content/copy";
import { Section } from "@/components/ui/Section";
import { Stat } from "@/components/ui/Stat";
import { RealDataBadge } from "@/components/ui/Badges";
import { PremiumCalculator } from "./PremiumCalculator";

export interface BacktestSeason {
  season: string;
  aprMayRainMm: number;
  triggered: boolean;
  bothDays: number;
  meteoDays: number;
}

export function BacktestChart({ seasons, stage = false }: { seasons: BacktestSeason[]; stage?: boolean }) {
  const W = 760;
  const H = stage ? 260 : 200;
  const pad = { l: 36, r: 8, t: 12, b: 36 };
  const max = Math.max(...seasons.map((s) => s.aprMayRainMm));
  const bw = (W - pad.l - pad.r) / seasons.length;
  const Y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="35 sezonun Nisan–Mayıs yağışı; tetiklenen sezonlar vurgulu">
      {[50, 100, 150, 200, 250].filter((v) => v < max).map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={Y(v)} y2={Y(v)} stroke="var(--line)" strokeDasharray="2 4" />
          <text x={pad.l - 6} y={Y(v) + 4} textAnchor="end" fontSize={stage ? 13 : 10} fill="var(--text-dim)" fontFamily="var(--font-mono)">
            {v}
          </text>
        </g>
      ))}
      {seasons.map((s, i) => {
        const y = Y(s.aprMayRainMm);
        const is25 = s.season === "2024-2025";
        return (
          <g key={s.season}>
            <rect x={pad.l + i * bw + 1.5} y={y} width={bw - 3} height={H - pad.b - y} rx="2" fill={s.triggered ? "var(--red)" : is25 ? "var(--wheat)" : "var(--sky)"} opacity={s.triggered || is25 ? 0.95 : 0.45} />
            <title>{`${s.season}: Nis–May ${s.aprMayRainMm} mm${s.triggered ? " · TETİKLENİRDİ" : ""}`}</title>
            {(i % 5 === 0 || s.triggered || is25) && (
              <text x={pad.l + i * bw + bw / 2} y={H - pad.b + 14} textAnchor="middle" fontSize={stage ? 12 : 9} fill={s.triggered ? "var(--red-fg)" : is25 ? "var(--wheat-fg)" : "var(--text-dim)"} fontFamily="var(--font-mono)">
                {s.season.slice(7)}
              </text>
            )}
          </g>
        );
      })}
      <text x={pad.l} y={H - 4} fontSize={stage ? 12 : 10} fill="var(--text-dim)" fontFamily="var(--font-mono)">
        Nisan–Mayıs yağışı (mm), sezon bitiş yılı
      </text>
    </svg>
  );
}

const MODEL = [
  ["TARSİM ve havuz şirketleri", "Parsel izleme, hasar ön tespiti, eksper önceliklendirme, parametrik karar motoru", "Parsel başı sezonluk ücret (örn. ₺50)"],
  ["Kooperatifler", "Köy istasyonu kurulum + bakım, üyelerine erken uyarı", "İstasyon başı yıllık kiralama"],
  ["Bankalar, tarım kredi", "Parsel risk skoru API'si, kuraklık tetikleyicisi", "Sorgu başı / yıllık lisans"],
  ["Kamu", "Bölgesel kuraklık haritası, erken uyarı verisi", "Proje / lisans"],
];

const RIVALS = [
  ["TARSİM köy bazlı kuraklık", "Köy verim ortalamasına göre başvurusuz ödeme", "%70 devlet desteği, yaygın, yasal zemin", "Köy ortalaması + hasat sonrası → parsel bazlı, günler içinde"],
  ["TARSİM parsel bazlı pilot (Tekirdağ, 2026)", "Tarlanın kendi verim kaybına göre ödeme", "Basis risk düşük, yüksek katılım", "Ölçüm altyapısı gerekiyor → biz o altyapı olabiliriz (müşteri, rakip değil)"],
  ["Lemonade Crypto Climate Coalition (Kenya)", "Alan verim verisiyle otomatik ödeme", "Konseptin çalıştığının kanıtı", "Alan bazlı, tek veri türü, kripto altyapı → parsel + 3 tanık + TL"],
  ["Arbol (ABD)", "İklim/hava verisine dayalı parametrik risk ürünleri", "Büyük ölçek, veri altyapısı", "Kurumsal odak; Türkiye ve küçük çiftçi yok"],
  ["Doktar (Türkiye)", "Sensör istasyonları + uydudan tarla takibi", "Yerli, sahada, çiftçi ağı", "Sigorta tetikleme/ödeme yok → olası veri ortağı"],
];

export function Commercial({ seasons, backtestP }: { seasons: BacktestSeason[]; backtestP: number }) {
  return (
    <Section id="ticari" index="06" eyebrow="Ticari" title="Çiftçiden değil, sigortacıdan parsel başı ücret." lead={COPY.commercial.body}>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="grid content-start gap-6">
          <div className="panel overflow-x-auto p-5">
            <div className="eyebrow mb-3">Kim, kime, ne için öder?</div>
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left font-mono text-[0.68rem] uppercase tracking-wider text-dim">
                  <th className="pb-2 pr-3 font-medium">Müşteri</th>
                  <th className="pb-2 pr-3 font-medium">Hizmet</th>
                  <th className="pb-2 font-medium">Fiyatlama (örnek)</th>
                </tr>
              </thead>
              <tbody>
                {MODEL.map(([a, b, c]) => (
                  <tr key={a} className="border-t border-line align-top">
                    <td className="py-2.5 pr-3 font-semibold">{a}</td>
                    <td className="py-2.5 pr-3 text-dim">{b}</td>
                    <td className="py-2.5">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel p-5">
            <div className="eyebrow mb-4">Pazar — aşağıdan yukarıya, aynı birimle</div>
            <div className="grid gap-5 sm:grid-cols-3">
              <Stat factId="tarsimBitkiselPrim2024" size="md" label="TAM: bitkisel ürün sigortası primi (2024)" />
              <Stat factId="samYillik" size="md" tone="wheat" label="SAM: tüm bitkisel poliçelere izleme" />
              <div className="grid gap-3">
                <Stat factId="somAlt" size="md" tone="green" label="SOM alt (ilk 3 yıl, poliçelerin %2'si)" />
                <Stat factId="somUst" size="md" tone="green" label="SOM üst (%5)" />
              </div>
            </div>
            <div className="mt-5 grid gap-5 border-t border-line pt-4 sm:grid-cols-3">
              <Stat factId="izlemeUcreti" size="md" />
              <Stat factId="ortalamaBitkiselPrim" size="md" />
              <Stat factId="parametrikPazar2031" size="md" tone="sky" label="Global parametrik pazar, 2031 tahmini (TAM değil, trend)" />
            </div>
          </div>
        </div>
        <div className="grid content-start gap-6">
          <PremiumCalculator backtestP={backtestP} />
          <div className="panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="eyebrow">Tetik olasılığı nereden? Geriye dönük test · Siverek · 35 sezon</div>
              <RealDataBadge label="GERÇEK VERİ · ERA5" />
            </div>
            <div className="mt-3">
              <BacktestChart seasons={seasons} />
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Stat factId="backtestTetikSezon" size="md" tone="red" label="iki yağış tanığı birlikte tetiklenirdi" />
              <Stat factId="backtestTetikOlasiligi" size="md" tone="wheat" />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-dim">
              Motorun gerçek kurallarıyla: kritik dönemde meteoroloji tanığı ve 30 günlük yağış ≤ 10 mm aynı gün. 2008 ve 2021 kuraklıkları yakalanıyor.
              <b className="text-wheat-fg"> 2024–25 yakalanmıyor:</b> o sezon kuraklık kışın yaşandı, Nisan yağışı normaldi. Bitkiyi doğrudan gören uydunun tanık olmasının nedeni tam olarak bu.
              Uydu ve toprak nemi geçmiş için olmadığından oran bir üst yaklaşımdır; gölge mod pilotta gerçek verimle doğrulanacak.
            </p>
          </div>
        </div>
      </div>
      <div className="panel mt-6 overflow-x-auto p-5">
        <div className="eyebrow mb-3">Dürüst rakip analizi — benzerleri kabul et, farkı net söyle</div>
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-left font-mono text-[0.68rem] uppercase tracking-wider text-dim">
              <th className="pb-2 pr-3 font-medium">Çözüm</th>
              <th className="pb-2 pr-3 font-medium">Ne yapıyor</th>
              <th className="pb-2 pr-3 font-medium">Güçlü yanı</th>
              <th className="pb-2 font-medium">Eksik kalan / AgriShield farkı</th>
            </tr>
          </thead>
          <tbody>
            {RIVALS.map((r) => (
              <tr key={r[0]} className="border-t border-line align-top">
                <td className="py-2.5 pr-3 font-semibold">{r[0]}</td>
                <td className="py-2.5 pr-3 text-dim">{r[1]}</td>
                <td className="py-2.5 pr-3 text-green-fg">{r[2]}</td>
                <td className="py-2.5">{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-dim">Kurum adları yalnızca bağlam içindir; herhangi bir iş ortaklığı ima edilmez.</p>
      </div>
    </Section>
  );
}
