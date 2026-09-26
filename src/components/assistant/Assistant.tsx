"use client";
/**
 * AgriShield Asistanı arayüzü (Bölüm 11.3): cevap + "Kaynak" rozetleri + mod rozeti, hazır soru çipleri.
 * Kullanıcı metni yalnızca düz metin olarak basılır (React kaçışlar); asla dangerouslySetInnerHTML yok.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpenCheck, ChevronDown, CornerDownLeft, ExternalLink, Info, Loader2, MessageCircleQuestion, Sparkles, Trash2 } from "lucide-react";
import type { AskResult } from "@/server/ai";
import { postJson } from "@/lib/api";
import { Pill } from "@/components/ui/Badges";
import { cn } from "@/components/ui/cn";

export interface QaItem {
  id: string;
  q: string;
}

interface Turn {
  id: number;
  q: string;
  r: AskResult | null;
  error?: string;
}

const CHIPS = ["Neden blokzincir?", "Basis risk nedir?", "TARSİM'in yaptığından farkı ne?", "Prim ne kadar?", "Sensörü sularsam?"];

const CONF: Record<AskResult["confidence"], { label: string; tone: "green" | "wheat" | "dim" }> = {
  yuksek: { label: "güçlü eşleşme", tone: "green" },
  orta: { label: "orta eşleşme", tone: "wheat" },
  dusuk: { label: "zayıf eşleşme", tone: "dim" },
};

function SourceLink({ s }: { s: { title: string; url: string } }) {
  const external = /^https?:\/\//.test(s.url);
  const cls =
    "inline-flex max-w-full items-center gap-1.5 rounded-full border border-chain/35 bg-chain/10 px-2.5 py-1 text-xs text-chain-fg hover:bg-chain/20";
  return external ? (
    <a href={s.url} target="_blank" rel="noopener noreferrer" className={cls}>
      <BookOpenCheck className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{s.title}</span>
      <ExternalLink className="size-3 shrink-0 opacity-70" aria-hidden />
    </a>
  ) : (
    <Link href={s.url} className={cls}>
      <BookOpenCheck className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{s.title}</span>
    </Link>
  );
}

function AnswerCard({ t, onAsk }: { t: Turn; onAsk: (q: string) => void }) {
  const r = t.r;
  return (
    <motion.li initial={{ y: 8 }} animate={{ y: 0 }} className="grid gap-3">
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md border border-line bg-surface-2 px-4 py-2.5 [overflow-wrap:anywhere]">{t.q}</div>
      <div className="panel max-w-[95%] p-5" data-testid="assistant-answer">
        {!r && !t.error && (
          <div className="flex items-center gap-2 text-dim">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Bilgi tabanında aranıyor…
          </div>
        )}
        {t.error && <div className="text-red-fg">Cevap alınamadı: {t.error}</div>}
        {r && (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Pill tone={r.mode === "api" ? "violet" : "sky"}>
                <Sparkles className="size-3" aria-hidden /> {r.mode === "api" ? "Claude API · bilgi tabanıyla sınırlı" : "yerel bilgi tabanı"}
              </Pill>
              <Pill tone={CONF[r.confidence].tone}>{CONF[r.confidence].label}</Pill>
              {r.matchedId && <span className="font-mono text-xs text-dim">kayıt {r.matchedId}</span>}
            </div>
            <p className="whitespace-pre-line text-lg leading-relaxed">{r.answer}</p>
            {r.note && (
              <p className="mt-3 flex items-start gap-2 text-sm text-dim">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> {r.note}
              </p>
            )}
            {r.sources.length > 0 ? (
              <div className="mt-4" data-testid="assistant-sources">
                <div className="eyebrow">Kaynak</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.sources.map((s) => (
                    <SourceLink key={s.url + s.title} s={s} />
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-dim">Kaynağı olmayan bilgi yayınlanmaz; bu yüzden cevap vermiyoruz.</p>
            )}
            {r.related.length > 0 && (
              <div className="mt-4">
                <div className="eyebrow">İlgili sorular</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.related.map((x) => (
                    <button key={x.id} type="button" onClick={() => onAsk(x.q)} className="rounded-full border border-line px-3 py-1 text-left text-sm text-dim hover:border-wheat hover:text-text">
                      {x.q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.li>
  );
}

export function Assistant({
  groups,
  mode,
  model,
  counts,
  initialQ,
}: {
  groups: { title: string; items: QaItem[] }[];
  mode: "local" | "api";
  model: string | null;
  counts: { qa: number; facts: number; glossary: number; rules: number };
  initialQ?: string;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const seq = useRef(0);
  const busy = turns.some((t) => !t.r && !t.error);
  const endRef = useRef<HTMLDivElement>(null);
  const asked = useRef(false);

  const ask = async (question: string) => {
    const text = question.trim().slice(0, 600);
    if (text.length < 2 || busy) return;
    const id = ++seq.current;
    setTurns((ts) => [...ts.slice(-19), { id, q: text, r: null }]);
    setQ("");
    try {
      const r = await postJson<AskResult>("/api/ask", { q: text });
      setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, r } : t)));
    } catch (e) {
      setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, error: e instanceof Error ? e.message : "hata" } : t)));
    }
  };

  useEffect(() => {
    if (initialQ && !asked.current) {
      asked.current = true;
      void ask(initialQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ]);

  useEffect(() => {
    if (turns.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        <div className="eyebrow">AgriShield Asistanı</div>
        <h1 className="mt-1 text-4xl font-extrabold sm:text-5xl">Sorun, kaynağıyla cevaplayalım.</h1>
        <p className="mt-3 max-w-2xl text-dim">
          Yalnızca doğrulanmış bilgi tabanından cevap verir: {counts.qa} jüri sorusu, {counts.facts} kaynaklı rakam, {counts.glossary} kavram ve {counts.rules} karar
          kuralı. Bilmediği soruda uydurmaz. Sahnede takımın yerine konuşmaz; stantta ve QR üzerinden çalışır.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill tone={mode === "api" ? "violet" : "sky"}>{mode === "api" ? `mod: Claude API (${model})` : "mod: yerel bilgi tabanı · internetsiz"}</Pill>
        </div>

        <div className="mt-6 flex flex-wrap gap-2" aria-label="Hazır sorular">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => void ask(c)}
              disabled={busy}
              className="rounded-full border border-wheat/50 bg-wheat/10 px-3.5 py-1.5 text-sm font-semibold text-wheat-fg hover:bg-wheat/20 disabled:opacity-50"
            >
              {c}
            </button>
          ))}
        </div>

        <ol className="mt-8 grid gap-6" aria-live="polite">
          <AnimatePresence initial={false}>
            {turns.map((t) => (
              <AnswerCard key={t.id} t={t} onAsk={(x) => void ask(x)} />
            ))}
          </AnimatePresence>
        </ol>
        {!turns.length && (
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-dashed border-line p-6 text-dim">
            <MessageCircleQuestion className="size-6 shrink-0" aria-hidden /> Bir çipe dokunun ya da sorunuzu yazın. Ör. “Hasadı kuraklık sanmaz mı?”
          </div>
        )}
        <div ref={endRef} />

        <form
          className="sticky bottom-3 z-10 mt-6 flex gap-2 rounded-2xl border border-line bg-surface/95 p-2 shadow-xl backdrop-blur"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(q);
          }}
        >
          <label htmlFor="ask-input" className="sr-only">
            Sorunuz
          </label>
          <input
            id="ask-input"
            data-testid="assistant-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={600}
            placeholder="Sorunuzu yazın…"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-base outline-none placeholder:text-dim"
          />
          <button
            type="submit"
            disabled={busy || q.trim().length < 2}
            className="inline-flex items-center gap-2 rounded-xl bg-wheat px-4 py-2 font-semibold text-bg disabled:opacity-40"
          >
            Sor <CornerDownLeft className="size-4" aria-hidden />
          </button>
          {turns.length > 0 && (
            <button type="button" onClick={() => setTurns([])} className="rounded-xl border border-line px-3 text-dim hover:text-text" title="Konuşmayı temizle">
              <Trash2 className="size-4" aria-hidden />
              <span className="sr-only">Konuşmayı temizle</span>
            </button>
          )}
        </form>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
        <div className="panel p-4">
          <div className="eyebrow">Jürinin sık sorduğu sorular</div>
          <ul className="mt-2 grid gap-1">
            {groups.map((g) => (
              <li key={g.title}>
                <button
                  type="button"
                  onClick={() => setOpen(open === g.title ? null : g.title)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-semibold hover:bg-surface-2"
                  aria-expanded={open === g.title}
                >
                  {g.title} <span className="ml-auto mr-2 font-mono text-xs text-dim">{g.items.length}</span>
                  <ChevronDown className={cn("size-4 transition-transform", open === g.title && "rotate-180")} aria-hidden />
                </button>
                {open === g.title && (
                  <ul className="mb-2 grid gap-0.5 pl-2">
                    {g.items.map((it) => (
                      <li key={it.id}>
                        <button type="button" onClick={() => void ask(it.q)} disabled={busy} className="w-full rounded-md px-2 py-1.5 text-left text-sm text-dim hover:bg-surface-2 hover:text-text">
                          {it.q}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-3 px-1 text-xs text-dim">Sorular kişisel veri içermemeli. Sunucu loglarına yalnız ilk 120 karakter yazılır.</p>
      </aside>
    </main>
  );
}
