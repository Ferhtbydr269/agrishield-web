import { UserRound } from "lucide-react";
import { COPY } from "@/content/copy";
import { Era5Chart, type SeasonPoint } from "@/components/ui/Era5Chart";
import { RealDataBadge } from "@/components/ui/Badges";
import { Section } from "@/components/ui/Section";
import { Stat } from "@/components/ui/Stat";
import { TwoTimelines } from "@/components/ui/TwoTimelines";

function Emph({ text, words }: { text: string; words: readonly string[] }) {
  const parts: React.ReactNode[] = [];
  let rest = text;
  let k = 0;
  while (rest.length) {
    const hit = words.map((w) => ({ w, i: rest.indexOf(w) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i)[0];
    if (!hit) {
      parts.push(rest);
      break;
    }
    parts.push(rest.slice(0, hit.i));
    parts.push(
      <strong key={k++} className="font-semibold text-text">
        {hit.w}
      </strong>,
    );
    rest = rest.slice(hit.i + hit.w.length);
  }
  return <>{parts}</>;
}

export function Problem({ season2025 }: { season2025: SeasonPoint[] }) {
  return (
    <Section
      id="problem"
      index="01"
      eyebrow="Problem"
      title={<>Kuraklık Nisan'da, para Eylül'de.</>}
      lead={<Emph text={COPY.problem.body} words={COPY.problem.bodyEmphasis} />}
      detailHref="/parsel/P-1182"
      detailLabel="Mehmet Amca'nın parseli"
    >
      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="grid gap-6">
          <div className="panel p-5">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-soil/15 text-soil-fg">
                <UserRound className="size-5" aria-hidden />
              </span>
              <div>
                <div className="eyebrow">Mehmet Amca · Siverek · örnek senaryo</div>
                <p className="mt-2 leading-relaxed text-dim">
                  Siverek'te 80 dönüm kıraç buğday. Mart'ta yağmur normalin çok altında kalıyor, Nisan'da buğday başak vermeden sararıyor. Tohum, gübre ve
                  mazot kredisi Haziran'da ödenecek; köy bazlı sigortanın parası ise ancak hasattan sonra, köy verimi açıklanınca — köy ortalaması eşiğin
                  altındaysa — gelecek.
                </p>
                <p className="mt-2 text-xs text-dim">{COPY.mehmetNote}</p>
              </div>
            </div>
          </div>
          <TwoTimelines />
        </div>
        <div className="grid content-start gap-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <Stat factId="hasarIhbari2024" size="md" />
            <Stat factId="doluPayi2024" size="md" />
            <Stat factId="koyBazliOdemeSuresi" size="md" />
          </div>
          <div className="panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="eyebrow">Siverek · 2024–25 sezonu · yağış</div>
              <RealDataBadge label="GERÇEK VERİ · ERA5" />
            </div>
            <div className="mt-3">
              <Era5Chart data={season2025} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <Stat factId="era5Sezon2025Yagis" size="md" tone="sky" label="2024–25 sezonu" />
              <Stat factId="era5SezonNormal" size="md" tone="green" label="30 sezon ortalaması" />
              <Stat factId="era5Sezon2025Acik" size="md" tone="red" label="yağış açığı" />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-dim">
              Kuraklığın kendisi gerçek: Mayıs 2025'te TZOB, Şanlıurfa'da kuru tarımda buğday, arpa ve mercimekte kayıp açıkladı.
            </p>
            <div className="mt-3">
              <Stat factId="sanliurfaKayip2025" size="md" tone="wheat" />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
