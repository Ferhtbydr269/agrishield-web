"use client";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { cn } from "@/components/ui/cn";

export interface RiskItem {
  id: string;
  name: string;
  p: 1 | 2 | 3 | 4 | 5;
  i: 1 | 2 | 3 | 4 | 5;
  owner: string;
  why: string;
  mitigations: string[];
  demo?: string;
}

export const RISKS: RiskItem[] = [
  {
    id: "basis",
    name: "Basis risk",
    p: 4,
    i: 5,
    owner: "Aleyna",
    why: "Ölçülen endeks ile çiftçinin gerçek zararı her zaman aynı değil; en çok güveni bozan risk.",
    mitigations: ["Köy ortalaması yerine parsel bazlı uydu ölçümü", "Tek kaynak yerine üç bağımsız tanık (2/3)", "Tek tanıklı vakalar eksper incelemesine (hibrit)", "Gölge mod pilotta kararlar gerçek hasat verimiyle karşılaştırılır"],
    demo: "Gri bölge senaryosu",
  },
  {
    id: "manip",
    name: "Sensör manipülasyonu",
    p: 3,
    i: 4,
    owner: "Ferhat",
    why: "İstasyon sulanır, yerinden oynatılır ya da kutu kurcalanır.",
    mitigations: ["İstasyon çiftçinin değil, kooperatifin/sigortacının; tarafsız noktada, kilitli", "Yağışsız 1 saatte >8 puan nem artışı → şüpheli bayrak", "Kurcalama/eğim sensörü, çapraz tutarsızlık (3σ) kontrolü", "Yer tanığı tek başına ödeme yaptıramaz"],
    demo: "Manipülasyon testi",
  },
  {
    id: "reg",
    name: "Regülasyon (tam otomatik ödeme)",
    p: 3,
    i: 5,
    owner: "Bedirhan",
    why: "Parametrik otomatik ödeme için düzenleyici onayı gerekir.",
    mitigations: ["Faz 1 (eksper asistanı + gölge mod) regülasyon değişikliği gerektirmez", "Sigorta ürününü havuz/şirketler sunar; biz teknoloji sağlayıcıyız", "Ödeme lisanslı banka/ödeme kuruluşu üzerinden, TL ve FAST ile", "Tam otomasyon Faz 3'te, düzenleyiciyle pilot sonrası"],
  },
  {
    id: "data",
    name: "Veri erişimi",
    p: 4,
    i: 3,
    owner: "Aleyna",
    why: "Gerçek hasar etiketleri (TARSİM kayıtları) kamuya açık değil.",
    mitigations: ["Açık verilerle başla: Sentinel-1/2, ERA5, CHIRPS, TÜİK", "Meteoroloji normali ve backtest bugün gerçek ERA5 verisiyle çalışıyor", "Hasar kayıtları pilot ortaklığının hedefi"],
  },
  {
    id: "oracle",
    name: "Oracle manipülasyonu",
    p: 2,
    i: 4,
    owner: "Yakup",
    why: "Zincir dış dünyayı göremez; veriyi getiren yalan söyleyebilir.",
    mitigations: ["Her tanığın verisi birden fazla bağımsız düğümden, medyan", "Üç tanıktan ikisi anlaşmalı", "Parsel ve gün başına ödeme tavanı, devre kesici"],
  },
  {
    id: "kvkk",
    name: "KVKK / kişisel veri",
    p: 2,
    i: 4,
    owner: "Yakup",
    why: "Çiftçinin kimliği, IBAN'ı zincire yazılırsa geri alınamaz.",
    mitigations: ["Zincirde yalnız takma adlı parsel kimliği ve parmak izleri", "Kişi eşleştirmesi sigortacının güvenli sisteminde", "IBAN ve telefon ekranda maskeli"],
  },
  {
    id: "contract",
    name: "Akıllı sözleşme hatası",
    p: 2,
    i: 4,
    owner: "Yakup",
    why: "Sözleşmedeki bir hata yanlış onaylara yol açabilir.",
    mitigations: ["Canlı öncesi bağımsız güvenlik denetimi", "Devre kesici (pause) ile anında durdurma", "Düzeltme proxy + timelock ile, herkesin gözü önünde"],
  },
  {
    id: "cloud",
    name: "Bulut / uydu veri boşluğu",
    p: 3,
    i: 2,
    owner: "Aleyna",
    why: "Bulutlu dönemde optik uydu (Sentinel-2) göremez.",
    mitigations: ["15 gün bulutsuz geçiş yoksa Sentinel-1 radar yedeği", "Karar istasyon + meteoroloji ile de verilebilir (2/3)", "Kuraklık dönemleri çoğunlukla açık havalıdır"],
  },
  {
    id: "climate",
    name: "İklim değişikliği / kavram kayması",
    p: 3,
    i: 3,
    owner: "Aleyna",
    why: "Geçmişle eğitilen model geleceği tutmayabilir.",
    mitigations: ["Walk-forward doğrulama, her sezon yeniden eğitim", "'Normal' kayan pencereyle hesaplanır", "Ödeme kararı modele değil ölçüme bağlı"],
  },
  {
    id: "stage",
    name: "Sahnede internet / donanım",
    p: 3,
    i: 3,
    owner: "Takım",
    why: "Canlı demo sırasında internet ya da cihaz düşebilir.",
    mitigations: ["OFFLINE=1: zincir, SMS, asistan yerel taklitçilere düşer, rozetle söylenir", "Cihaz 20 sn sessizse simüle cihaz devreye girer", "`npm run dry-run` provası + yedek video"],
  },
];

const cellTone = (score: number) => (score >= 16 ? "bg-red/25" : score >= 9 ? "bg-wheat/20" : "bg-green/15");

export function RiskMatrix({ stage = false }: { stage?: boolean }) {
  const [sel, setSel] = useState<string>("basis");
  const r = RISKS.find((x) => x.id === sel)!;
  return (
    <div className={cn("grid gap-6", stage ? "grid-cols-[1.1fr_1fr]" : "lg:grid-cols-[1.1fr_1fr]")}>
      <div className="panel p-5">
        <div className="grid grid-cols-[auto_repeat(5,1fr)] gap-1.5" role="grid" aria-label="Risk matrisi: olasılık × etki">
          {[5, 4, 3, 2, 1].map((imp) => (
            <div key={imp} className="contents" role="row">
              <div className="flex items-center pr-2 font-mono text-[0.7rem] text-dim" role="rowheader">
                etki {imp}
              </div>
              {[1, 2, 3, 4, 5].map((prob) => {
                const items = RISKS.filter((x) => x.p === prob && x.i === imp);
                return (
                  <div key={prob} role="gridcell" className={cn("min-h-[74px] rounded-lg p-1.5", cellTone(prob * imp))}>
                    <div className="flex flex-wrap gap-1">
                      {items.map((x) => (
                        <button
                          key={x.id}
                          type="button"
                          onClick={() => setSel(x.id)}
                          className={cn(
                            "rounded-md border px-1.5 py-1 text-left text-[0.72rem] leading-tight transition-colors",
                            sel === x.id ? "border-text bg-bg font-semibold text-text" : "border-transparent bg-bg/60 text-dim hover:text-text",
                            stage && "text-sm",
                          )}
                          aria-pressed={sel === x.id}
                        >
                          {x.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div />
          {[1, 2, 3, 4, 5].map((p) => (
            <div key={p} className="text-center font-mono text-[0.7rem] text-dim">
              olasılık {p}
            </div>
          ))}
        </div>
      </div>
      <div className="panel ticks p-6" aria-live="polite">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="eyebrow">Olasılık {r.p} × etki {r.i} · sahibi: {r.owner}</div>
            <h3 className={cn("mt-2 font-extrabold", stage ? "text-4xl" : "text-2xl")}>{r.name}</h3>
          </div>
          <span className={cn("rounded-lg px-2.5 py-1 font-mono text-sm font-bold", r.p * r.i >= 16 ? "bg-red/20 text-red-fg" : r.p * r.i >= 9 ? "bg-wheat/20 text-wheat-fg" : "bg-green/15 text-green-fg")}>
            {r.p * r.i}
          </span>
        </div>
        <p className={cn("mt-3 text-dim", stage && "text-xl")}>{r.why}</p>
        <div className="mt-5 eyebrow">Önlemler</div>
        <ul className="mt-2 grid gap-2">
          {r.mitigations.map((m) => (
            <li key={m} className={cn("flex gap-2.5", stage ? "text-xl" : "text-sm")}>
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-green-fg" aria-hidden />
              {m}
            </li>
          ))}
        </ul>
        {r.demo && (
          <a href="#demo" className="mt-5 inline-block rounded-full border border-line px-3.5 py-1.5 text-sm text-wheat-fg hover:bg-surface-2">
            Demoda göster: {r.demo} →
          </a>
        )}
      </div>
    </div>
  );
}

export function Risk() {
  return (
    <Section id="risk" index="07" eyebrow="Risk analizi" title="Olasılık × etki — ve her birinin önlemi." lead="Bir riske tıklayın; önlemi ve demoda nerede gösterildiği açılır.">
      <RiskMatrix />
    </Section>
  );
}
