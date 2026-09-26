import { Eye, Ruler, Zap } from "lucide-react";
import { COPY } from "@/content/copy";
import { Section } from "@/components/ui/Section";
import { Stat } from "@/components/ui/Stat";

const PHASES = [
  {
    n: "Faz 1",
    when: "0–12 ay",
    title: "Eksper asistanı + gölge mod pilot",
    tag: "Regülasyon değişikliği gerekmez",
    Icon: Eye,
    tone: "text-sky-fg",
    items: ["Uydu ile hasar ön tespiti, eksper önceliklendirme, dolu için hasar radarı", "Şanlıurfa'da bir kooperatifle bir sezon gölge mod pilot", "Sistem ödeme yapmaz; 'öderdim / ödemezdim' kararını zaman damgasıyla kaydeder", "Gelir: parsel başı izleme ücreti"],
  },
  {
    n: "Faz 2",
    when: "12–24 ay",
    title: "Parsel verim ölçüm motoru",
    tag: "TARSİM entegrasyonu, birkaç il",
    Icon: Ruler,
    tone: "text-wheat-fg",
    items: ["Parsel bazlı verim sigortasının yaygınlaşmasında parsel kaybını otomatik ölçen altyapı", "Pilot sonuçlarıyla kalibre edilmiş eşikler", "Bankalara risk skoru API'si"],
  },
  {
    n: "Faz 3",
    when: "24+ ay",
    title: "Otomatik parametrik ödeme + Dijital TL",
    tag: "Düzenleyici onayı, FAST / Dijital TL",
    Icon: Zap,
    tone: "text-green-fg",
    items: ["Tamamlayıcı parametrik ürünler (ör. sıcak hava dalgası)", "Kuraklık avansı: köy bazlı tazminattan önce otomatik ön ödeme", "Dijital TL programlanabilir ödeme"],
  },
];

export function Roadmap() {
  return (
    <Section id="yol" index="08" eyebrow="Yol haritası" title="Önce gölge mod, sonra otomatik ödeme." lead={COPY.roadmap.body}>
      <ol className="grid gap-4 lg:grid-cols-3">
        {PHASES.map((p) => (
          <li key={p.n} className="panel relative p-6">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-dim">
                {p.n} · {p.when}
              </span>
              <p.Icon className={`size-5 ${p.tone}`} aria-hidden />
            </div>
            <h3 className="mt-3 text-2xl font-extrabold">{p.title}</h3>
            <div className={`mt-1 font-mono text-xs uppercase tracking-wider ${p.tone}`}>{p.tag}</div>
            <ul className="mt-4 grid gap-2 text-sm text-dim">
              {p.items.map((i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-line-strong" aria-hidden />
                  {i}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="panel p-6">
          <div className="eyebrow">Gölge mod (shadow mode) nedir?</div>
          <p className="mt-3 leading-relaxed">
            Sistem bir sezon boyunca tamamen çalışır ama gerçek para ödemez. Her parsel için "şu tarihte öderdim / ödemezdim" kararını zaman damgasıyla zincire
            yazar. Sezon sonunda bu kararlar gerçek hasat verimi ve TARSİM'in sonuçlarıyla karşılaştırılır; basis risk (recall/precision) sahada, kimse risk
            almadan ölçülür. Sigortacılar yeni bir sistemi tam da böyle test eder.
          </p>
        </div>
        <div className="panel p-6">
          <div className="eyebrow">Neden şimdi?</div>
          <div className="mt-4 grid gap-5">
            <Stat factId="tekirdagPilotKatilim" size="md" tone="green" />
            <Stat factId="dijitalTLUcuncuAsama" size="md" tone="sky" />
          </div>
        </div>
      </div>
    </Section>
  );
}
