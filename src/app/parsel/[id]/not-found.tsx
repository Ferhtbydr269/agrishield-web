import Link from "next/link";
import { PARCELS } from "@/sim/parcels";

export default function ParcelNotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <div className="eyebrow">Parsel</div>
      <h1 className="mt-2 text-4xl font-extrabold">Bu parsel kayıtlı değil</h1>
      <p className="mt-3 text-dim">Prototipte üç örnek parsel var:</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {PARCELS.map((p) => (
          <Link key={p.id} href={`/parsel/${p.id}`} className="rounded-xl border border-line px-4 py-2 font-mono hover:border-wheat">
            {p.id}
          </Link>
        ))}
      </div>
    </main>
  );
}
