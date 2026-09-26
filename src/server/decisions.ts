/**
 * KARAR SERVİSİ: kanıt paketi → hash → veritabanı → itiraz penceresi → zincir → ödeme → SMS.
 * Her adım SSE ile yayınlanır ve süresi ölçülür (sahnede "karar→zincir: 1,6 sn" rozetleri).
 */
import type { Decision } from "@prisma/client";
import { buildEvidence, hashEvidence } from "@/engine/evidence";
import type { DecisionBasis, Evidence, Outcome } from "@/engine/types";
import type { DecisionSummary } from "@/lib/live-types";
import { sha256Hex0x } from "@/lib/sha256";
import { DATA_META } from "@/sim/data";
import type { ParcelEval } from "@/sim/evaluate";
import { getParcel } from "@/sim/parcels";
import { SEASON } from "@/sim/scenarios";
import { audit } from "./audit";
import { publish } from "./bus";
import { chain, mockChain } from "./chain";
import { config } from "./config";
import { db } from "./db";
import { simulatePayout, IBAN_MASK } from "./payments";
import { sendSms, smsTextFor, type SmsKind } from "./sms";

/** Seed kararlarının sabit kodları (basılı QR'lar bunlara bakar) */
export const SEED_CODES = { "kuraklik-2025": "7F3A", "gri-bolge": "2C9B", saglikli: "5E10", manipulasyon: "9D4E" } as const;
const RESERVED = new Set<string>(Object.values(SEED_CODES));

export function toSummary(d: Decision): DecisionSummary {
  let latencies: Record<string, number> = {};
  try {
    latencies = d.latencies ? JSON.parse(d.latencies) : {};
  } catch {
    latencies = {};
  }
  return {
    id: d.id,
    code: d.code,
    parcelId: d.parcelId,
    outcome: d.outcome as Outcome,
    yesCount: d.yesCount,
    amountTl: d.amountTl ?? 0,
    status: d.status as DecisionSummary["status"],
    simDate: d.simDate,
    scenario: d.scenario,
    ts: d.ts.getTime(),
    windowEndsAt: d.windowEndsAt ? d.windowEndsAt.getTime() : null,
    witnesses: { sat: d.witnessSat as DecisionSummary["witnesses"]["sat"], station: d.witnessStation as DecisionSummary["witnesses"]["station"], meteo: d.witnessMeteo as DecisionSummary["witnesses"]["meteo"] },
    evidenceHash: d.evidenceHash,
    txHash: d.txHash,
    blockNumber: d.blockNumber,
    explorerUrl: d.explorerUrl,
    chainMode: d.chainMode,
    paymentRef: d.paymentRef,
    paymentRefText: d.paymentRefText,
    smsText: d.smsText,
    notifiedAt: d.notifiedAt ? d.notifiedAt.getTime() : null,
    latencies,
  };
}

async function newCode(): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const code = Math.floor(Math.random() * 0xffff)
      .toString(16)
      .toUpperCase()
      .padStart(4, "0");
    if (RESERVED.has(code)) continue;
    const exists = await db.decision.findUnique({ where: { code } });
    if (!exists) return code;
  }
  throw new Error("Karar kodu üretilemedi");
}

export interface CreateDecisionInput {
  evaluation: ParcelEval;
  outcome: Outcome;
  basis: DecisionBasis;
  scenario: string;
  simDate: string;
  simMs: number;
  runId: string;
  status: "itiraz_penceresi" | "kesinlesti";
  windowSec?: number;
  code?: string;
}

export async function createDecision(i: CreateDecisionInput): Promise<Decision> {
  const parcel = getParcel(i.evaluation.parcelId);
  if (!parcel) throw new Error(`Parsel yok: ${i.evaluation.parcelId}`);
  const policy = await db.policy.findFirst({ where: { parcelId: parcel.id, season: SEASON.label } });
  if (!policy) throw new Error(`Poliçe yok: ${parcel.id}`);
  const code = i.code ?? (await newCode());
  const evidence = buildEvidence({
    decisionCode: code,
    parcelId: parcel.id,
    season: SEASON.label,
    ts: new Date(i.simMs).toISOString(),
    witnesses: i.evaluation.witnesses,
    thresholds: JSON.parse(policy.thresholds),
    model: i.evaluation.model,
    vote: i.evaluation.vote,
    outcome: i.outcome,
    basis: i.basis,
    scenario: i.scenario,
    dataNote: DATA_META.synthetic ? "örnek veri (sentetik senaryo); meteoroloji normali gerçek ERA5 1991–2020" : "gerçek veri",
  });
  const evidenceHash = hashEvidence(evidence);
  const amountTl = i.outcome === "ODE" ? Math.round(policy.sumInsuredTl * policy.payoutRate) : 0;
  const w = i.evaluation.witnesses;
  const row = await db.decision.create({
    data: {
      code,
      ts: new Date(i.simMs),
      parcelId: parcel.id,
      policyId: policy.id,
      witnessSat: w.satellite.verdict,
      witnessStation: w.station.verdict,
      witnessMeteo: w.meteo.verdict,
      yesCount: i.evaluation.vote.yesCount,
      outcome: i.outcome,
      amountTl,
      evidence: JSON.stringify(evidence),
      evidenceHash,
      simDate: i.simDate,
      scenario: i.scenario,
      runId: i.runId,
      status: i.status,
      windowEndsAt: i.status === "itiraz_penceresi" ? new Date(Date.now() + (i.windowSec ?? config.itirazSn) * 1000) : null,
    },
  });
  await audit("engine", "karar_uretildi", {
    code,
    parcel: parcel.id,
    outcome: i.outcome,
    yes: i.evaluation.vote.yesCount,
    basis: i.basis,
    simDate: i.simDate,
    evidenceHash,
  });
  return row;
}

/* ───────────────────────────── karar hattı ───────────────────────────── */

interface PipelineState {
  stopped: Set<string>;
  holds: Map<string, () => void>;
  running: Set<string>;
}
const g = globalThis as unknown as { __agrishieldPipeline?: PipelineState };
function ps(): PipelineState {
  if (!g.__agrishieldPipeline) g.__agrishieldPipeline = { stopped: new Set(), holds: new Map(), running: new Set() };
  return g.__agrishieldPipeline;
}

export function stopDecision(id: string): boolean {
  if (!ps().running.has(id)) return false;
  ps().stopped.add(id);
  return true;
}

/** Sahnede tutulan ödemeyi serbest bırakır (8. sahne ya da /api/payout). */
export function releasePayment(id: string): boolean {
  const r = ps().holds.get(id);
  if (!r) return false;
  ps().holds.delete(id);
  r();
  return true;
}

export function isPaymentHeld(id: string): boolean {
  return ps().holds.has(id);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function dataHash(obj: unknown): string {
  return sha256Hex0x(JSON.stringify(obj));
}

async function updateEvidence(id: string, patch: Partial<Evidence>) {
  const row = await db.decision.findUnique({ where: { id } });
  if (!row) return;
  const ev = JSON.parse(row.evidence) as Evidence;
  await db.decision.update({ where: { id }, data: { evidence: JSON.stringify({ ...ev, ...patch }) } });
}

export interface PipelineOptions {
  holdPayment: () => boolean;
  /** seed ve testlerde gecikmesiz */
  instant?: boolean;
}

export async function runPipeline(id: string, opts: PipelineOptions): Promise<Decision | null> {
  const st = ps();
  if (st.running.has(id)) return null;
  st.running.add(id);
  const lat: Record<string, number> = {};
  const tStart = Date.now();
  try {
    let row = await db.decision.findUniqueOrThrow({ where: { id } });
    const parcel = getParcel(row.parcelId)!;

    // 1) İtiraz penceresi — "otomatik ama kontrolsüz değil"
    if (row.status === "itiraz_penceresi" && row.windowEndsAt) {
      while (Date.now() < row.windowEndsAt.getTime()) {
        if (st.stopped.has(id)) {
          row = await db.decision.update({ where: { id }, data: { status: "durduruldu" } });
          await audit("operator", "karar_durduruldu", { code: row.code });
          publish("decision", { phase: "stopped", decision: toSummary(row), message: "Operatör itiraz penceresinde kararı durdurdu." });
          return row;
        }
        await sleep(150);
      }
      row = await db.decision.update({ where: { id }, data: { status: "kesinlesti" } });
      publish("decision", { phase: "finalized", decision: toSummary(row) });
    }
    lat.itiraz = Date.now() - tStart;

    // 2) Zincire mühür
    const ev = JSON.parse(row.evidence) as Evidence;
    const active = chain();
    publish("chain", { phase: "pending", code: row.code, mode: active.mode });
    const input = {
      decisionCode: row.code,
      parcelPseudoId: row.parcelId,
      season: SEASON.label,
      yesCount: row.yesCount,
      outcome: row.outcome as Outcome,
      amountTl: row.amountTl ?? 0,
      evidenceHash: row.evidenceHash,
      witnesses: { sat: row.witnessSat === "EVET", station: row.witnessStation === "EVET", meteo: row.witnessMeteo === "EVET" },
      dataHashes: { sat: dataHash(ev.witnesses.satellite), station: dataHash(ev.witnesses.station), meteo: dataHash(ev.witnesses.meteo) },
    };
    let res;
    try {
      res = await active.anchorDecision(input, opts.instant ? { delayMs: 0 } : undefined);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await audit("chain", "amoy_hatasi_mock_yedek", { code: row.code, error: msg.slice(0, 300) });
      publish("chain", { phase: "error", code: row.code, mode: active.mode, message: `Test ağı yanıt vermedi; taklit zincire düşüldü (${msg.slice(0, 80)})` });
      res = await mockChain().anchorDecision(input, opts.instant ? { delayMs: 0 } : undefined);
    }
    row = await db.decision.update({
      where: { id },
      data: { txHash: res.txHash, blockNumber: res.blockNumber, explorerUrl: res.explorerUrl, chainMode: res.mode },
    });
    await updateEvidence(id, { chain: { mode: res.mode, txHash: res.txHash, blockNumber: res.blockNumber, explorerUrl: res.explorerUrl } });
    lat.zincir = res.ms;
    publish("chain", { phase: "confirmed", code: row.code, block: res.block ?? undefined, txHash: res.txHash, explorerUrl: res.explorerUrl, mode: res.mode, ms: res.ms });
    await audit("chain", "karar_zincire_yazildi", { code: row.code, tx: res.txHash, block: res.blockNumber, mode: res.mode });

    // 3) Ödeme (yalnız ÖDE) — TL, FAST, IBAN. Kripto yok.
    let smsKind: SmsKind = row.outcome === "ODE" ? "odeme" : row.outcome === "GRI_BOLGE" ? "gri" : "bilgi";
    if (row.outcome === "ODE") {
      if (!opts.instant && opts.holdPayment()) {
        publish("payment", { phase: "held", code: row.code, amountTl: row.amountTl ?? 0, ibanMasked: IBAN_MASK, simulated: true });
        await new Promise<void>((resolve) => st.holds.set(id, resolve));
      }
      const tPay = Date.now();
      publish("payment", { phase: "pending", code: row.code, amountTl: row.amountTl ?? 0, ibanMasked: IBAN_MASK, simulated: true });
      const pay = await simulatePayout(row.code, row.amountTl ?? 0, opts.instant ? 0 : 1200);
      row = await db.decision.update({ where: { id }, data: { paymentRef: pay.refHash, paymentRefText: pay.paymentRefText } });
      publish("payment", {
        phase: "sent",
        code: row.code,
        amountTl: pay.amountTl,
        paymentRefText: pay.paymentRefText,
        refHash: pay.refHash,
        ibanMasked: IBAN_MASK,
        simulated: true,
        ms: pay.ms,
      });
      await audit("payment", "odeme_talimati_simulasyon", { code: row.code, ref: pay.paymentRefText, amountTl: pay.amountTl });
      let ref;
      try {
        ref = await chain().referencePayment(row.code, pay.refHash, opts.instant ? { delayMs: 0 } : undefined);
      } catch {
        ref = await mockChain().referencePayment(row.code, pay.refHash, opts.instant ? { delayMs: 0 } : undefined);
      }
      await updateEvidence(id, { payment: { refHash: pay.refHash, channel: "FAST", simulated: true } });
      publish("chain", { phase: "payment_referenced", code: row.code, block: ref.block ?? undefined, txHash: ref.txHash, explorerUrl: ref.explorerUrl, mode: ref.mode, ms: ref.ms });
      lat.odeme = Date.now() - tPay;
    }

    // 4) Bildirim
    const text = smsTextFor(smsKind, row.parcelId, row.code, row.amountTl ?? 0);
    const sms = await sendSms(text);
    smsKind = smsKind === "odeme" ? "odeme" : smsKind;
    lat.toplam = Date.now() - tStart;
    row = await db.decision.update({
      where: { id },
      data: { smsText: text, notifiedAt: new Date(), latencies: JSON.stringify(lat) },
    });
    publish("sms", { code: row.code, to: sms.to, text, mode: sms.mode, kind: smsKind });
    publish("decision", { phase: "finalized", decision: toSummary(row) });
    void parcel;
    return row;
  } catch (e) {
    console.error("[pipeline]", e);
    await audit("engine", "hat_hatasi", { id, error: e instanceof Error ? e.message : String(e) });
    return null;
  } finally {
    st.running.delete(id);
    st.stopped.delete(id);
    st.holds.delete(id);
  }
}

/* ───────────── tekil adımlar (API: /api/payout, /api/sms, /api/chain/anchor) ───────────── */

async function findDecision(idOrCode: string) {
  return (await db.decision.findUnique({ where: { id: idOrCode } })) ?? (await db.decision.findUnique({ where: { code: idOrCode.toUpperCase() } }));
}

async function waitFor<T>(fn: () => Promise<T | null>, ms = 8000): Promise<T | null> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await sleep(200);
  }
  return null;
}

export async function payoutNow(idOrCode: string) {
  const d = await findDecision(idOrCode);
  if (!d) return { error: "Karar bulunamadı" } as const;
  if (d.outcome !== "ODE") return { error: "Bu kararda ödeme onayı yok (sonuç: " + d.outcome + ")" } as const;
  if (d.status !== "kesinlesti") return { error: "Karar henüz kesinleşmedi (itiraz penceresi)" } as const;
  if (!d.paymentRefText) {
    if (releasePayment(d.id) || ps().running.has(d.id)) {
      // hat çalışıyor: ödeme adımının bitmesini bekle
      await waitFor(async () => {
        const r = await db.decision.findUnique({ where: { id: d.id } });
        return r?.paymentRefText ? r : null;
      });
    } else {
      // hat yoksa (ör. sunucu yeniden başladı) ödemeyi burada yap
      const pay = await simulatePayout(d.code, d.amountTl ?? 0);
      await db.decision.update({ where: { id: d.id }, data: { paymentRef: pay.refHash, paymentRefText: pay.paymentRefText } });
      publish("payment", { phase: "sent", code: d.code, amountTl: pay.amountTl, paymentRefText: pay.paymentRefText, refHash: pay.refHash, ibanMasked: IBAN_MASK, simulated: true, ms: pay.ms });
      const ref = await chain()
        .referencePayment(d.code, pay.refHash)
        .catch(() => mockChain().referencePayment(d.code, pay.refHash));
      await updateEvidence(d.id, { payment: { refHash: pay.refHash, channel: "FAST", simulated: true } });
      publish("chain", { phase: "payment_referenced", code: d.code, block: ref.block ?? undefined, txHash: ref.txHash, explorerUrl: ref.explorerUrl, mode: ref.mode, ms: ref.ms });
    }
  }
  const r = await db.decision.findUniqueOrThrow({ where: { id: d.id } });
  return { paymentRef: r.paymentRefText, paymentRefHash: r.paymentRef, amountTl: r.amountTl ?? 0, ibanMasked: IBAN_MASK, channel: "FAST", simulated: true } as const;
}

export async function smsNow(idOrCode: string) {
  const d = await findDecision(idOrCode);
  if (!d) return { error: "Karar bulunamadı" } as const;
  const kind: SmsKind = d.outcome === "ODE" ? "odeme" : d.outcome === "GRI_BOLGE" ? "gri" : "bilgi";
  const text = d.smsText ?? smsTextFor(kind, d.parcelId, d.code, d.amountTl ?? 0);
  const sms = await sendSms(text);
  if (!d.smsText) await db.decision.update({ where: { id: d.id }, data: { smsText: text, notifiedAt: new Date() } });
  publish("sms", { code: d.code, to: sms.to, text, mode: sms.mode, kind });
  return { text, to: sms.to, mode: sms.mode, simulated: sms.mode === "mock" } as const;
}

export async function anchorNow(idOrCode: string) {
  const d = await findDecision(idOrCode);
  if (!d) return { error: "Karar bulunamadı" } as const;
  if (!d.txHash) {
    await waitFor(async () => {
      const r = await db.decision.findUnique({ where: { id: d.id } });
      return r?.txHash ? r : null;
    }, ps().running.has(d.id) ? 10_000 : 10);
  }
  let r = await db.decision.findUniqueOrThrow({ where: { id: d.id } });
  if (!r.txHash) {
    const ev = JSON.parse(r.evidence) as Evidence;
    const res = await chain()
      .anchorDecision({
        decisionCode: r.code,
        parcelPseudoId: r.parcelId,
        season: SEASON.label,
        yesCount: r.yesCount,
        outcome: r.outcome as Outcome,
        amountTl: r.amountTl ?? 0,
        evidenceHash: r.evidenceHash,
        witnesses: { sat: r.witnessSat === "EVET", station: r.witnessStation === "EVET", meteo: r.witnessMeteo === "EVET" },
        dataHashes: { sat: dataHash(ev.witnesses.satellite), station: dataHash(ev.witnesses.station), meteo: dataHash(ev.witnesses.meteo) },
      })
      .catch(() => null);
    if (!res) return { error: "Zincire yazılamadı" } as const;
    r = await db.decision.update({ where: { id: d.id }, data: { txHash: res.txHash, blockNumber: res.blockNumber, explorerUrl: res.explorerUrl, chainMode: res.mode } });
    await updateEvidence(d.id, { chain: { mode: res.mode, txHash: res.txHash, blockNumber: res.blockNumber, explorerUrl: res.explorerUrl } });
    publish("chain", { phase: "confirmed", code: r.code, block: res.block ?? undefined, txHash: res.txHash, explorerUrl: res.explorerUrl, mode: res.mode, ms: res.ms });
  }
  return { txHash: r.txHash!, blockNumber: r.blockNumber ?? 0, explorerUrl: r.explorerUrl, mode: (r.chainMode ?? "mock") as "mock" | "amoy" } as const;
}

export async function recentDecisions(limit = 12): Promise<DecisionSummary[]> {
  const rows = await db.decision.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  return rows.map(toSummary);
}
