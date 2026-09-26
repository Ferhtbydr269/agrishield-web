"use client";
import { FlaskConical, Radio, CircleDashed, Database, Wifi, WifiOff } from "lucide-react";
import { useDevice } from "@/store/device";
import { useLive } from "@/store/sim";
import { cn } from "./cn";

type Tone = "green" | "wheat" | "red" | "sky" | "violet" | "soil" | "chain" | "dim";

const TONE: Record<Tone, string> = {
  green: "text-green-fg border-green/40 bg-green/10",
  wheat: "text-wheat-fg border-wheat/45 bg-wheat/10",
  red: "text-red-fg border-red/45 bg-red/10",
  sky: "text-sky-fg border-sky/45 bg-sky/10",
  violet: "text-violet-fg border-violet/45 bg-violet/10",
  soil: "text-soil-fg border-soil/45 bg-soil/10",
  chain: "text-chain-fg border-chain/35 bg-chain/10",
  dim: "text-dim border-line bg-surface-2",
};

export function Pill({ tone = "dim", children, className, title }: { tone?: Tone; children: React.ReactNode; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.08em]",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Gerçek olmayan her adım bu rozetle işaretlenir. Kaldırılamaz. */
export function SimBadge({ className, label = "SİMÜLASYON", title }: { className?: string; label?: string; title?: string }) {
  return (
    <Pill tone="wheat" className={className} title={title ?? "Bu adım gerçek değildir; prototipte taklit edilir."}>
      <FlaskConical className="size-3" aria-hidden />
      {label}
    </Pill>
  );
}

export function SampleDataBadge({ className }: { className?: string }) {
  return (
    <Pill tone="wheat" className={className} title="Sentetik örnek veri — gerçekçi bir senaryoya göre üretildi, gerçek diye sunulmaz.">
      <Database className="size-3" aria-hidden />
      ÖRNEK VERİ
    </Pill>
  );
}

export function RealDataBadge({ className, label = "GERÇEK VERİ" }: { className?: string; label?: string }) {
  return (
    <Pill tone="green" className={className} title="Kamuya açık kaynaktan indirilmiş gerçek veri.">
      <Database className="size-3" aria-hidden />
      {label}
    </Pill>
  );
}

export function PendingBadge({ className }: { className?: string }) {
  return (
    <Pill tone="dim" className={className} title="Bu değer henüz doğrulanmadı; ekranda rakam gösterilmez.">
      <CircleDashed className="size-3" aria-hidden />
      veri bekleniyor
    </Pill>
  );
}

/** CANLI DONANIM BAĞLI / SİMÜLE CİHAZ / cihaz sessiz */
export function LiveBadge({ className, compact = false }: { className?: string; compact?: boolean }) {
  const st = useDevice((s) => s.state?.status);
  if (st === "canli")
    return (
      <Pill tone="green" className={className} title="ESP32 istasyonundan gerçek ölçüm geliyor">
        <span className="pulse-dot size-2 rounded-full bg-green" aria-hidden />
        {compact ? "CANLI" : "CANLI DONANIM BAĞLI"}
      </Pill>
    );
  if (st === "simule")
    return (
      <Pill tone="wheat" className={className} title="Gerçek cihaz 20 sn'dir sessiz → simüle cihaz devrede">
        <Radio className="size-3" aria-hidden />
        {compact ? "SİMÜLE CİHAZ" : "SİMÜLE CİHAZ"}
      </Pill>
    );
  return (
    <Pill tone="dim" className={className}>
      <Radio className="size-3" aria-hidden />
      cihaz sessiz
    </Pill>
  );
}

export function ConnectionBadge({ className }: { className?: string }) {
  const connected = useLive((s) => s.connected);
  const ever = useLive((s) => s.everConnected);
  return connected ? (
    <Pill tone="green" className={className} title="Sunucuya canlı bağlı (SSE)">
      <Wifi className="size-3" aria-hidden /> bağlı
    </Pill>
  ) : (
    <Pill tone={ever ? "red" : "dim"} className={className} title="Canlı yayın bağlantısı yok; yeniden deneniyor">
      <WifiOff className="size-3" aria-hidden /> {ever ? "yeniden bağlanıyor" : "bağlanıyor"}
    </Pill>
  );
}

export function ChainModeBadge({ className }: { className?: string }) {
  const mode = useLive((s) => s.modes?.chain);
  if (mode === "amoy") return <Pill tone="chain" className={className}>POLYGON AMOY TESTNET</Pill>;
  return <SimBadge className={className} label="TAKLİT ZİNCİR" title="Yerel SHA-256 zinciri. Gerçek testnet için CHAIN_MODE=amoy" />;
}
