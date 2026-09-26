"use client";
import { useId, useRef, useState } from "react";
import { FACTS, factSource, type FactId } from "@/content/facts";
import { cn } from "./cn";

const KIND_LABEL = { resmi: "kaynak", hesap: "hesap", varsayim: "varsayım" } as const;

/** Küçük üst simge; üzerine gelince/odaklanınca/dokununca kaynak + link. Klavyeyle erişilebilir. */
export function SourceTag({ factId, className, n }: { factId: FactId; className?: string; n?: number }) {
  const fact = FACTS[factId];
  const src = factSource(fact);
  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState<"center" | "left" | "right">("center");
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setAlign(r.left < 150 ? "left" : r.right > window.innerWidth - 150 ? "right" : "center");
    setOpen(true);
  };
  return (
    <span ref={ref} className={cn("relative inline-block align-super", className)} onMouseEnter={show} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : show())}
        onFocus={show}
        onBlur={(e) => {
          if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className={cn(
          "ml-0.5 rounded px-1 font-mono text-[0.62rem] leading-4 tracking-wide",
          fact.kind === "varsayim" ? "bg-wheat/15 text-wheat-fg" : fact.kind === "hesap" ? "bg-violet/15 text-violet-fg" : "bg-sky/15 text-sky-fg",
        )}
      >
        {n ?? KIND_LABEL[fact.kind]}
      </button>
      {open && (
        <span role="tooltip" id={id} className={cn("absolute bottom-full z-50 w-72 max-w-[80vw] pb-2", align === "center" ? "left-1/2 -translate-x-1/2" : align === "left" ? "left-0" : "right-0")}>
          <span className="block rounded-lg border border-line bg-surface p-3 text-left font-sans text-[0.78rem] font-normal normal-case leading-snug tracking-normal text-text shadow-xl">
            <span className="eyebrow block !text-[0.62rem]">
              {KIND_LABEL[fact.kind]} · {fact.asOf}
            </span>
            <span className="mt-1 block font-semibold">{src.title}</span>
            <span className="block text-dim">{src.publisher}</span>
            {fact.derivation && <span className="mt-1.5 block text-dim">{fact.derivation}</span>}
            <a href={src.url} target={src.url.startsWith("/") ? undefined : "_blank"} rel="noreferrer" className="mt-1.5 inline-block break-all text-sky-fg underline underline-offset-2">
              {src.url.startsWith("/") ? "Hesap ayrıntısı →" : "Kaynağa git ↗"}
            </a>
          </span>
        </span>
      )}
    </span>
  );
}
