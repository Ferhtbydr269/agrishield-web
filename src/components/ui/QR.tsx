"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** QR kod (yerel üretim, dış servis yok). SVG veri URL'si olarak basılır. */
export function QR({ value, size = 140, className, label }: { value: string; size?: number; className?: string; label?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0e1a14", light: "#ffffff" } })
      .then((svg) => alive && setSrc(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`))
      .catch(() => setSrc(null));
    return () => {
      alive = false;
    };
  }, [value]);
  return (
    <div className={className} style={{ width: size }}>
      <div className="overflow-hidden rounded-lg border border-line bg-white p-1" style={{ width: size, height: size }}>
        {src ? <img src={src} alt={label ?? `QR: ${value}`} width={size - 8} height={size - 8} className="size-full" /> : <div className="size-full animate-pulse bg-surface-2" />}
      </div>
      {label && <div className="mt-1.5 text-center font-mono text-[0.68rem] text-dim">{label}</div>}
    </div>
  );
}

/** Tarayıcının bulunduğu adres (QR'lar sahnede yerel ağ IP'sine de bakabilsin) */
export function useOrigin(): string {
  const [o, setO] = useState("");
  useEffect(() => setO(window.location.origin), []);
  return o;
}
