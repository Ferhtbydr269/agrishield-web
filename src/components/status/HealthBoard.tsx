"use client";
/**
 * /durum — bileşen bileşen yeşil / sarı / kırmızı (Bölüm 13.4): eksik olan bileşen otomatik taklit moda
 * düşer ve burada SARI görünür. 5 sn'de bir /api/health yoklanır.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, BrainCircuit, CheckCircle2, Clock, Database, Link2, MessageSquareText, RadioTower, RefreshCcw, TriangleAlert, XCircle } from "lucide-react";
import type { Health, Level } from "@/server/health";
import { getJson } from "@/lib/api";
import { cn } from "@/components/ui/cn";

type Key = "db" | "device" | "chain" | "ai" | "sms" | "sim" | "stream";
const ORDER: { key: Key; icon: typeof Database; fix: string }[] = [
  { key: "db", icon: Database, fix: "`npm run setup` (veritabanı + tohum verisi) çalıştırın." },
  { key: "device", icon: RadioTower, fix: "ESP32'yi açın; Wi-Fi ve INGEST_SECRET eşleşmeli. Yoksa simüle cihaz sahneyi taşır." },
  { key: "chain", icon: Link2, fix: "İnternet + AMOY_RPC_URL/AMOY_PRIVATE_KEY varsa CHAIN_MODE=amoy; yoksa taklit zincir (sahne planı)." },
  { key: "ai", icon: BrainCircuit, fix: "Varsayılan yerel bilgi tabanıdır (internetsiz). API için AI_MODE=api + ANTHROPIC_API_KEY." },
  { key: "sms", icon: MessageSquareText, fix: "SMS_MODE=mock: mesaj yalnız ekrandaki telefonda. Gerçek gönderim yalnız takımın kendi numarasına." },
  { key: "sim", icon: Clock, fix: "Operatör panelinden veya sunum konsolundan senaryo yükleyin." },
  { key: "stream", icon: Activity, fix: "Sayfayı yenileyin; bağlantı koparsa istemci kendiliğinden yeniden bağlanır." },
];

const LEVEL: Record<Level, { label: string; cls: string; dot: string; Icon: typeof CheckCircle2 }> = {
  ok: { label: "YEŞİL", cls: "border-green/50 bg-green/10 text-green-fg", dot: "bg-green", Icon: CheckCircle2 },
  warn: { label: "SARI · taklit/yedek", cls: "border-wheat/60 bg-wheat/10 text-wheat-fg", dot: "bg-wheat", Icon: TriangleAlert },
  error: { label: "KIRMIZI", cls: "border-red/60 bg-red/10 text-red-fg", dot: "bg-red", Icon: XCircle },
};

const ENDPOINTS = [
  ["GET", "/api/health", "Bu sayfanın verisi"],
  ["GET", "/api/sim/state", "Zaman makinesi + üç parselin tanıkları"],
  ["GET", "/api/parcel/P-1182", "Parsel, poliçe, NDVI serisi, karar günlüğü"],
  ["GET", "/api/decision/7F3A", "Kararın tam delili (JSON)"],
  ["GET", "/api/chain/status", "Zincir modu, son bloklar, bütünlük kontrolü"],
  ["GET", "/api/device", "Yer istasyonu durumu + son okumalar"],
  ["GET", "/api/stream", "Canlı olay yayını (SSE)"],
  ["POST", "/api/ask", "Asistan: { q } → kaynaklı cevap"],
] as const;

function uptime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h} sa ${m} dk` : `${m} dk ${sec % 60} sn`;
}

export function HealthBoard({ initial }: { initial: Health }) {
  const [h, setH] = useState<Health>(initial);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setBusy(true);
    try {
      setH(await getJson<Health>("/api/health"));
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "sunucuya ulaşılamadı");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const t = setInterval(() => void refresh(), 5000);
    return () => clearInterval(t);
  }, []);

  const levels = ORDER.map((o) => h[o.key].level);
  const overall: Level = err ? "error" : levels.includes("error") ? "error" : levels.includes("warn") ? "warn" : "ok";
  const O = LEVEL[overall];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6" data-testid="status-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Sistem durumu</div>
          <h1 className="mt-1 text-4xl font-extrabold sm:text-5xl">Bileşen bileşen sağlık</h1>
          <p className="mt-2 max-w-2xl text-dim">
            Açılışta her bileşen denetlenir; eksik olan otomatik olarak <b className="text-wheat-fg">taklit moda</b> düşer ve burada sarı görünür. Sahne
            buna göre çalışmaya devam eder.
          </p>
        </div>
        <button type="button" onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm hover:bg-surface-2">
          <RefreshCcw className={cn("size-4", busy && "animate-spin")} aria-hidden /> Yenile
        </button>
      </div>

      <div className={cn("mt-6 flex flex-wrap items-center gap-3 rounded-2xl border p-4", O.cls)} role="status" data-testid="status-overall">
        <O.Icon className="size-6" aria-hidden />
        <span className="text-lg font-bold">
          {overall === "ok" ? "Tüm bileşenler çalışıyor" : overall === "warn" ? "Çalışıyor — bazı bileşenler taklit/yedek modda" : err ? `Sunucuya ulaşılamadı: ${err}` : "Bir bileşen çalışmıyor"}
        </span>
        <span className="ml-auto font-mono text-sm opacity-80">
          çalışma süresi {uptime(h.uptime)} · son kontrol {new Date(h.checkedAt).toLocaleTimeString("tr-TR")}
        </span>
      </div>

      <ul className="mt-6 grid gap-3" aria-label="Bileşenler">
        {ORDER.map(({ key, icon: Icon, fix }) => {
          const c = h[key];
          const L = LEVEL[c.level];
          return (
            <li key={key} className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center" data-testid={`health-${key}`} data-level={c.level}>
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className={cn("mt-1.5 size-3 shrink-0 rounded-full", L.dot)} aria-hidden />
                <Icon className="mt-0.5 size-5 shrink-0 text-dim" aria-hidden />
                <div className="min-w-0">
                  <div className="font-semibold">{c.label}</div>
                  <div className="text-sm text-dim [overflow-wrap:anywhere]">{c.detail}</div>
                  {c.level !== "ok" && <div className="mt-1 text-xs text-dim">Nasıl yeşile döner: {fix.replace(/`/g, "")}</div>}
                </div>
              </div>
              <span className={cn("inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border px-3 py-1 font-mono text-xs font-bold sm:self-center", L.cls)}>
                <L.Icon className="size-3.5" aria-hidden /> {L.label}
              </span>
            </li>
          );
        })}
      </ul>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="panel p-5">
          <h2 className="font-sans text-base font-bold tracking-normal">Çalışma modları</h2>
          <dl className="mt-3 grid grid-cols-2 gap-y-2 font-mono text-sm">
            <dt className="text-dim">OFFLINE</dt>
            <dd>{h.modes.offline ? "1 (internetsiz)" : "0"}</dd>
            <dt className="text-dim">CHAIN_MODE</dt>
            <dd>{h.modes.chain}</dd>
            <dt className="text-dim">AI_MODE</dt>
            <dd>{h.modes.ai}</dd>
            <dt className="text-dim">SMS_MODE</dt>
            <dd>{h.modes.sms}</dd>
          </dl>
          <p className="mt-3 text-xs text-dim">Sahne planı: internet varsa amoy, yoksa taklit zincir. Ödeme ve SMS prototipte her zaman SİMÜLASYON'dur.</p>
        </div>
        <div className="panel p-5">
          <h2 className="font-sans text-base font-bold tracking-normal">Açık API (inceleme için)</h2>
          <ul className="mt-3 grid gap-1.5 text-sm">
            {ENDPOINTS.map(([m, path, what]) => (
              <li key={path} className="flex items-baseline gap-2">
                <span className={cn("w-11 shrink-0 font-mono text-xs font-bold", m === "GET" ? "text-sky-fg" : "text-wheat-fg")}>{m}</span>
                {m === "GET" && path !== "/api/stream" ? (
                  <Link href={path} className="font-mono text-xs underline decoration-line underline-offset-4 hover:text-text" prefetch={false}>
                    {path}
                  </Link>
                ) : (
                  <span className="font-mono text-xs">{path}</span>
                )}
                <span className="truncate text-xs text-dim">— {what}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
