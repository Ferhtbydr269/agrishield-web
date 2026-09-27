"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { COPY } from "@/content/copy";
import { outcomeFor } from "@/engine/decision";
import type { Verdict, WitnessKey } from "@/engine/types";
import { DecisionBadge } from "@/components/ui/DecisionBadge";
import { Section } from "@/components/ui/Section";
import { VoteRing } from "@/components/ui/VoteRing";
import { WITNESS_META } from "@/components/ui/Witness";
import { cn } from "@/components/ui/cn";

const CYCLE: Verdict[] = ["EVET", "HAYIR", "VERI_YOK"];
const DESC: Record<WitnessKey, string> = {
  satellite: "Her parseli ~5 günde bir izler. NDVI, aynı dönemin normaline göre düştü mü?",
  station: "Köyün tarafsız referans istasyonu: 30 günlük yağış ve kök bölgesi nemi.",
  meteo: "Resmi/bağımsız bölgesel veri: SPI-30 kuraklık indisi, uzun yıllar yağışı.",
};

export function ThreeWitnessesInteractive({ stage = false }: { stage?: boolean }) {
  const [v, setV] = useState<Record<WitnessKey, Verdict>>({ satellite: "EVET", station: "EVET", meteo: "HAYIR" });
  const yes = (Object.values(v) as Verdict[]).filter((x) => x === "EVET").length;
  const outcome = outcomeFor(yes);
  const cycle = (k: WitnessKey) => setV((s) => ({ ...s, [k]: CYCLE[(CYCLE.indexOf(s[k]) + 1) % CYCLE.length] }));
  return (
    <div className={cn("grid items-center gap-8", stage ? "grid-cols-[1.2fr_1fr]" : "lg:grid-cols-[1.2fr_1fr]")}>
      <div className="grid gap-3">
        {(Object.keys(WITNESS_META) as WitnessKey[]).map((k) => {
          const m = WITNESS_META[k];
          const verdict = v[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => cycle(k)}
              className={cn(
                "group flex items-center gap-4 rounded-2xl border p-4 text-left transition-colors",
                verdict === "EVET" ? "border-green/60 bg-green/10" : verdict === "HAYIR" ? "border-red/50 bg-red/5" : "border-wheat/50 bg-wheat/5",
                stage && "px-6 py-4",
              )}
              aria-label={`${m.label} tanığı: ${verdict}. Değiştirmek için tıklayın.`}
            >
              <m.Icon className={cn("shrink-0", m.accent, stage ? "size-12" : "size-8")} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className={cn("font-semibold", stage ? "text-3xl" : "text-lg")}>{m.label}</div>
                <div className={cn("text-dim", stage ? "text-lg leading-snug" : "text-sm")}>{DESC[k]}</div>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 font-mono font-bold",
                  verdict === "EVET" ? "bg-green text-bg" : verdict === "HAYIR" ? "bg-red text-bg" : "bg-wheat text-bg",
                  stage ? "text-2xl" : "text-sm",
                )}
              >
                {verdict === "VERI_YOK" ? "VERİ YOK" : verdict}
              </span>
            </button>
          );
        })}
        <p className={cn("text-dim", stage ? "text-lg" : "text-xs")}>Tanıklara tıklayarak oyları değiştirin. VERİ YOK oy sayılmaz.</p>
      </div>
      <div className="flex flex-col items-center gap-5">
        <VoteRing key={JSON.stringify(v)} verdicts={v} outcome={outcome} size={stage ? 380 : 280} />
        <DecisionBadge key={outcome} outcome={outcome} size={stage ? "lg" : "md"} />
      </div>
    </div>
  );
}

export function Solution() {
  return (
    <Section id="cozum" index="02" eyebrow="Çözüm" title="Üç tanık. İkisi yeterli." lead={COPY.solution.body}>
      <div className="panel ticks p-5 sm:p-7">
        <ThreeWitnessesInteractive />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="panel p-6">
          <div className="eyebrow">Klasik sigorta ↔ parametrik sigorta</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface-2 p-4">
              <div className="font-semibold">Klasik: zararı ölçer</div>
              <ol className="mt-3 grid gap-1.5 text-sm text-dim">
                {["Hasar olur", "Çiftçi ihbar eder", "Eksper sırası", "Tarlada ölçüm + rapor", "Ödeme haftalar–aylar sonra"].map((s, i) => (
                  <li key={s} className="flex items-center gap-2">
                    <span className="font-mono text-xs text-dim">{i + 1}</span> {s}
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-xl border border-green/40 bg-green/5 p-4">
              <div className="font-semibold text-green-fg">Parametrik: sebebini ölçer</div>
              <ol className="mt-3 grid gap-1.5 text-sm text-dim">
                {["Olay sürekli ölçülür (yağış, nem, yeşillik)", "Eşik poliçede önceden yazılı", "Eşik aşılırsa ödeme otomatik", "Başvuru yok, günler içinde"].map((s, i) => (
                  <li key={s} className="flex items-center gap-2">
                    <span className="font-mono text-xs text-green-fg">{i + 1}</span> {s}
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <p className="mt-4 text-sm text-dim">
            <strong className="text-text">Konumlandırma:</strong> TARSİM'in rakibi değil; parsel bazlı sigortanın ölçüm–karar–ödeme altyapısı. Tek tanık "evet" derse vaka eksper incelemesine düşer.
          </p>
        </div>

        <div className="panel p-6">
          <div className="eyebrow">Basis risk: projenin asıl düşmanı</div>
          <p className="mt-3 text-sm leading-relaxed text-dim">
            Ölçtüğümüz endeks ile çiftçinin gerçek zararı arasındaki fark. Üç tanık, parsel bazlı ölçüm ve gri bölgedeki vakaları eksperin önüne koyan hibrit
            yapı bu farkı küçültmek için var.
          </p>
          <div className="mt-4 grid grid-cols-[auto_1fr_1fr] gap-2 text-sm">
            <div />
            <div className="text-center font-mono text-xs text-dim">sistem: "öde"</div>
            <div className="text-center font-mono text-xs text-dim">sistem: "ödeme"</div>
            <div className="self-center font-mono text-xs text-dim">zarar var</div>
            <div className="rounded-lg border border-green/50 bg-green/10 p-3 text-green-fg">
              <b>Doğru ödeme</b>
              <div className="text-xs opacity-90">mağdur parasını aldı</div>
            </div>
            <div className="rounded-lg border border-red/50 bg-red/10 p-3 text-red-fg">
              <b>Çiftçi mağdur</b>
              <div className="text-xs opacity-90">güveni en çok bu öldürür</div>
            </div>
            <div className="self-center font-mono text-xs text-dim">zarar yok</div>
            <div className="rounded-lg border border-wheat/50 bg-wheat/10 p-3 text-wheat-fg">
              <b>Kasa zararı</b>
              <div className="text-xs opacity-90">prim pahalanır</div>
            </div>
            <div className="rounded-lg border border-line bg-surface-2 p-3 text-dim">
              <b className="text-text">Doğru red</b>
              <div className="text-xs">sorun yok</div>
            </div>
          </div>
          <a href="#demo" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-wheat-fg">
            Gri bölge senaryosunu demoda izle <ArrowRight className="size-4" aria-hidden />
          </a>
        </div>
      </div>
    </Section>
  );
}
