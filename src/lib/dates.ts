/** Gün hassasiyetinde tarih yardımcıları (UTC, saat dilimi kayması yok). ISO "YYYY-MM-DD". */

const DAY = 86_400_000;

export function toUtcMs(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  return fromUtcMs(toUtcMs(iso) + n * DAY);
}

export function diffDays(a: string, b: string): number {
  return Math.round((toUtcMs(a) - toUtcMs(b)) / DAY);
}

export function dayRange(start: string, end: string): string[] {
  const out: string[] = [];
  for (let t = toUtcMs(start), e = toUtcMs(end); t <= e; t += DAY) out.push(fromUtcMs(t));
  return out;
}

export const TR_MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];
export const TR_MONTHS_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
export const EN_MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDateTR(iso: string, opts: { year?: boolean; short?: boolean } = {}): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const month = (opts.short ? TR_MONTHS_SHORT : TR_MONTHS)[m - 1];
  return opts.year === false ? `${d} ${month}` : `${d} ${month} ${y}`;
}

export function monthDay(iso: string): string {
  return iso.slice(5, 10);
}

/** "MM-DD" aralığı kontrolü; aralık yıl sonunu aşabilir (ör. 11-15 → 02-15). */
export function inMonthDayRange(iso: string, start: string, end: string): boolean {
  const md = monthDay(iso);
  if (start <= end) return md >= start && md <= end;
  return md >= start || md <= end;
}

export function formatDateTimeTR(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getDate()} ${TR_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
