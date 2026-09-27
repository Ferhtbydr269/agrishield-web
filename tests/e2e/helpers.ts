import type { APIRequestContext } from "@playwright/test";

/** Senaryoyu yükler ve sahne hızında oynatır (sahnedeki akışın aynısı). */
export async function runScenario(request: APIRequestContext, scenario: string, speed: number) {
  const l = await request.post("/api/sim/load", { data: { scenario } });
  if (!l.ok()) throw new Error(`senaryo yüklenemedi: ${l.status()}`);
  await request.post("/api/sim/settings", { data: { holdPayment: false, breaker: { trip: false } } });
  const p = await request.post("/api/sim/play", { data: { speed } });
  if (!p.ok()) throw new Error(`oynatılamadı: ${p.status()}`);
}

/** Test sonrası sahne başlangıcına dön: Kuraklık senaryosu, duraklatılmış. */
export async function resetStage(request: APIRequestContext) {
  await request.post("/api/sim/play", { data: { speed: 0 } });
  await request.post("/api/sim/load", { data: { scenario: "kuraklik-2025" } });
}
