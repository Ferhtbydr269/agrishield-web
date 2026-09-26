/**
 * Senaryo doğrulama: her dünyada tanıkların hangi gün değiştiğini ve ilk otomatik kararı yazdırır.
 *   npx tsx scripts/verify-scenarios.ts [senaryo]
 */
import { PARCELS } from "../src/sim/parcels";
import { runScenario } from "../src/sim/evaluate";
import { SCENARIOS, SCENARIO_KEYS, type ScenarioKey } from "../src/sim/scenarios";

const only = process.argv[2] as ScenarioKey | undefined;

for (const key of SCENARIO_KEYS) {
  if (only && key !== only) continue;
  const meta = SCENARIOS[key];
  console.log(`\n══════ ${key} (odak ${meta.focusParcelId}) — beklenen ${meta.expected.outcome} @ ${meta.expected.date} (${meta.expected.yesCount}/3)`);
  for (const p of PARCELS) {
    const res = runScenario(key, p.id);
    const changes: string[] = [];
    let prev = "";
    for (const d of res.timeline) {
      const s = `${d.sat[0]}${d.station[0]}${d.meteo[0]}`;
      if (s !== prev && d.date >= "2025-11-15") changes.push(`${d.date.slice(5)}:${s}`);
      prev = s;
    }
    const dec = res.decision ? `${res.decision.outcome} @ ${res.decision.date} (${res.decision.yesCount}/3)` : "karar yok";
    const mark = p.id === meta.focusParcelId ? (res.decision?.outcome === meta.expected.outcome && res.decision?.date === meta.expected.date && res.decision?.yesCount === meta.expected.yesCount ? " ✓" : " ✗ BEKLENEN DEĞİL") : "";
    console.log(`  ${p.id}: ${dec}${mark}  erken uyarı: ${res.earlyWarning ?? "-"}`);
    console.log(`    geçişler (uydu/istasyon/meteo): ${changes.slice(-14).join("  ")}`);
  }
}
