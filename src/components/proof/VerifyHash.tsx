"use client";
/**
 * "Bu kaydın doğruluğunu nasıl kontrol ederim?" — mühürlenen metni tarayıcıda SHA-256 ile yeniden hesaplar.
 * Kendi SHA-256 uygulamamızı kullanır (Web Crypto yalnız https/localhost'ta çalışır; sahnede telefon yerel ağdan
 * http ile bağlanabilir). Metni değiştirince mühür bozulur: "tek harf değişirse herkes fark eder".
 */
import { useMemo, useState } from "react";
import { Check, Copy, Pencil, RotateCcw, ShieldAlert, ShieldCheck } from "lucide-react";
import { sha256Hex } from "@/lib/sha256";
import { cn } from "@/components/ui/cn";

export function VerifyHash({ sealed, expected, en = false }: { sealed: string; expected: string; en?: boolean }) {
  const [text, setText] = useState(sealed);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const hash = useMemo(() => `0x${sha256Hex(text)}`, [text]);
  const ok = hash === expected;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="grid gap-4" data-testid="verify-hash">
      <ol className="grid list-decimal gap-2 pl-5 text-sm leading-relaxed text-dim">
        <li>{en ? "Copy the sealed text below exactly." : "Aşağıdaki “mühürlenen metni” birebir kopyalayın."}</li>
        <li>
          {en ? "Compute its SHA-256 with any tool, e.g." : "Herhangi bir SHA-256 aracıyla özetini alın, örneğin terminalde:"}{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.78rem] text-text">printf &apos;%s&apos; &apos;…metin…&apos; | sha256sum</code>
        </li>
        <li>{en ? "The result must equal the evidence hash (without 0x)." : "Sonuç, 0x öneki olmadan kanıt hash'iyle aynı olmalı."}</li>
        <li>{en ? "The same hash is anchored in the chain record." : "Aynı hash zincirdeki kayıtta da durur; kimse sonradan değiştiremez."}</li>
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm hover:bg-surface-2">
          {copied ? <Check className="size-4 text-green-fg" aria-hidden /> : <Copy className="size-4" aria-hidden />} {copied ? "Kopyalandı" : "Metni kopyala"}
        </button>
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm", editing ? "border-wheat text-wheat-fg" : "border-line hover:bg-surface-2")}
          aria-pressed={editing}
        >
          <Pencil className="size-4" aria-hidden /> {en ? "Try tampering" : "Bir rakamı değiştirmeyi dene"}
        </button>
        {text !== sealed && (
          <button type="button" onClick={() => setText(sealed)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm hover:bg-surface-2">
            <RotateCcw className="size-4" aria-hidden /> {en ? "Restore" : "Aslına döndür"}
          </button>
        )}
      </div>
      <label className="sr-only" htmlFor="sealed">
        Mühürlenen metin
      </label>
      <textarea
        id="sealed"
        value={text}
        readOnly={!editing}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        className={cn(
          "h-40 w-full resize-y rounded-lg border bg-bg p-3 font-mono text-[0.7rem] leading-relaxed text-text",
          editing ? "border-wheat" : "border-line",
        )}
      />
      <div
        className={cn("flex items-start gap-3 rounded-xl border p-4", ok ? "border-green/60 bg-green/10" : "border-red/60 bg-red/10")}
        role="status"
        aria-live="polite"
        data-testid="verify-result"
      >
        {ok ? <ShieldCheck className="mt-0.5 size-6 shrink-0 text-green-fg" aria-hidden /> : <ShieldAlert className="mt-0.5 size-6 shrink-0 text-red-fg" aria-hidden />}
        <div className="min-w-0 font-mono text-[0.72rem] leading-relaxed">
          <div className={cn("font-sans text-sm font-bold", ok ? "text-green-fg" : "text-red-fg")}>
            {ok ? (en ? "MATCH — the record is intact." : "EŞLEŞİYOR — kayıt bozulmamış.") : en ? "MISMATCH — the seal is broken." : "EŞLEŞMİYOR — mühür bozuldu. Tek bir karakter bile hash'i tamamen değiştirir."}
          </div>
          <div className="mt-1 break-all text-dim">
            {en ? "computed" : "hesaplanan"}: <span className={ok ? "text-green-fg" : "text-red-fg"}>{hash}</span>
          </div>
          <div className="break-all text-dim">
            {en ? "sealed" : "mühürlü"}: <span className="text-text">{expected}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
