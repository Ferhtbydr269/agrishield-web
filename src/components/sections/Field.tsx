"use client";
import dynamic from "next/dynamic";
import { Section } from "@/components/ui/Section";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const FieldSimulator = dynamic(() => import("@/scene3d/FieldSimulator").then((m) => m.FieldSimulator), {
  ssr: false,
  loading: () => <div className="grid h-[640px] place-items-center rounded-2xl border border-line bg-surface font-mono text-sm text-dim">3D saha yükleniyor…</div>,
});

export function Field() {
  return (
    <Section
      id="saha"
      index="04"
      eyebrow="3D saha simülatörü"
      title="Kurduğumuz istasyonun dijital ikizi."
      lead="Tarla, istasyon, uydu, gateway, veri akışı ve karar tek sahnede. Sahne zaman makinesine bağlı: NDVI düştükçe buğday sararır, rüzgâr gerçek veriyle eser, nem düştükçe toprak çatlar. Parçalara tıklayın."
    >
      <ErrorBoundary label="3D saha">
        <FieldSimulator />
      </ErrorBoundary>
    </Section>
  );
}
