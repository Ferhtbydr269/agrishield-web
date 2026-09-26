/** İstemci tarafı API yardımcısı: hata biçimi { error: { code, message } } */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function postJson<T = unknown>(url: string, body: unknown = {}): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = (j as { error?: { code: string; message: string } }).error;
    throw new ApiError(e?.code ?? "HATA", e?.message ?? `HTTP ${r.status}`, r.status);
  }
  return j as T;
}

export async function getJson<T = unknown>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = (j as { error?: { code: string; message: string } }).error;
    throw new ApiError(e?.code ?? "HATA", e?.message ?? `HTTP ${r.status}`, r.status);
  }
  return j as T;
}

export const sim = {
  load: (scenario: string) => postJson("/api/sim/load", { scenario }),
  play: (speed: number) => postJson("/api/sim/play", { speed }),
  seek: (date: string) => postJson("/api/sim/seek", { date }),
  reset: () => postJson("/api/sim/reset", {}),
  settings: (s: Record<string, unknown>) => postJson("/api/sim/settings", s),
};
