import { FACTS, formatFactValue, type FactId } from "@/content/facts";
import { PendingBadge } from "./Badges";
import { SourceTag } from "./SourceTag";
import { cn } from "./cn";

/**
 * Dev rakam + etiket + kaynak rozeti. Rakam YALNIZCA facts.ts'den gelir; null ise
 * "veri bekleniyor" rozeti gösterilir, rakam uydurulmaz.
 */
export function Stat({
  factId,
  size = "lg",
  className,
  label,
  tone = "text",
}: {
  factId: FactId;
  size?: "md" | "lg" | "xl" | "stage";
  className?: string;
  label?: string;
  tone?: "text" | "green" | "wheat" | "red" | "sky" | "violet" | "soil" | "chain";
}) {
  const fact = FACTS[factId];
  const v = formatFactValue(fact);
  const sizes = {
    md: "text-3xl",
    lg: "text-[2.6rem] sm:text-5xl",
    xl: "text-6xl sm:text-7xl",
    stage: "text-[96px] xl:text-[128px]",
  } as const;
  const tones = {
    text: "text-text",
    green: "text-green-fg",
    wheat: "text-wheat-fg",
    red: "text-red-fg",
    sky: "text-sky-fg",
    violet: "text-violet-fg",
    soil: "text-soil-fg",
    chain: "text-chain-fg",
  } as const;
  return (
    <figure className={cn("min-w-0", className)}>
      <div className={cn("flex flex-wrap items-baseline font-display font-extrabold leading-none tracking-tight tabular", sizes[size], tones[tone])}>
        {v === null ? (
          <PendingBadge />
        ) : (
          <span className="whitespace-nowrap">
            {v}
            {fact.unit && <span className={cn("text-[0.42em] font-bold tracking-normal text-dim", !fact.unit.startsWith("'") && "ml-1.5")}>{fact.unit}</span>}
          </span>
        )}
        <SourceTag factId={factId} className="ml-1 text-base" />
      </div>
      <figcaption className="mt-2 text-sm leading-snug text-dim">
        {label ?? fact.label}
        {fact.kind === "varsayim" && <span className="ml-1 font-mono text-[0.68rem] uppercase text-wheat-fg">· varsayım</span>}
      </figcaption>
    </figure>
  );
}
