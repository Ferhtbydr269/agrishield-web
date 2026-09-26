import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getParcelDetail } from "@/server/parcel-detail";
import { runScenario } from "@/sim/evaluate";
import { isScenarioKey } from "@/sim/scenarios";
import { ParcelView } from "@/components/parcel/ParcelView";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Parsel ${id.toUpperCase()}`, description: `AgriShield parsel ${id.toUpperCase()}: NDVI grafiği, tanık geçmişi, poliçe kartı ve karar günlüğü (örnek veri).` };
}

export default async function ParselPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ senaryo?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const detail = await getParcelDetail(id.toUpperCase(), isScenarioKey(sp.senaryo) ? sp.senaryo : undefined);
  if (!detail) notFound();
  // Motorun başsız sonucu: bu senaryoda bu parsel için ilk otomatik karar (zaman makinesiyle aynı kurallar)
  const run = runScenario(detail.scenario.key, detail.parcel.id);
  const engine = run.decision ? { outcome: run.decision.outcome, date: run.decision.date, yesCount: run.decision.yesCount, amountTl: run.decision.amountTl, basis: run.decision.basis } : null;
  return <ParcelView d={detail} engine={engine} earlyWarning={run.earlyWarning} />;
}
