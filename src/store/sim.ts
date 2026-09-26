"use client";
/** Canlı sistem durumu (SSE'den beslenir): zaman makinesi, kararlar, zincir, ödeme, SMS, olay akışı. */
import { create } from "zustand";
import type { ChainBlockView, ChainStatusView, DecisionSummary, LiveEvent, SimState, Snapshot } from "@/lib/live-types";

export interface PaymentView {
  code: string;
  phase: "held" | "pending" | "sent";
  amountTl: number;
  paymentRefText?: string;
  refHash?: string;
  ibanMasked: string;
  ms?: number;
  at: number;
}

export interface SmsView {
  code: string;
  to: string;
  text: string;
  mode: "mock" | "provider";
  kind: "odeme" | "gri" | "bilgi" | "erken";
  at: number;
}

export interface LogItem {
  id: number;
  at: number;
  tone: "green" | "wheat" | "red" | "sky" | "violet" | "soil" | "chain" | "dim";
  text: string;
}

interface LiveStore {
  connected: boolean;
  everConnected: boolean;
  lastEventAt: number;
  /** istemci saati − sunucu saati (ms) */
  clockSkew: number;
  modes: Snapshot["modes"] | null;
  sim: SimState | null;
  decisions: Record<string, DecisionSummary>;
  latestCode: string | null;
  blocks: ChainBlockView[];
  chain: ChainStatusView | null;
  chainPending: string | null;
  chainError: string | null;
  payments: Record<string, PaymentView>;
  sms: SmsView[];
  early: { parcelId: string; date: string; score: number; text: string; at: number } | null;
  log: LogItem[];
  rejected: { message: string; at: number } | null;
  setConnected: (v: boolean) => void;
  applySnapshot: (s: Snapshot & { serverTs?: number }) => void;
  apply: (ev: Pick<LiveEvent, "type" | "data"> & { ts?: number }) => void;
}

let logSeq = 0;
const fmtTl = (n: number) => new Intl.NumberFormat("tr-TR").format(n);

function pushLog(log: LogItem[], tone: LogItem["tone"], text: string): LogItem[] {
  return [{ id: ++logSeq, at: Date.now(), tone, text }, ...log].slice(0, 40);
}

export const useLive = create<LiveStore>((set, get) => ({
  connected: false,
  everConnected: false,
  lastEventAt: 0,
  clockSkew: 0,
  modes: null,
  sim: null,
  decisions: {},
  latestCode: null,
  blocks: [],
  chain: null,
  chainPending: null,
  chainError: null,
  payments: {},
  sms: [],
  early: null,
  log: [],
  rejected: null,
  setConnected: (v) => set({ connected: v, ...(v ? { everConnected: true } : {}) }),
  applySnapshot: (s) => {
    const decisions: Record<string, DecisionSummary> = {};
    for (const d of s.decisions) decisions[d.code] = d;
    set({
      modes: s.modes,
      sim: s.sim,
      decisions,
      // anlık görüntü kararları oluşturulma sırasına göre (en yeni başta) gelir
      latestCode: get().latestCode ?? s.decisions[0]?.code ?? null,
      blocks: s.blocks,
      chain: s.chain,
      clockSkew: s.serverTs ? Date.now() - s.serverTs : 0,
      lastEventAt: Date.now(),
    });
  },
  apply: (ev) => {
    const st = get();
    const now = Date.now();
    switch (ev.type) {
      case "sim": {
        const prev = st.sim;
        const next = ev.data as SimState;
        let log = st.log;
        if (prev && prev.scenario !== next.scenario) log = pushLog(log, "sky", `Senaryo yüklendi: ${next.scenarioLabel}`);
        if (prev && prev.runId === next.runId) {
          const pf = prev.parcels.find((p) => p.id === next.focusParcelId);
          const nf = next.parcels.find((p) => p.id === next.focusParcelId);
          if (pf && nf) {
            const names = { satellite: "Uydu", station: "Yer istasyonu", meteo: "Meteoroloji" } as const;
            for (const k of ["satellite", "station", "meteo"] as const) {
              const a = pf.witnesses[k].verdict;
              const b = nf.witnesses[k].verdict;
              if (a !== b) log = pushLog(log, b === "EVET" ? "red" : b === "VERI_YOK" ? "wheat" : "green", `${next.date} · ${names[k]} tanığı: ${b === "VERI_YOK" ? "VERİ YOK" : b}`);
            }
          }
        }
        set({ sim: next, log, lastEventAt: now });
        break;
      }
      case "decision": {
        const d = ev.data as Extract<LiveEvent, { type: "decision" }>["data"];
        if (d.phase === "rejected") {
          set({ rejected: { message: d.message ?? "Karar reddedildi", at: now }, log: pushLog(st.log, "wheat", `Emniyet: ${d.message}`) });
          break;
        }
        if (!d.decision) break;
        const dec = d.decision;
        const label = dec.outcome === "ODE" ? "ÖDE" : dec.outcome === "GRI_BOLGE" ? "GRİ BÖLGE" : "ÖDEME YOK";
        const text =
          d.phase === "created"
            ? `Karar ${dec.code}: ${dec.yesCount}/3 EVET → ${label} · itiraz penceresi açıldı`
            : d.phase === "stopped"
              ? `Karar ${dec.code} operatör tarafından durduruldu`
              : dec.notifiedAt
                ? `Karar ${dec.code} tamamlandı (${((dec.latencies.toplam ?? 0) / 1000).toFixed(1).replace(".", ",")} sn)`
                : `Karar ${dec.code} kesinleşti`;
        const tone = dec.outcome === "ODE" ? "green" : dec.outcome === "GRI_BOLGE" ? "wheat" : "dim";
        const sim = st.sim
          ? { ...st.sim, parcels: st.sim.parcels.map((p) => (p.id === dec.parcelId && (!p.decision || p.decision.code === dec.code || d.phase === "created") ? { ...p, decision: dec } : p)) }
          : st.sim;
        set({ decisions: { ...st.decisions, [dec.code]: dec }, latestCode: dec.code, sim, log: pushLog(st.log, tone, text) });
        break;
      }
      case "chain": {
        const c = ev.data as Extract<LiveEvent, { type: "chain" }>["data"];
        if (c.phase === "pending") {
          set({ chainPending: c.code, chainError: null, log: pushLog(st.log, "chain", `Zincire yazılıyor… (${c.mode === "amoy" ? "Polygon Amoy" : "taklit zincir"})`) });
          break;
        }
        if (c.phase === "error") {
          set({ chainError: c.message ?? "Zincir hatası", log: pushLog(st.log, "wheat", c.message ?? "Zincir hatası") });
          break;
        }
        const blocks = c.block ? [c.block, ...st.blocks.filter((b) => b.number !== c.block!.number || b.txHash !== c.block!.txHash)].slice(0, 12) : st.blocks;
        const dec = st.decisions[c.code];
        const decisions =
          dec && c.phase === "confirmed" ? { ...st.decisions, [c.code]: { ...dec, txHash: c.txHash ?? dec.txHash, blockNumber: c.block?.number ?? dec.blockNumber, explorerUrl: c.explorerUrl ?? dec.explorerUrl, chainMode: c.mode } } : st.decisions;
        set({
          blocks,
          decisions,
          chainPending: null,
          chain: st.chain ? { ...st.chain, height: Math.max(st.chain.height, c.block?.number ?? 0), lastTx: c.txHash ?? st.chain.lastTx } : st.chain,
          log: pushLog(
            st.log,
            "chain",
            c.phase === "confirmed"
              ? `Blok #${c.block?.number ?? "?"} mühürlendi (${((c.ms ?? 0) / 1000).toFixed(1).replace(".", ",")} sn)`
              : `Ödeme referansının parmak izi zincirde (blok #${c.block?.number ?? "?"})`,
          ),
        });
        break;
      }
      case "payment": {
        const p = ev.data as Extract<LiveEvent, { type: "payment" }>["data"];
        const view: PaymentView = { code: p.code, phase: p.phase, amountTl: p.amountTl, paymentRefText: p.paymentRefText, refHash: p.refHash, ibanMasked: p.ibanMasked, ms: p.ms, at: now };
        const dec = st.decisions[p.code];
        const decisions = dec && p.phase === "sent" ? { ...st.decisions, [p.code]: { ...dec, paymentRefText: p.paymentRefText ?? null, paymentRef: p.refHash ?? null } } : st.decisions;
        const text =
          p.phase === "held"
            ? "Ödeme talimatı hazır — sahnede 8. adımda gönderilecek"
            : p.phase === "pending"
              ? `FAST talimatı gönderiliyor: ₺${fmtTl(p.amountTl)} → ${p.ibanMasked}`
              : `Ödeme talimatı başarılı (SİMÜLASYON): ${p.paymentRefText}`;
        set({ payments: { ...st.payments, [p.code]: view }, decisions, log: pushLog(st.log, "wheat", text) });
        break;
      }
      case "sms": {
        const s = ev.data as Extract<LiveEvent, { type: "sms" }>["data"];
        set({ sms: [{ ...s, at: now }, ...st.sms].slice(0, 10), log: pushLog(st.log, "sky", `SMS → ${s.to}${s.mode === "mock" ? " (ekranda)" : ""}`) });
        break;
      }
      case "early": {
        const e = ev.data as Extract<LiveEvent, { type: "early" }>["data"];
        set({ early: { ...e, at: now }, log: pushLog(st.log, "violet", `Yapay zekâ erken uyarı (${e.date}): risk ${e.score.toFixed(2).replace(".", ",")}`) });
        break;
      }
      case "breaker": {
        const b = ev.data as Extract<LiveEvent, { type: "breaker" }>["data"];
        set({ sim: st.sim ? { ...st.sim, breaker: b } : st.sim, log: pushLog(st.log, b.paused ? "red" : "green", b.paused ? `Devre kesici açıldı: ${b.reason}` : "Devre kesici kapandı") });
        break;
      }
      default:
        break;
    }
  },
}));

export function focusParcel(sim: SimState | null) {
  if (!sim) return null;
  return sim.parcels.find((p) => p.id === sim.focusParcelId) ?? null;
}
