import type { Metadata } from "next";
import knowledge from "@data/knowledge.json";
import { aiStatus } from "@/server/ai";
import { Assistant, type QaItem } from "@/components/assistant/Assistant";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Asistan",
  description: "AgriShield Asistanı: projeye dair soruları doğrulanmış bilgi tabanından, kaynak göstererek cevaplar.",
};

const GROUPS: { title: string; ids: string[] }[] = [
  { title: "İş modeli ve pazar", ids: ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"] },
  { title: "Donanım ve veri", ids: ["S11", "S12", "S13", "S14", "S15", "S16", "D3"] },
  { title: "Yapay zekâ", ids: ["S17", "S18", "S19", "S20", "S21", "D6"] },
  { title: "Blokzincir ve ödeme", ids: ["S22", "S23", "S24", "S25", "S26", "S27", "D4"] },
  { title: "Mevzuat ve takım", ids: ["S28", "S29", "S30", "S31", "S32"] },
  { title: "Bu demo", ids: ["D1", "D2", "D5"] },
];

export default async function AsistanPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const byId = new Map(knowledge.qa.map((q) => [q.id, q.q]));
  const groups = GROUPS.map((g) => ({
    title: g.title,
    items: g.ids.filter((id) => byId.has(id)).map((id): QaItem => ({ id, q: byId.get(id)! })),
  }));
  const st = aiStatus();
  const initialQ = typeof sp.q === "string" ? sp.q.slice(0, 600) : undefined;
  return <Assistant groups={groups} mode={st.mode} model={st.model} counts={st.counts} initialQ={initialQ} />;
}
