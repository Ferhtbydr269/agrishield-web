export function cn(...xs: (string | false | null | undefined)[]): string {
  return xs.filter(Boolean).join(" ");
}

export const fmtTl = (n: number) => new Intl.NumberFormat("tr-TR").format(Math.round(n));
export const fmtNum = (n: number, d = 1) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
export const fmtPct = (x: number, d = 1) => `%${fmtNum(Math.abs(x) * 100, d)}`;
export const shortHash = (h: string | null | undefined, n = 6) => {
  if (!h) return "—";
  const pre = h.startsWith("mock:") ? "mock:" : "";
  const body = h.replace(/^mock:/, "");
  return `${pre}${body.slice(0, n + 2)}…${body.slice(-4)}`;
};
