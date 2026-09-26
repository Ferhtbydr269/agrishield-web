/**
 * BLOKZİNCİR KATMANI (AGRISHIELD_PROMPT.md 9.2) — iki mod, aynı arayüz:
 *   CHAIN_MODE=amoy : ethers v6 ile Polygon Amoy test ağına yazar, explorerUrl döner.
 *   CHAIN_MODE=mock : yerel "zincir" (SHA-256 bağlı bloklar, artan blok no, 1,5 sn gecikme taklidi).
 *                     Arayüzde SİMÜLASYON rozeti + "gerçek testnet için CHAIN_MODE=amoy" notu.
 * Zincir parayı taşımaz: kuralı ve kanıtı korur. Kişisel veri yazılmaz.
 */
import { sha256Hex, sha256Hex0x } from "@/lib/sha256";
import type { ChainBlockView, ChainStatusView } from "@/lib/live-types";
import { config } from "./config";
import { db } from "./db";

export interface AnchorInput {
  decisionCode: string;
  parcelPseudoId: string;
  season: string;
  yesCount: number;
  outcome: "ODE" | "GRI_BOLGE" | "ODEME_YOK";
  amountTl: number;
  evidenceHash: string;
  witnesses: { sat: boolean; station: boolean; meteo: boolean };
  dataHashes: { sat: string; station: string; meteo: string };
}

export interface AnchorResult {
  mode: "mock" | "amoy";
  txHash: string;
  blockNumber: number;
  explorerUrl: string | null;
  block: ChainBlockView | null;
  ms: number;
}

export interface ChainAdapter {
  mode: "mock" | "amoy";
  anchorDecision(input: AnchorInput, opts?: { delayMs?: number }): Promise<AnchorResult>;
  referencePayment(decisionCode: string, paymentRefHash: string, opts?: { delayMs?: number }): Promise<AnchorResult>;
  status(): Promise<ChainStatusView>;
  blocks(limit?: number): Promise<ChainBlockView[]>;
}

export const decisionIdFor = (code: string) => sha256Hex0x(`agrishield:decision:${code}`);
export const seasonKeyFor = (season: string) => sha256Hex0x(`agrishield:season:${season}`);

const OUTCOME_CODE = { ODE: 1, GRI_BOLGE: 2, ODEME_YOK: 3 } as const;

/* ───────────────────────────── MockChain ───────────────────────────── */

function blockView(b: { number: number; hash: string; prevHash: string; ts: Date; kind: string; decisionCode: string | null; txHash: string; payload: string }): ChainBlockView {
  let summary = "";
  try {
    const p = JSON.parse(b.payload) as Record<string, unknown>;
    if (b.kind === "genesis") summary = "Başlangıç bloğu";
    else if (b.kind === "decision") summary = `${p.parcel} · ${p.yesCount}/3 EVET → ${p.outcome}`;
    else if (b.kind === "payment") summary = `${p.decisionCode} · banka referansının parmak izi`;
    else if (b.kind === "breaker") summary = `Devre kesici: ${p.reason}`;
  } catch {
    summary = b.kind;
  }
  return {
    number: b.number,
    hash: b.hash,
    prevHash: b.prevHash,
    ts: b.ts.getTime(),
    kind: b.kind,
    decisionCode: b.decisionCode,
    txHash: b.txHash,
    summary,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class MockChain implements ChainAdapter {
  mode = "mock" as const;
  private lock: Promise<unknown> = Promise.resolve();

  private async append(kind: string, decisionCode: string | null, payload: Record<string, unknown>, delayMs: number): Promise<AnchorResult> {
    const t0 = Date.now();
    // blok ekleme sıralı olsun (aynı anda iki karar gelirse numaralar çakışmasın)
    const run = this.lock.then(async () => {
      if (delayMs > 0) await sleep(delayMs);
      const last = await db.chainBlock.findFirst({ orderBy: { number: "desc" } });
      const genesis = last ?? (await this.genesis());
      const number = genesis.number + 1;
      const ts = new Date();
      const body = JSON.stringify(payload);
      const hash = `0x${sha256Hex(`${genesis.hash}|${number}|${ts.toISOString()}|${body}`)}`;
      const txHash = `mock:0x${sha256Hex(`tx|${hash}`)}`;
      const b = await db.chainBlock.create({ data: { number, hash, prevHash: genesis.hash, ts, kind, decisionCode, payload: body, txHash } });
      return blockView(b);
    });
    this.lock = run.catch(() => undefined);
    const block = await run;
    return { mode: "mock", txHash: block.txHash, blockNumber: block.number, explorerUrl: null, block, ms: Date.now() - t0 };
  }

  private async genesis() {
    const ts = new Date("2025-11-01T00:00:00+03:00");
    const payload = JSON.stringify({ network: "agrishield-mock", note: "Yerel taklit zincir — gerçek testnet için CHAIN_MODE=amoy" });
    const hash = `0x${sha256Hex(`genesis|${payload}`)}`;
    return db.chainBlock.upsert({
      where: { number: 0 },
      update: {},
      create: { number: 0, hash, prevHash: `0x${"0".repeat(64)}`, ts, kind: "genesis", decisionCode: null, payload, txHash: `mock:0x${sha256Hex(`tx|${hash}`)}` },
    });
  }

  anchorDecision(i: AnchorInput, opts?: { delayMs?: number }) {
    return this.append(
      "decision",
      i.decisionCode,
      {
        decisionId: decisionIdFor(i.decisionCode),
        decisionCode: i.decisionCode,
        parcel: i.parcelPseudoId,
        season: i.season,
        witnesses: i.witnesses,
        dataHashes: i.dataHashes,
        yesCount: i.yesCount,
        outcome: i.outcome,
        amountTl: i.outcome === "ODE" ? i.amountTl : 0,
        evidenceHash: i.evidenceHash,
      },
      opts?.delayMs ?? 1500,
    );
  }

  referencePayment(decisionCode: string, paymentRefHash: string, opts?: { delayMs?: number }) {
    return this.append("payment", decisionCode, { decisionId: decisionIdFor(decisionCode), decisionCode, paymentRefHash }, opts?.delayMs ?? 900);
  }

  async breaker(reason: string) {
    return this.append("breaker", null, { reason }, 300);
  }

  async status(): Promise<ChainStatusView> {
    const last = await db.chainBlock.findFirst({ orderBy: { number: "desc" } });
    return { mode: "mock", network: "Yerel taklit zincir (SHA-256)", contract: null, height: last?.number ?? 0, lastTx: last?.txHash ?? null, balance: null };
  }

  async blocks(limit = 12): Promise<ChainBlockView[]> {
    const rows = await db.chainBlock.findMany({ orderBy: { number: "desc" }, take: limit });
    return rows.map(blockView);
  }

  /** Zincir bütünlüğü: her bloğun prevHash'i bir öncekinin hash'i mi? */
  async verify(): Promise<{ ok: boolean; checked: number; brokenAt?: number }> {
    const rows = await db.chainBlock.findMany({ orderBy: { number: "asc" } });
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1];
      const b = rows[i];
      const expect = `0x${sha256Hex(`${prev.hash}|${b.number}|${b.ts.toISOString()}|${b.payload}`)}`;
      if (b.prevHash !== prev.hash || b.hash !== expect) return { ok: false, checked: i, brokenAt: b.number };
    }
    return { ok: true, checked: rows.length };
  }
}

/* ───────────────────────────── AmoyChain ───────────────────────────── */

class AmoyChain implements ChainAdapter {
  mode = "amoy" as const;
  private contractPromise: Promise<import("ethers").Contract> | null = null;
  private lastTx: string | null = null;
  private recent: ChainBlockView[] = [];

  private async contract() {
    if (!this.contractPromise) {
      this.contractPromise = (async () => {
        const { ethers } = await import("ethers");
        const abi = (await import("./abi/AgriShieldPolicy.json")).abi;
        if (!config.amoyPrivateKey || !config.contractAddress) throw new Error("AMOY_PRIVATE_KEY ve CONTRACT_ADDRESS gerekli");
        const provider = new ethers.JsonRpcProvider(config.amoyRpcUrl, 80002);
        const wallet = new ethers.NonceManager(new ethers.Wallet(config.amoyPrivateKey, provider));
        return new ethers.Contract(config.contractAddress, abi, wallet);
      })();
    }
    return this.contractPromise;
  }

  private explorer(tx: string) {
    return `https://amoy.polygonscan.com/tx/${tx}`;
  }

  async anchorDecision(i: AnchorInput): Promise<AnchorResult> {
    const t0 = Date.now();
    const c = await this.contract();
    const id = decisionIdFor(i.decisionCode);
    // İşlemler sırayla gönderilir (nonce yöneticisi), sadece son onay beklenir → sahnede birkaç saniye.
    await c.openCase(id, i.parcelPseudoId, seasonKeyFor(i.season), i.outcome === "ODE" ? i.amountTl : 0);
    await c.submitWitness(id, 0, i.witnesses.sat, i.dataHashes.sat);
    await c.submitWitness(id, 1, i.witnesses.station, i.dataHashes.station);
    await c.submitWitness(id, 2, i.witnesses.meteo, i.dataHashes.meteo);
    const tx = await c.finalize(id, i.evidenceHash);
    const rc = await tx.wait(1);
    this.lastTx = tx.hash;
    const block: ChainBlockView = {
      number: rc.blockNumber,
      hash: rc.blockHash,
      prevHash: "",
      ts: Date.now(),
      kind: "decision",
      decisionCode: i.decisionCode,
      txHash: tx.hash,
      summary: `${i.parcelPseudoId} · ${i.yesCount}/3 EVET → ${i.outcome}`,
    };
    this.recent = [block, ...this.recent].slice(0, 12);
    return { mode: "amoy", txHash: tx.hash, blockNumber: rc.blockNumber, explorerUrl: this.explorer(tx.hash), block, ms: Date.now() - t0 };
  }

  async referencePayment(decisionCode: string, paymentRefHash: string): Promise<AnchorResult> {
    const t0 = Date.now();
    const c = await this.contract();
    const tx = await c.referencePayment(decisionIdFor(decisionCode), paymentRefHash);
    const rc = await tx.wait(1);
    this.lastTx = tx.hash;
    const block: ChainBlockView = {
      number: rc.blockNumber,
      hash: rc.blockHash,
      prevHash: "",
      ts: Date.now(),
      kind: "payment",
      decisionCode,
      txHash: tx.hash,
      summary: `${decisionCode} · banka referansının parmak izi`,
    };
    this.recent = [block, ...this.recent].slice(0, 12);
    return { mode: "amoy", txHash: tx.hash, blockNumber: rc.blockNumber, explorerUrl: this.explorer(tx.hash), block, ms: Date.now() - t0 };
  }

  async status(): Promise<ChainStatusView> {
    try {
      const { ethers } = await import("ethers");
      const c = await this.contract();
      const runner = c.runner as import("ethers").NonceManager;
      const provider = runner.provider!;
      const [height, bal] = await Promise.all([provider.getBlockNumber(), provider.getBalance(await runner.getAddress())]);
      return { mode: "amoy", network: "Polygon Amoy (chainId 80002)", contract: config.contractAddress, height, lastTx: this.lastTx, balance: `${Number(ethers.formatEther(bal)).toFixed(4)} POL` };
    } catch (e) {
      return { mode: "amoy", network: `Polygon Amoy — bağlantı yok (${e instanceof Error ? e.message.slice(0, 60) : "?"})`, contract: config.contractAddress || null, height: 0, lastTx: this.lastTx, balance: null };
    }
  }

  async blocks(): Promise<ChainBlockView[]> {
    return this.recent;
  }
}

/* ───────────────────────────── seçim ───────────────────────────── */

const g = globalThis as unknown as { __agrishieldChain?: { mock: MockChain; amoy: AmoyChain | null } };

function holders() {
  if (!g.__agrishieldChain) g.__agrishieldChain = { mock: new MockChain(), amoy: null };
  return g.__agrishieldChain;
}

export function mockChain(): MockChain {
  return holders().mock;
}

/** Aktif zincir. Amoy seçili ama yapılandırma eksikse sessizce mock'a düşer (durum sayfası sarı gösterir). */
export function chain(): ChainAdapter {
  const h = holders();
  if (config.chainMode === "amoy" && config.amoyPrivateKey && config.contractAddress) {
    if (!h.amoy) h.amoy = new AmoyChain();
    return h.amoy;
  }
  return h.mock;
}

export function chainFallbackReason(): string | null {
  if (config.chainModeRequested !== "amoy") return null;
  if (config.offline) return "OFFLINE=1 olduğu için taklit zincir kullanılıyor.";
  if (!config.amoyPrivateKey || !config.contractAddress) return "AMOY_PRIVATE_KEY / CONTRACT_ADDRESS eksik; taklit zincire düşüldü.";
  return null;
}

export { OUTCOME_CODE };
