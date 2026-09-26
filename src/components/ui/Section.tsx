import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "./cn";

/** Ana akış bölüm kabuğu: numara + etiket + başlık + sağ üstte "detaya git". */
export function Section({
  id,
  index,
  eyebrow,
  title,
  lead,
  detailHref,
  detailLabel = "Detaya git",
  children,
  className,
}: {
  id: string;
  index: string;
  eyebrow: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  detailHref?: string;
  detailLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("snap-section relative border-t border-line py-20 sm:py-24", className)}>
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <div className="eyebrow flex items-center gap-3">
              <span className="text-wheat-fg">{index}</span>
              <span className="h-px w-8 bg-line-strong" aria-hidden />
              {eyebrow}
            </div>
            <h2 id={`${id}-title`} className="mt-4 text-[2.3rem] font-extrabold sm:text-5xl">
              {title}
            </h2>
            {lead && <div className="mt-5 text-lg leading-relaxed text-dim">{lead}</div>}
          </div>
          {detailHref && (
            <Link href={detailHref} className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm text-dim transition-colors hover:border-line-strong hover:text-text">
              {detailLabel} <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
