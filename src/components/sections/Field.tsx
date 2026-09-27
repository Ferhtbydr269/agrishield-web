"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Section } from "@/components/ui/Section";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const Placeholder = () => <div className="grid h-[640px] place-items-center rounded-2xl border border-line bg-surface font-mono text-sm text-dim">3D saha yükleniyor…</div>;

const FieldSimulator = dynamic(() => import("@/scene3d/FieldSimulator").then((m) => m.FieldSimulator), {
  ssr: false,
  loading: Placeholder,
});

/**
 * 3D paket (three.js, ~300 KB) sayfa açılışında değil, bölüm ekrana yaklaşınca yüklenir: ilk boyama ve
 * mobil performans için. #saha bağlantısıyla gelinirse hemen yüklenir.
 */
export function Field() {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (window.location.hash === "#saha") {
      setNear(true);
      return;
    }
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setNear(true), { rootMargin: "1200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (near) return;
    const onHash = () => window.location.hash === "#saha" && setNear(true);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [near]);

  return (
    <Section
      id="saha"
      index="04"
      eyebrow="3D saha simülatörü"
      title="Kurduğumuz istasyonun dijital ikizi."
      lead="Tarla, istasyon, uydu, gateway, veri akışı ve karar tek sahnede. Sahne zaman makinesine bağlı: NDVI düştükçe buğday sararır, rüzgâr gerçek veriyle eser, nem düştükçe toprak çatlar. Parçalara tıklayın."
    >
      <div ref={ref}>
        <ErrorBoundary label="3D saha">{near ? <FieldSimulator /> : <Placeholder />}</ErrorBoundary>
      </div>
    </Section>
  );
}
