/**
 * Karar motoru birim testleri — AGRISHIELD_PROMPT.md 8.7 (zorunlu 6 senaryo) + ek kontroller.
 */
import { describe, expect, it } from "vitest";
import { detectMoistureSpike } from "@/engine/anomaly";
import { checkSafeguards, evaluateMeteo, evaluateSatellite, evaluateStation, outcomeFor, vote } from "@/engine/decision";
import { buildEvidence, hashEvidence, sealedText } from "@/engine/evidence";
import { effectiveNdviThreshold, getWindow } from "@/engine/phenology";
import { riskScore } from "@/engine/model";
import { DEFAULT_THRESHOLDS as T } from "@/engine/thresholds";
import type { MeteoWitness, NormalPoint, SatelliteObs, SatelliteWitness, StationDay, StationWitness, Witnesses } from "@/engine/types";
import { dayRange } from "@/lib/dates";
import { sha256Hex } from "@/lib/sha256";

const normals = (date: string, p50: number): NormalPoint[] => [{ date, p10: p50 - 0.08, p50, p90: p50 + 0.08 }];
const stationDays = (end: string, rainTotal: number, soil: number): StationDay[] =>
  dayRange("2026-03-01", end).map((d, i, arr) => ({ date: d, rainMm: i === arr.length - 5 ? rainTotal : 0, soilMoisture: soil }));

const W = (sat: "EVET" | "HAYIR" | "VERI_YOK", st: "EVET" | "HAYIR" | "VERI_YOK", me: "EVET" | "HAYIR" | "VERI_YOK"): Witnesses => ({
  satellite: { verdict: sat } as SatelliteWitness,
  station: { verdict: st } as StationWitness,
  meteo: { verdict: me } as MeteoWitness,
});

describe("1 · Hasat penceresi: NDVI çökse bile uydu tanığı HAYIR", () => {
  it("kıraç buğday, 10 Haziran, NDVI normalin %70 altında → HAYIR", () => {
    const obs: SatelliteObs[] = [{ date: "2026-06-10", ndvi: 0.08, ndmi: 0, cloud: 0.02 }];
    const w = evaluateSatellite({ crop: "bugday", date: "2026-06-10", obs, normals: normals("2026-06-10", 0.27), thresholds: T });
    expect(getWindow("bugday", "2026-06-10").key).toBe("olgunlasma");
    expect(w.verdict).toBe("HAYIR");
    expect(w.reason).toMatch(/Hasat/);
  });
  it("aynı düşüş başaklanma döneminde (28 Nisan) → EVET", () => {
    const obs: SatelliteObs[] = [{ date: "2026-04-28", ndvi: 0.38, ndmi: 0.1, cloud: 0.05 }];
    const w = evaluateSatellite({ crop: "bugday", date: "2026-04-28", obs, normals: normals("2026-04-28", 0.59), thresholds: T });
    expect(w.verdict).toBe("EVET");
    expect(w.anomaly).toBeCloseTo(-0.356, 3);
  });
  it("efektif eşik = −0,25 / ağırlık", () => {
    expect(effectiveNdviThreshold(-0.25, 1)).toBeCloseTo(-0.25);
    expect(effectiveNdviThreshold(-0.25, 0.4)).toBeCloseTo(-0.625);
  });
});

describe("2 · Toprak tipi: %15 nem killi toprakta EVET, kumlu toprakta HAYIR", () => {
  const days = stationDays("2026-04-28", 6, 15);
  it("killi (solma noktası %18) → EVET", () => {
    const w = evaluateStation({ date: "2026-04-28", stationId: "IST", days, soilType: "killi", thresholds: T, flags: [], source: "senaryo" });
    expect(w.verdict).toBe("EVET");
  });
  it("kumlu (solma noktası %9) → HAYIR", () => {
    const w = evaluateStation({ date: "2026-04-28", stationId: "IST", days, soilType: "kumlu", thresholds: T, flags: [], source: "senaryo" });
    expect(w.verdict).toBe("HAYIR");
  });
});

describe("3 · Anti-manipülasyon: yağışsız ani nem artışı istasyonu VERİ YOK yapar, 3/3 → 2/3", () => {
  it("1 saatte +15 puan, yağış yok → şüpheli bayrak", () => {
    const t0 = Date.parse("2026-04-16T10:00:00+03:00");
    const flag = detectMoistureSpike([
      { ts: t0, soilMoisture: 15.8, rainMm: 0 },
      { ts: t0 + 20 * 60_000, soilMoisture: 22.4, rainMm: 0 },
      { ts: t0 + 40 * 60_000, soilMoisture: 31.0, rainMm: 0 },
    ]);
    expect(flag?.code).toBe("supheli_nem_artisi");
  });
  it("yağış varsa aynı artış şüpheli değildir", () => {
    const t0 = Date.parse("2026-04-16T10:00:00+03:00");
    const flag = detectMoistureSpike([
      { ts: t0, soilMoisture: 15.8, rainMm: 0 },
      { ts: t0 + 40 * 60_000, soilMoisture: 31.0, rainMm: 12 },
    ]);
    expect(flag).toBeNull();
  });
  it("bayraklı istasyon VERİ YOK; kuraklıkta oylama 3 → 2 ama sonuç yine ÖDE", () => {
    const days = stationDays("2026-04-28", 6, 12.4);
    const flag = detectMoistureSpike([
      { ts: 0, soilMoisture: 12, rainMm: 0 },
      { ts: 30 * 60_000, soilMoisture: 30, rainMm: 0 },
    ])!;
    const clean = evaluateStation({ date: "2026-04-28", stationId: "IST", days, soilType: "killi", thresholds: T, flags: [], source: "senaryo" });
    const flagged = evaluateStation({ date: "2026-04-28", stationId: "IST", days, soilType: "killi", thresholds: T, flags: [flag], source: "senaryo" });
    expect(clean.verdict).toBe("EVET");
    expect(flagged.verdict).toBe("VERI_YOK");
    const policy = { sumInsuredTl: 100_000, payoutRate: 0.5 };
    expect(vote(W("EVET", clean.verdict, "EVET"), policy).yesCount).toBe(3);
    const v = vote(W("EVET", flagged.verdict, "EVET"), policy);
    expect(v.yesCount).toBe(2);
    expect(v.outcome).toBe("ODE");
    expect(v.amountTl).toBe(50_000);
  });
});

describe("4 · Oylama: 1 EVET → GRİ BÖLGE; 0 EVET → ÖDEME YOK", () => {
  it("eşleme", () => {
    expect(outcomeFor(3)).toBe("ODE");
    expect(outcomeFor(2)).toBe("ODE");
    expect(outcomeFor(1)).toBe("GRI_BOLGE");
    expect(outcomeFor(0)).toBe("ODEME_YOK");
  });
  it("VERİ YOK oy sayılmaz", () => {
    expect(vote(W("VERI_YOK", "EVET", "VERI_YOK"), { sumInsuredTl: 1, payoutRate: 1 }).outcome).toBe("GRI_BOLGE");
    expect(vote(W("HAYIR", "VERI_YOK", "HAYIR"), { sumInsuredTl: 1, payoutRate: 1 }).outcome).toBe("ODEME_YOK");
  });
});

describe("5 · Aynı sezonda ikinci tetik reddedilir (+ karantina, devre kesici)", () => {
  const base = { parcelId: "P-1182", policyId: "pol-1", village: "K", context: "run-1", thresholds: T, villageDailyCap: 25, paused: false, windowTriggerEnabled: true };
  const first = { parcelId: "P-1182", policyId: "pol-1", village: "K", outcome: "ODE" as const, date: "2026-04-28", context: "run-1" };
  it("ilk tetik geçer", () => {
    expect(checkSafeguards({ ...base, outcome: "ODE", date: "2026-04-28", history: [] }).ok).toBe(true);
  });
  it("aynı poliçe, aynı sezon, ikinci ÖDE → SEZON_TAVANI", () => {
    const r = checkSafeguards({ ...base, outcome: "ODE", date: "2026-05-20", history: [first] });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("SEZON_TAVANI");
  });
  it("7 gün içinde ikinci karar → KARANTINA", () => {
    const r = checkSafeguards({ ...base, outcome: "GRI_BOLGE", date: "2026-05-02", history: [first] });
    expect(r.code).toBe("KARANTINA");
  });
  it("köyde günlük tavan dolunca → DEVRE_KESICI; manuel duraklatma → DURAKLATILDI", () => {
    const others = Array.from({ length: 2 }, (_, i) => ({ ...first, parcelId: `P-${i}`, policyId: `p${i}` }));
    expect(checkSafeguards({ ...base, parcelId: "P-9", policyId: "p9", outcome: "ODE", date: "2026-04-28", history: others, villageDailyCap: 2 }).code).toBe("DEVRE_KESICI");
    expect(checkSafeguards({ ...base, outcome: "ODE", date: "2026-04-28", history: [], paused: true }).code).toBe("DURAKLATILDI");
  });
  it("başka dünyadaki (seed/önceki koşu) karar bu koşuyu etkilemez", () => {
    expect(checkSafeguards({ ...base, outcome: "ODE", date: "2026-05-20", history: [{ ...first, context: "seed" }] }).ok).toBe(true);
  });
});

describe("6 · evidenceHash deterministik; tek alan değişince hash değişir", () => {
  const sat = evaluateSatellite({ crop: "bugday", date: "2026-04-28", obs: [{ date: "2026-04-28", ndvi: 0.38, ndmi: 0.1, cloud: 0.05 }], normals: normals("2026-04-28", 0.59), thresholds: T });
  const days = stationDays("2026-04-28", 6, 12.4);
  const st = evaluateStation({ date: "2026-04-28", stationId: "IST-SVK-01", days, soilType: "killi", thresholds: T, flags: [], source: "senaryo" });
  const me = evaluateMeteo({ date: "2026-04-28", days: days.map((d) => ({ date: d.date, rainMm: d.rainMm })), thresholds: T, spiFn: () => -1.82, normalFn: () => 74.5 });
  const witnesses = { satellite: sat, station: st, meteo: me };
  const input = {
    decisionCode: "7F3A",
    parcelId: "P-1182",
    season: "2025-2026",
    ts: "2026-04-28T06:12:03.000Z",
    witnesses,
    thresholds: T,
    model: riskScore({ rainRatio: 0.08, ndviAnomaly: -0.356, soilMoisture: 12.4, soilThreshold: 18, spi30: -1.82, phenologyWeight: 1 }),
    vote: vote(witnesses, { sumInsuredTl: 100_000, payoutRate: 0.5 }),
    basis: "anlik_oylama" as const,
    scenario: "kuraklik-2025",
    dataNote: "test",
  };
  it("aynı kanıt → aynı hash", () => {
    expect(hashEvidence(buildEvidence(input))).toBe(hashEvidence(buildEvidence(input)));
  });
  it("zincir ve ödeme alanları hash'e girmez", () => {
    const e = buildEvidence(input);
    const h = hashEvidence(e);
    expect(hashEvidence({ ...e, chain: { mode: "mock", txHash: "mock:0x1", blockNumber: 9 }, payment: { refHash: "0x2", channel: "FAST", simulated: true } })).toBe(h);
  });
  it("tek bir alan (NDVI) değişince hash değişir", () => {
    const e = buildEvidence(input);
    const tampered = JSON.parse(JSON.stringify(e));
    tampered.witnesses.satellite.ndvi = 0.39;
    expect(hashEvidence(tampered)).not.toBe(hashEvidence(e));
  });
  it("hash = sha256(JSON.stringify(kanıt − zincir − ödeme)) — kanıt sayfasındaki tarifle birebir", () => {
    const e = buildEvidence(input);
    expect(hashEvidence(e)).toBe(`0x${sha256Hex(sealedText(e))}`);
  });
});

describe("SHA-256 uygulaması standart test vektörleriyle uyumlu", () => {
  it("'abc' ve boş metin", () => {
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
  it("Türkçe karakterler (UTF-8)", () => {
    expect(sha256Hex("kuraklık")).toHaveLength(64);
  });
});

describe("Sulu parsel: istasyon tanığı kullanılmaz", () => {
  it("VERİ YOK döner", () => {
    const w = evaluateStation({ date: "2026-04-28", stationId: "IST", days: stationDays("2026-04-28", 6, 12), soilType: "tinli", thresholds: T, flags: [], source: "senaryo", irrigated: true });
    expect(w.verdict).toBe("VERI_YOK");
  });
});
