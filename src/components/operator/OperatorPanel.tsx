"use client";
/**
 * /operator — PIN ile korunan panel (Bölüm 16.3): senaryo seçimi, zaman makinesi, cihaz durumu, manuel tetik,
 * itiraz / ödeme bekletme, devre kesici ve denetim kaydı. Tüm işlemler sunucuda AuditLog'a yazılır.
 */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Ban, Gavel, KeyRound, Landmark, Link2, LogOut, PauseOctagon, Power, Radio, RefreshCcw, ScrollText, ShieldAlert, Eraser } from "lucide-react";
import { getJson, postJson } from "@/lib/api";
import { PARCELS } from "@/sim/parcels";
import { useLive } from "@/store/sim";
import { useDevice } from "@/store/device";
import { ScenarioPicker, TimeMachine } from "@/components/demo/TimeMachine";
import { LiveMoisturePanel } from "@/components/demo/LiveMoisture";
import { WitnessPanel } from "@/components/demo/WitnessPanel";
import { DecisionBadge } from "@/components/ui/DecisionBadge";
import { ChainModeBadge, LiveBadge, Pill } from "@/components/ui/Badges";
import { cn, fmtNum, fmtTl } from "@/components/ui/cn";

interface LogRow {
  id: string;
  ts: number;
  actor: string;
  action: string;
  detail: string;
}

function Btn({ onClick, children, tone = "dim", disabled, title }: { onClick: () => void; children: React.ReactNode; tone?: "dim" | "wheat" | "red" | "green"; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-40",
        tone === "wheat" && "border-wheat bg-wheat/15 text-wheat-fg hover:bg-wheat/25",
        tone === "red" && "border-red/60 bg-red/10 text-red-fg hover:bg-red/20",
        tone === "green" && "border-green/60 bg-green/10 text-green-fg hover:bg-green/20",
        tone === "dim" && "border-line bg-surface text-text hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}

function Login() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await postJson("/api/operator", { pin });
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Giriş başarısız");
      setPin("");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="mx-auto grid min-h-[70dvh] max-w-sm place-content-center px-4">
      <form
        className="panel w-full p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <KeyRound className="size-8 text-wheat-fg" aria-hidden />
        <h1 className="mt-3 text-3xl font-extrabold">Operatör girişi</h1>
        <p className="mt-1 text-sm text-dim">Dakikada en fazla 5 deneme. Tüm girişler denetim kaydına yazılır.</p>
        <label htmlFor="pin" className="mt-5 block text-sm text-dim">
          PIN
        </label>
        <input
          id="pin"
          data-testid="operator-pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={12}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="mt-1 w-full rounded-xl border border-line bg-surface-2 px-4 py-3 font-mono text-2xl tracking-[0.5em] outline-none focus:border-wheat"
          autoFocus
        />
        {err && (
          <p className="mt-2 text-sm text-red-fg" role="alert">
            {err}
          </p>
        )}
        <button type="submit" disabled={busy || pin.length < 4} className="mt-4 w-full rounded-xl bg-wheat px-4 py-3 font-semibold text-bg disabled:opacity-40">
          Giriş
        </button>
      </form>
    </main>
  );
}

export function OperatorPanel({ authed }: { authed: boolean }) {
  if (!authed) return <Login />;
  return <Panel />;
}

function Panel() {
  const router = useRouter();
  const sim = useLive((s) => s.sim);
  const payments = useLive((s) => s.payments);
  const device = useDevice((s) => s.state);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [reason, setReason] = useState("Köyde toplu ödeme — manuel inceleme");

  const loadLogs = useCallback(async () => {
    try {
      const r = await getJson<{ authed: boolean; logs?: LogRow[] }>("/api/operator");
      if (!r.authed) router.refresh();
      else setLogs(r.logs ?? []);
    } catch {
      /* sessiz */
    }
  }, [router]);

  useEffect(() => {
    void loadLogs();
    const t = setInterval(() => void loadLogs(), 4000);
    return () => clearInterval(t);
  }, [loadLogs]);

  const act = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      setMsg({ ok: true, text: `${label}: tamam` });
      void loadLogs();
    } catch (e) {
      setMsg({ ok: false, text: `${label}: ${e instanceof Error ? e.message : "hata"}` });
    }
    setTimeout(() => setMsg(null), 4000);
  };

  const settings = (s: Record<string, unknown>) => postJson("/api/sim/settings", s);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Operatör paneli</div>
          <h1 className="mt-1 text-4xl font-extrabold">Sahne ve sistem kontrolü</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <LiveBadge />
            <ChainModeBadge />
            {sim?.breaker.paused && <Pill tone="red">devre kesici: durduruldu</Pill>}
            {sim?.holdPayment && <Pill tone="wheat">ödemeler bekletiliyor</Pill>}
          </div>
        </div>
        <Btn onClick={() => void act("Çıkış", async () => { await postJson("/api/operator", { logout: true }); router.refresh(); })}>
          <LogOut className="size-4" aria-hidden /> Çıkış
        </Btn>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid min-w-0 grid-cols-1 content-start gap-5">
          <section className="panel p-5">
            <h2 className="font-sans text-base font-bold tracking-normal">Senaryo</h2>
            <div className="mt-3">
              <ScenarioPicker />
            </div>
          </section>
          <TimeMachine />

          <section className="panel p-5">
            <h2 className="flex items-center gap-2 font-sans text-base font-bold tracking-normal">
              <Gavel className="size-5 text-wheat-fg" aria-hidden /> Parseller · manuel tetik
            </h2>
            <ul className="mt-3 grid grid-cols-1 gap-3">
              {PARCELS.map((p) => {
                const st = sim?.parcels.find((x) => x.id === p.id);
                const d = st?.decision ?? null;
                const pay = d ? payments[d.code] : undefined;
                return (
                  <li key={p.id} className="rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-lg font-bold">{p.id}</span>
                      <span className="text-sm text-dim">{p.role}</span>
                      {st && <span className="ml-auto font-mono text-sm">{st.yesCount}/3 · risk {fmtNum(st.riskScore * 100, 0)}</span>}
                    </div>
                    {st && (
                      <div className="mt-3">
                        <WitnessPanel w={st.witnesses} compact />
                      </div>
                    )}
                    {d && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                        <DecisionBadge outcome={d.outcome} size="sm" withSub={false} />
                        <a href={`/k/${d.code}`} className="font-mono underline underline-offset-4">
                          /k/{d.code}
                        </a>
                        <span className="text-dim">
                          {d.status}
                          {d.amountTl > 0 ? ` · ${fmtTl(d.amountTl)} TL` : ""}
                          {pay ? ` · ödeme: ${pay.phase === "held" ? "bekletiliyor" : pay.phase === "pending" ? "gönderiliyor" : "gönderildi (SİMÜLASYON)"}` : ""}
                        </span>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Btn onClick={() => void act(`${p.id} karar`, () => postJson("/api/decide", { parcelId: p.id }))}>Şimdi karar üret</Btn>
                      <Btn
                        tone="red"
                        title="Karantina ve sezon tavanını atlar; denetim kaydına yazılır"
                        onClick={() => {
                          if (window.confirm(`${p.id} için emniyetleri (karantina, sezon tavanı) atlayarak karar üretilsin mi? Bu işlem denetim kaydına yazılır.`))
                            void act(`${p.id} zorla karar`, () => postJson("/api/decide", { parcelId: p.id, force: true }));
                        }}
                      >
                        <ShieldAlert className="size-4" aria-hidden /> Emniyeti atla
                      </Btn>
                      {d?.status === "itiraz_penceresi" && (
                        <Btn tone="wheat" onClick={() => void act("İtiraz", () => settings({ stopDecision: d.id }))}>
                          <Ban className="size-4" aria-hidden /> İtiraz et (durdur)
                        </Btn>
                      )}
                      {d && pay?.phase === "held" && (
                        <Btn tone="green" onClick={() => void act("Ödeme", () => postJson("/api/payout", { decisionId: d.id }))}>
                          <Landmark className="size-4" aria-hidden /> Ödemeyi gönder
                        </Btn>
                      )}
                      {d && !d.txHash && d.status === "kesinlesti" && (
                        <Btn onClick={() => void act("Zincir", () => postJson("/api/chain/anchor", { decisionId: d.id }))}>
                          <Link2 className="size-4" aria-hidden /> Zincire yaz
                        </Btn>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="panel p-5">
            <h2 className="flex items-center gap-2 font-sans text-base font-bold tracking-normal">
              <PauseOctagon className="size-5 text-red-fg" aria-hidden /> Emniyetler
            </h2>
            <div className="mt-3 grid gap-3">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                <span>
                  <b>Ödemeleri beklet</b>
                  <span className="block text-sm text-dim">Karar ve zincir kaydı sürer, ödeme “Ödemeyi gönder” ile elle çıkar.</span>
                </span>
                <input type="checkbox" className="size-5 accent-[var(--wheat)]" checked={Boolean(sim?.holdPayment)} onChange={(e) => void act("Ödeme bekletme", () => settings({ holdPayment: e.target.checked }))} />
              </label>
              <div className="rounded-xl border border-line p-3">
                <b>Devre kesici</b>
                <span className="block text-sm text-dim">Köyde yeni ödemeleri durdurur. {sim?.breaker.paused ? `Şu an durdurulmuş: ${sim.breaker.reason ?? ""}` : "Şu an açık."}</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input value={reason} onChange={(e) => setReason(e.target.value.slice(0, 120))} maxLength={120} className="min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm" aria-label="Durdurma gerekçesi" />
                  {sim?.breaker.paused ? (
                    <Btn tone="green" onClick={() => void act("Devre kesici", () => settings({ breaker: { trip: false } }))}>
                      <Power className="size-4" aria-hidden /> Yeniden aç
                    </Btn>
                  ) : (
                    <Btn tone="red" onClick={() => void act("Devre kesici", () => settings({ breaker: { trip: true, reason } }))}>
                      <PauseOctagon className="size-4" aria-hidden /> Durdur
                    </Btn>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Btn onClick={() => void act("Bayraklar", () => settings({ clearFlags: true }))}>
                  <Eraser className="size-4" aria-hidden /> Şüpheli bayrakları temizle
                </Btn>
                <Btn onClick={() => void act("Sıfırlama", () => postJson("/api/sim/reset", {}))}>
                  <RefreshCcw className="size-4" aria-hidden /> Simülasyonu sıfırla
                </Btn>
              </div>
            </div>
          </section>
        </div>

        <aside className="grid min-w-0 grid-cols-1 content-start gap-5">
          <section className="panel p-5">
            <h2 className="flex items-center gap-2 font-sans text-base font-bold tracking-normal">
              <Radio className="size-5 text-green-fg" aria-hidden /> Yer istasyonu
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-y-1 font-mono text-sm">
              <dt className="text-dim">durum</dt>
              <dd className="text-right">{device?.status ?? "—"}</dd>
              <dt className="text-dim">cihaz</dt>
              <dd className="text-right">{device?.deviceId ?? "—"}</dd>
              <dt className="text-dim">son paket</dt>
              <dd className="text-right">{device?.lastSeenMs ? `${Math.max(0, Math.round((Date.now() - device.lastSeenMs) / 1000))} sn önce` : "—"}</dd>
              <dt className="text-dim">sıra (seq)</dt>
              <dd className="text-right">{device?.seq ?? "—"}</dd>
              <dt className="text-dim">pil</dt>
              <dd className="text-right">{device?.batteryV != null ? `${fmtNum(device.batteryV, 2)} V` : "—"}</dd>
              <dt className="text-dim">gecikme</dt>
              <dd className="text-right">{device?.lastLatencyMs != null ? `${device.lastLatencyMs} ms` : "—"}</dd>
              <dt className="text-dim">istasyon kaynağı</dt>
              <dd className="text-right">{sim?.stationSource ?? "—"}</dd>
            </dl>
            {device?.flags.length ? (
              <ul className="mt-3 grid gap-1 text-sm">
                {device.flags.map((f) => (
                  <li key={`${f.code}-${f.ts}`} className="rounded-lg border border-red/40 bg-red/10 px-3 py-1.5 text-red-fg">
                    {f.label} <span className="text-xs opacity-80">— {f.detail}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-3">
              <LiveMoisturePanel compact />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Btn onClick={() => void act("İstasyon kaynağı", () => settings({ stationSource: sim?.stationSource === "canli" ? "senaryo" : "canli" }))} tone={sim?.stationSource === "canli" ? "green" : "dim"}>
                {sim?.stationSource === "canli" ? "Kaynak: canlı cihaz" : "Kaynak: senaryo"}
              </Btn>
              <Btn onClick={() => void act("Simüle cihaz", () => postJson("/api/device", { forceSim: !device?.forceSim }))} tone={device?.forceSim ? "red" : "dim"}>
                {device?.forceSim ? "Simülasyon zorlanıyor" : "Simülasyona çevir"}
              </Btn>
            </div>
            <p className="mt-2 text-xs text-dim">
              “Kaynak: canlı cihaz” seçilince istasyon tanığı senaryo yerine yer istasyonunun (ESP32 ya da simüle cihaz) ölçümünü kullanır. “Simülasyona çevir” gerçek cihazı yok
              sayar (sahne acil düğmesi).
            </p>
          </section>

          <section className="panel p-5" data-testid="audit-log">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-sans text-base font-bold tracking-normal">
                <ScrollText className="size-5 text-chain-fg" aria-hidden /> Denetim kaydı
              </h2>
              <span className="text-xs text-dim">son {logs.length}</span>
            </div>
            <ol className="mt-3 grid max-h-[560px] gap-1 overflow-y-auto pr-1 text-sm">
              {logs.map((l) => (
                <li key={l.id} className="rounded-lg border border-line px-3 py-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xs text-dim">{new Date(l.ts).toLocaleTimeString("tr-TR")}</span>
                    <span className="font-mono text-xs text-wheat-fg">{l.actor}</span>
                    <span className="font-semibold">{l.action}</span>
                  </div>
                  <div className="truncate font-mono text-xs text-dim" title={l.detail.slice(0, 300)}>
                    {l.detail}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
      {msg && (
        <div className={cn("fixed bottom-4 right-4 z-50 rounded-xl border px-4 py-3 shadow-xl", msg.ok ? "border-green/50 bg-surface" : "border-red/60 bg-surface text-red-fg")} role="status">
          {msg.text}
        </div>
      )}
    </main>
  );
}
