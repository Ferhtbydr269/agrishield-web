import { TEAM } from "@/content/copy";
import { PendingBadge } from "@/components/ui/Badges";
import { Section } from "@/components/ui/Section";

const RING = { soil: "border-soil/50 text-soil-fg", violet: "border-violet/50 text-violet-fg", chain: "border-chain/40 text-chain-fg", wheat: "border-wheat/50 text-wheat-fg" } as const;

export function Team() {
  return (
    <Section id="takim" index="09" eyebrow="Takım" title="AlgoVest" lead="Her konunun tek bir sahibi var; soru-cevapta sorunun sahibi cevaplar.">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TEAM.map((m) => (
          <li key={m.name} className="panel p-6">
            <div className={`grid size-14 place-items-center rounded-full border-2 font-display text-xl font-extrabold ${RING[m.color]}`}>
              {m.name
                .split(" ")
                .map((s) => s[0])
                .join("")}
            </div>
            <h3 className="mt-4 text-xl font-extrabold">{m.name}</h3>
            <div className="text-sm font-semibold text-dim">{m.role}</div>
            <p className="mt-3 text-sm leading-relaxed text-dim">{m.owns}</p>
            <p className="mt-3 border-l-2 border-line-strong pl-3 text-sm italic">"{m.line}"</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-dim">
              bölüm / sınıf: <PendingBadge />
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
