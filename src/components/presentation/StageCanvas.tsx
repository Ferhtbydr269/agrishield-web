"use client";
/**
 * SAHNE TUVALİ — sunum ve kiosk her zaman sabit 1920×1080 bir tuvalde tasarlanır ve ekrana ORANTILI sığdırılır
 * (slayt yazılımı gibi; en-boy oranı farklıysa kenarlarda koyu boşluk kalır). Böylece projeksiyon (1920×1080 tam ekran),
 * tarayıcı içinde (adres çubuğu açık), dizüstü (1536×864, %125 ölçek) ya da 1280×720'de görünüm birebir aynıdır;
 * hiçbir metin taşmaz, hiçbir öğe üst üste binmez.
 * Tuval açıkken kök yazı boyutu 20 px'e sabitlenir: rem kullanan ortak bileşenler de her ekranda aynı ölçüde çizilir.
 */
import { useLayoutEffect, useState } from "react";

export const STAGE_W = 1920;
export const STAGE_H = 1080;

export function StageCanvas({ children, className, testId, label }: { children: React.ReactNode; className?: string; testId?: string; label?: string }) {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    fit();
    window.addEventListener("resize", fit);
    const root = document.documentElement;
    root.setAttribute("data-stage", "1");
    return () => {
      window.removeEventListener("resize", fit);
      root.removeAttribute("data-stage");
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[80] overflow-hidden bg-[#070d0a]" data-theme="dark" role="dialog" aria-label={label} data-testid={testId}>
      <div
        className={`absolute left-1/2 top-1/2 overflow-hidden bg-bg text-text ${className ?? ""}`}
        style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: "center" }}
      >
        {children}
      </div>
    </div>
  );
}
