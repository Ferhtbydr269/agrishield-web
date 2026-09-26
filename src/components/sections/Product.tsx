"use client";
import { motion } from "motion/react";
import { Ruler, Radio, BrainCircuit, ShieldCheck, Gavel, Landmark, Link2, Coins, Scale, Sprout, AlertTriangle } from "lucide-react";
import { COPY } from "@/content/copy";
import { PHENOLOGY } from "@/engine/phenology";
import { DEFAULT_THRESHOLDS as T } from "@/engine/thresholds";
import { Section } from "@/components/ui/Section";
import { Stat } from "@/components/ui/Stat";
import { SimBadge } from "@/components/ui/Badges";
import { cn } from "@/components/ui/cn";

const STEP_ICON = [Ruler, Radio, BrainCircuit, ShieldCheck, Gavel, Landmark];
const STEP_TONE = ["text-sky-fg", "text-soil-fg", "text-violet-fg", "text-green-fg", "text-chain-fg", "text-wheat-fg"];
const STEP_TEXT = [
  "Her parsel uydudan izlenir. Köyde tek referans istasyon toprak nemini ve yağışı ölçer. Resmi meteoroloji verisi eklenir.",
  "İstasyon verisi LoRa ile köydeki gateway'e, oradan internete gider. Uydu verisi Copernicus'tan çekilir.",
  "Veri temizlenir, NDVI'nin normale göre farkı hesaplanır. Hakem model ürüne ve döneme göre eşiği belirler.",
  "Uydu, yer istasyonu ve resmi meteoroloji ayrı ayrı EVET/HAYIR der. Tek EVET varsa vaka eksperin önüne gider.",
  "Kurallar akıllı sözleşmede önceden yazılı. Karar ve kanıtın parmak izi değiştirilemez şekilde kaydedilir.",
  "Banka/ödeme kuruluşu API'si ile TL ödeme, FAST ile IBAN'a. Çiftçiye SMS + kanıt linki.",
];

const CONTRACT = `// Her tanık kararını oracle üzerinden imzalı iletir
function finalize(bytes32 id, bytes32 evidenceHash)
    external onlyOracle notPaused returns (uint8) {
  Case storage c = cases[id];
  uint8 yes = (c.w.sat ? 1 : 0) + (c.w.station ? 1 : 0)
            + (c.w.meteo ? 1 : 0);
  if (yes >= 2)       o = Outcome.ODE;       // → banka FAST ile öder
  else if (yes == 1)  o = Outcome.GRI_BOLGE; // → eksper incelemesi
  else                o = Outcome.ODEME_YOK; // → itiraz hakkı korunur
  if (o == Outcome.ODE) require(payouts[key] < 1, "sezon tavani");
  emit DecisionAnchored(id, c.parcelPseudoId, yes, uint8(o),
                        c.amountTl, evidenceHash, block.timestamp);
}`;

const md = (s: string) => {
  const [m, d] = s.split("-").map(Number);
  return `${d} ${["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"][m - 1]}`;
};

export function Product() {
  return (
    <Section id="urun" index="03" eyebrow="Ürün" title="Ölç → Topla → Anla → Doğrula → Karar → Öde" lead={COPY.product.aiReferee} detailHref="/k/7F3A" detailLabel="Bir kararın tüm delili">
      {/* 6 adım şeridi */}
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {COPY.product.steps.map((s, i) => {
          const Icon = STEP_ICON[i];
          return (
            <motion.li
              key={s.key}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.22, delay: i * 0.06 }}
              className="panel relative flex flex-col p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-dim">{String(i + 1).padStart(2, "0")}</span>
                <Icon className={cn("size-5", STEP_TONE[i])} aria-hidden />
              </div>
              <div className="mt-3 font-display text-2xl font-extrabold">{s.label}</div>
              <div className="font-mono text-[0.7rem] uppercase tracking-wider text-dim">{s.detail}</div>
              <p className="mt-2 text-sm leading-snug text-dim">{STEP_TEXT[i]}</p>
            </motion.li>
          );
        })}
      </ol>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Yapay zekâ hakem */}
        <div className="panel border-violet/40 p-6">
          <div className="flex items-center gap-2 text-violet-fg">
            <BrainCircuit className="size-5" aria-hidden />
            <span className="eyebrow !text-violet-fg">Yapay zekâ = hakem, tanık değil</span>
          </div>
          <ul className="mt-4 grid gap-3 text-sm">
            {[
              [Scale, "Eşiği ayarlar", "Ürüne ve gelişim dönemine göre (fenoloji penceresi)"],
              [Coins, "Primi hesaplar", "Beklenen hasar + gider/güvenlik payı"],
              [Sprout, "Erken uyarır", "Risk skoru eşiği geçince çiftçiye önlem SMS'i"],
              [AlertTriangle, "Şüpheli veriyi işaretler", "Yağışsız ani nem artışı, 3σ tutarsızlık"],
            ].map(([I, a, b]) => {
              const Icon = I as typeof Scale;
              return (
                <li key={a as string} className="flex gap-3">
                  <Icon className="mt-0.5 size-4 shrink-0 text-violet-fg" aria-hidden />
                  <span>
                    <b className="text-text">{a as string}</b>
                    <span className="block text-dim">{b as string}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 rounded-lg bg-violet/10 p-3 text-xs leading-relaxed text-violet-fg">
            Tahmine para ödenmez. Ödeme kararı üç bağımsız ölçümün oylamasına bağlıdır. Prototipteki hakem skoru açıklanabilir, uzman ayarlı bir modeldir
            (eğitilmiş değil); üretimde açık verilerle XGBoost + SHAP.
          </p>
        </div>

        {/* Karar kuralları — motorun kendisinden */}
        <div className="panel p-6">
          <div className="eyebrow">Karar motoru kuralları (canlı koddan)</div>
          <div className="mt-4 text-sm font-semibold">Kıraç buğday fenoloji penceresi</div>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left font-mono text-[0.68rem] uppercase tracking-wider text-dim">
                <th className="pb-1.5 font-medium">Dönem</th>
                <th className="pb-1.5 font-medium">Tarih</th>
                <th className="pb-1.5 text-right font-medium">Ağırlık</th>
              </tr>
            </thead>
            <tbody>
              {PHENOLOGY.bugday
                .filter((w) => w.key !== "ekim")
                .map((w) => (
                  <tr key={w.key} className={cn("border-t border-line", w.weight === 1 && "text-wheat-fg")}>
                    <td className="py-1.5 pr-2">{w.label}</td>
                    <td className="py-1.5 font-mono text-xs text-dim">
                      {md(w.start)}–{md(w.end)}
                    </td>
                    <td className="py-1.5 text-right font-mono">{w.triggerEnabled ? w.weight.toFixed(1).replace(".", ",") : "tetik kapalı"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-dim">Efektif NDVI eşiği = {String(T.ndviAnomaly).replace(".", ",")} / ağırlık. Hasat penceresinde uydu tanığı daima HAYIR: hasadı kuraklık sanmaz.</p>
          <div className="mt-4 text-sm font-semibold">Solma noktası (kök bölgesi nemi)</div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            {(["killi", "tinli", "kumlu"] as const).map((s) => (
              <div key={s} className="rounded-lg border border-line bg-surface-2 py-2">
                <div className="font-mono text-lg font-bold text-soil-fg">%{T.soilWilting[s]}</div>
                <div className="text-xs text-dim">{s === "tinli" ? "tınlı" : s}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-dim">"Aynı %15 nem kumlu toprakta iyi, killi toprakta kuraklıktır."</p>
        </div>

        {/* Sözleşme özeti */}
        <div className="panel p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="eyebrow">Akıllı sözleşme · 12 satırlık özet</div>
            <Link2 className="size-4 text-chain-fg" aria-hidden />
          </div>
          <pre className="mt-4 overflow-x-auto rounded-lg border border-line bg-bg p-3 font-mono text-[0.7rem] leading-relaxed text-chain-fg">
            <code>{CONTRACT}</code>
          </pre>
          <p className="mt-3 text-xs text-dim">Tam kod: contracts/AgriShieldPolicy.sol · rol bazlı oracle, devre kesici (pause), parsel/gün ödeme tavanı, kişisel veri yok.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="panel p-6">
          <div className="flex items-center gap-2 text-chain-fg">
            <Link2 className="size-5" aria-hidden />
            <span className="eyebrow !text-chain-fg">Neden blokzincir?</span>
          </div>
          <p className="mt-3 leading-relaxed">{COPY.blockchainCard}</p>
        </div>
        <div className="panel p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-wheat-fg">
              <Landmark className="size-5" aria-hidden />
              <span className="eyebrow !text-wheat-fg">Para nasıl ulaşır?</span>
            </div>
            <SimBadge label="PROTOTİPTE SİMÜLASYON" />
          </div>
          <p className="mt-3 leading-relaxed">{COPY.paymentCard}</p>
        </div>
        <div className="panel p-6">
          <div className="eyebrow">Ölçeklenebilirlik</div>
          <div className="mt-3">
            <Stat factId="zincirIhtiyacTps" size="md" tone="chain" label="1 milyon poliçe × günde 1 kayıt için gereken işlem hızı" />
          </div>
          <p className="mt-3 text-sm text-dim">Günün tüm kayıtları tek bir Merkle kökü olarak yazılırsa günde 1 işlem yeter. Her parsel uydudan, her köy tek istasyondan:</p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <Stat factId="tarlaBasiSensor" size="md" tone="red" label="tarla başı sensör (eski)" />
            <Stat factId="istasyonParselBasi" size="md" tone="green" label="köy istasyonu (parsel başı)" />
          </div>
        </div>
      </div>
    </Section>
  );
}
