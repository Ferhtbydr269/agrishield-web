import { describe, expect, it } from "vitest";
import backtest from "@data/backtest.json";
import climate from "@data/climate-siverek.json";
import { FACTS } from "@/content/facts";
import { rain30Normal, spi30 } from "@/engine/climate";
import { price } from "@/engine/pricing";
import { gammaP, normInv } from "@/engine/stats";
import { askLocal, normalizeTr } from "@/server/ai";

describe("Fiyatlama (8.6) — rehberdeki örnekle birebir", () => {
  it("₺100.000 · %50 · %10 · %25 pay · %70 destek → brüt ₺6.250, çiftçi ₺1.875", () => {
    const p = price({ sumInsuredTl: 100_000, payoutRate: 0.5, triggerProbability: 0.1, loadRate: 0.25, subsidyRate: 0.7 });
    expect(p.expectedLossTl).toBe(5000);
    expect(p.grossPremiumTl).toBe(6250);
    expect(p.farmerPaysTl).toBe(1875);
  });
});

describe("İstatistik ve SPI", () => {
  it("normInv ve gammaP bilinen değerler", () => {
    expect(normInv(0.975)).toBeCloseTo(1.96, 2);
    expect(normInv(0.5)).toBeCloseTo(0, 6);
    expect(gammaP(1, 1)).toBeCloseTo(1 - Math.exp(-1), 6);
  });
  it("normal kadar yağış SPI ≈ 0 civarı, çok az yağış ≤ −1,5", () => {
    const d = "2026-04-28";
    expect(Math.abs(spi30(rain30Normal(d), d))).toBeLessThan(0.6);
    expect(spi30(3, d)).toBeLessThanOrEqual(-1.5);
  });
});

describe("Gerçek veri rakamları facts.ts ile tutarlı", () => {
  it("ERA5 sezon toplamları", () => {
    expect(FACTS.era5Sezon2025Yagis.value).toBe(climate.summary.season2025Mm);
    expect(FACTS.era5SezonNormal.value).toBe(climate.summary.seasonNormalMm);
    expect(FACTS.era5Sezon2025Acik.value).toBe(climate.summary.deficitPct);
    expect(FACTS.era5KurakSira.value).toBe(climate.summary.driestRank);
  });
  it("backtest", () => {
    expect(FACTS.backtestTetikSezon.value).toBe(backtest.summary.triggered);
    expect(FACTS.backtestTetikOlasiligi.value).toBe(Math.round(backtest.summary.probability * 100));
  });
});

describe("Asistan (yerel mod)", () => {
  it("Türkçe normalizasyon", () => {
    expect(normalizeTr("Neden BLOKZİNCİR? Işık, çiğ, ğ")).toBe("neden blokzincir isik cig g");
  });
  it.each([
    ["Neden blokzincir?", "S22"],
    ["Basis risk nedir?", "S7"],
    ["TARSİM'in yaptığından farkı ne?", "S1"],
    ["Prim ne kadar?", "S6"],
    ["Sensörü sularsam?", "S11"],
    ["Kripto ile mi ödeme yapıyorsunuz?", "S23"],
    ["KVKK kişisel veriler zincirde mi", "S27"],
  ])("'%s' → %s", (q, id) => {
    const r = askLocal(q);
    expect(r.matchedId).toBe(id);
    expect(r.sources.length).toBeGreaterThan(0);
  });
  it("bilinmeyen soru → doğrulanmış bilgi yok cevabı", () => {
    const r = askLocal("Mars'ta buğday yetişir mi kuantum?");
    expect(r.answer).toMatch(/doğrulanmış bilgimiz yok/);
  });
});
