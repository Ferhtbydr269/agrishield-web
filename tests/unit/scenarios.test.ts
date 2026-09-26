/** Senaryo dünyaları beklenen karar gününde beklenen sonucu üretmeli (sahne güvencesi). */
import { describe, expect, it } from "vitest";
import { runScenario } from "@/sim/evaluate";
import { SCENARIOS, SCENARIO_KEYS } from "@/sim/scenarios";

describe("Senaryolar (zaman makinesi dünyaları)", () => {
  for (const key of SCENARIO_KEYS) {
    const meta = SCENARIOS[key];
    it(`${key}: ${meta.expected.outcome} @ ${meta.expected.date} (${meta.expected.yesCount}/3)`, () => {
      const r = runScenario(key);
      expect(r.decision).not.toBeNull();
      expect(r.decision!.outcome).toBe(meta.expected.outcome);
      expect(r.decision!.date).toBe(meta.expected.date);
      expect(r.decision!.yesCount).toBe(meta.expected.yesCount);
    });
  }
  it("kuraklık: 28 Nisan kararında 30 günlük yağış 6,0 mm, NDVI normalin %35,6 altında", () => {
    const r = runScenario("kuraklik-2025");
    const w = r.decision!.evaluation.witnesses;
    expect(w.station.rain30mm).toBeCloseTo(6.0, 1);
    expect(w.satellite.anomaly).toBeCloseTo(-0.356, 3);
    expect(w.meteo.verdict).toBe("EVET");
    expect(r.earlyWarning).not.toBeNull();
    expect(r.earlyWarning! < "2026-04-28").toBe(true);
  });
  it("manipülasyon: istasyon şüpheli bayrakla VERİ YOK", () => {
    const r = runScenario("manipulasyon");
    expect(r.decision!.evaluation.witnesses.station.verdict).toBe("VERI_YOK");
    expect(r.decision!.evaluation.witnesses.station.flags[0]?.code).toBe("supheli_nem_artisi");
  });
});
