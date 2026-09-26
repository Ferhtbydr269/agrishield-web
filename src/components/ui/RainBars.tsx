"use client";
import { addDays, formatDateTR } from "@/lib/dates";
import { fmtNum } from "./cn";

/** 30 günlük yağış çubukları (bitiş günü dahil). Toplam ve eşik göstergesiyle. */
export function RainBars({
  days,
  endDate,
  threshold = 10,
  height = 90,
  stage = false,
  label = "Son 30 gün yağış",
}: {
  days: { date: string; rainMm: number }[];
  endDate: string;
  threshold?: number;
  height?: number;
  stage?: boolean;
  label?: string;
}) {
  const from = addDays(endDate, -29);
  const map = new Map(days.map((d) => [d.date, d.rainMm]));
  const series = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(from, i);
    return { d, v: map.get(d) ?? 0 };
  });
  const total = series.reduce((s, x) => s + x.v, 0);
  const max = Math.max(8, ...series.map((x) => x.v));
  const dry = total <= threshold;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className={stage ? "text-xl text-dim" : "text-sm text-dim"}>{label}</span>
        <span className={`font-mono font-bold tabular ${stage ? "text-5xl" : "text-xl"} ${dry ? "text-red-fg" : "text-sky-fg"}`}>
          {fmtNum(total, 1)} mm
        </span>
      </div>
      <div className="flex items-end gap-[2px]" style={{ height }} role="img" aria-label={`30 günde toplam ${fmtNum(total, 1)} mm yağış`}>
        {series.map((x) => (
          <div
            key={x.d}
            title={`${formatDateTR(x.d)}: ${fmtNum(x.v, 1)} mm`}
            className="flex-1 rounded-t-sm"
            style={{ height: `${Math.max(2, (x.v / max) * 100)}%`, background: x.v > 0 ? "var(--sky)" : "var(--line)", opacity: x.v > 0 ? 0.9 : 0.6 }}
          />
        ))}
      </div>
      <div className={`mt-1 flex justify-between font-mono ${stage ? "text-sm" : "text-[0.68rem]"} text-dim`}>
        <span>{formatDateTR(from, { year: false, short: true })}</span>
        <span>eşik ≤ {threshold} mm</span>
        <span>{formatDateTR(endDate, { year: false, short: true })}</span>
      </div>
    </div>
  );
}
