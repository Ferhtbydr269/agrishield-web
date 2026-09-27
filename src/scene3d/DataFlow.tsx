"use client";
/**
 * VERİ AKIŞI ŞEMASI (12.7) — sahnenin finali. Zemin soluklaşır, üstte akış katmanı belirir.
 *   İSTASYON ─LoRa─▶ GATEWAY ─internet─▶ BULUT/API ─▶ YAPAY ZEKÂ
 *   UYDU ──tarama──▶ BULUT/API · METEOROLOJİ ──▶ BULUT/API
 *   ÜÇ TANIK → OYLAMA HALKASI (2/3 dolunca yeşile döner) → AKILLI SÖZLEŞME (blok yığını) → BANKA/FAST → ÇİFTÇİ TELEFONU
 * Gecikme rozetleri gerçek ölçülen sürelerden gelir.
 * Performans (12.10, çizim çağrısı ≤ 120): kenarlar tek çizgi segmenti, paketler/düğümler/bloklar instanced → ~10 çağrı.
 */
import { Line } from "@react-three/drei";
import { Label3D } from "./labels";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { V3 } from "./layout";
import type { SceneLive } from "./useSceneLive";

const N: Record<string, { pos: V3; label: string; color: string }> = {
  station: { pos: [-46, 18, 30], label: "İSTASYON", color: "#b07c4f" },
  gateway: { pos: [-28, 18, 30], label: "GATEWAY", color: "#4aa3e8" },
  sat: { pos: [-28, 38, 12], label: "UYDU", color: "#4aa3e8" },
  meteo: { pos: [-10, 42, 6], label: "METEOROLOJİ", color: "#6cb6ee" },
  api: { pos: [-8, 26, 26], label: "BULUT / API", color: "#c9d6ce" },
  ai: { pos: [12, 26, 26], label: "YAPAY ZEKÂ (hakem)", color: "#8b7bd8" },
  vote: { pos: [30, 20, 22], label: "ÜÇ TANIK · OYLAMA", color: "#2f9e6b" },
  chain: { pos: [46, 18, 22], label: "AKILLI SÖZLEŞME", color: "#c9d6ce" },
  bank: { pos: [60, 18, 22], label: "BANKA / FAST", color: "#e0a526" },
  phone: { pos: [74, 18, 22], label: "ÇİFTÇİ TELEFONU", color: "#2f9e6b" },
};

const EDGES: [string, string, string?][] = [
  ["station", "gateway", "LoRa"],
  ["gateway", "api", "internet"],
  ["sat", "api", "tarama"],
  ["meteo", "api"],
  ["api", "ai"],
  ["ai", "vote"],
  ["vote", "chain"],
  ["chain", "bank"],
  ["bank", "phone"],
];

const BOX_NODES = ["station", "gateway", "sat", "api", "bank"] as const;
const PACKETS_PER_EDGE = 2;
const MAX_BLOCKS = 6;
const VCOL = { EVET: "#2f9e6b", HAYIR: "#e05a47", VERI_YOK: "#e0a526" } as const;

const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

/** Kenarlar boyunca akan paketler — tek InstancedMesh. */
function Packets({ active }: { active: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const ends = useMemo(() => EDGES.map(([f, t]) => [new THREE.Vector3(...N[f].pos), new THREE.Vector3(...N[t].pos)] as const), []);
  const count = EDGES.length * PACKETS_PER_EDGE;
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    EDGES.forEach(([f], e) => {
      for (let k = 0; k < PACKETS_PER_EDGE; k++) m.setColorAt(e * PACKETS_PER_EDGE + k, tmpColor.set(N[f].color));
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);
  useFrame((st) => {
    const m = ref.current;
    if (!m || !active) return;
    const time = st.clock.elapsedTime;
    ends.forEach(([a, b], e) => {
      for (let k = 0; k < PACKETS_PER_EDGE; k++) {
        const t = (time * 0.45 + k / PACKETS_PER_EDGE) % 1;
        dummy.position.lerpVectors(a, b, t);
        dummy.updateMatrix();
        m.setMatrixAt(e * PACKETS_PER_EDGE + k, dummy.matrix);
      }
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[0.45, 10, 8]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/** Aynı biçimli düğümler (kutular, bulut küreleri, yapay zekâ parçacıkları) — tek InstancedMesh. */
function Instances({ items, children, groupRef }: { items: { pos: V3; scale?: number; color: string; rot?: [number, number, number] }[]; children: React.ReactNode; groupRef?: React.RefObject<THREE.Group | null> }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    items.forEach((it, i) => {
      dummy.position.set(...it.pos);
      dummy.rotation.set(...(it.rot ?? [0, 0, 0]));
      dummy.scale.setScalar(it.scale ?? 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, tmpColor.set(it.color));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items]);
  const mesh = (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      {children}
    </instancedMesh>
  );
  return groupRef ? <group ref={groupRef}>{mesh}</group> : mesh;
}

export function DataFlow({ live, visible = true }: { live: React.RefObject<SceneLive>; visible?: boolean }) {
  const aiInner = useRef<THREE.Group>(null);
  const ring = useRef<THREE.InstancedMesh>(null);
  const blocksRef = useRef<THREE.InstancedMesh>(null);
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  const [ui, setUi] = useState<{ yes: number; outcome: string | null; lat: Record<string, number>; blocks: number }>({ yes: 0, outcome: null, lat: {}, blocks: 0 });
  const acc = useRef(0);
  const ringKey = useRef("");

  const segPoints = useMemo(() => EDGES.flatMap(([f, t]) => [N[f].pos, N[t].pos]), []);
  const boxes = useMemo(() => BOX_NODES.map((k) => ({ pos: N[k].pos, color: N[k].color })), []);
  const meteo = useMemo(
    () =>
      ([[-1.2, 0, 0, 1.4], [0.6, 0.4, 0, 1.8], [1.9, -0.1, 0, 1.2]] as const).map(([x, y, z, r]) => ({
        pos: [N.meteo.pos[0] + x, N.meteo.pos[1] + y, N.meteo.pos[2] + z] as V3,
        scale: r,
        color: "#9fcaeb",
      })),
    [],
  );
  const aiDots = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return { pos: [Math.cos(a) * 1.8, Math.sin(a * 2) * 1.2, Math.sin(a) * 1.8] as V3, color: "#d8d0ff" };
      }),
    [],
  );

  // oylama halkası: 3 yay, tek InstancedMesh (renkler tanık kararına göre)
  useLayoutEffect(() => {
    const m = ring.current;
    if (!m) return;
    for (let i = 0; i < 3; i++) {
      dummy.position.set(0, 0, 0);
      dummy.rotation.set(0, 0, (i * Math.PI * 2) / 3 + 0.08);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, tmpColor.set("#2a3c31"));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);

  // blok yığını: en üstteki (son) blok yeşil
  const blocks = Math.min(MAX_BLOCKS, Math.max(2, ui.blocks));
  useLayoutEffect(() => {
    const m = blocksRef.current;
    if (!m) return;
    for (let i = 0; i < MAX_BLOCKS; i++) {
      dummy.position.set(0, i * 1.25, 0);
      dummy.rotation.set(0, i * 0.25, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, tmpColor.set(i === blocks - 1 ? "#3ccf8e" : "#c9d6ce"));
    }
    m.count = blocks;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [blocks]);

  useFrame((_, dt) => {
    const l = live.current;
    if (!l || !visible) return;
    if (aiInner.current) {
      aiInner.current.rotation.y += dt * 0.8;
      aiInner.current.rotation.x += dt * 0.3;
    }
    const vs = [l.witnesses.sat, l.witnesses.station, l.witnesses.meteo];
    const key = vs.join("|");
    if (ring.current && key !== ringKey.current) {
      ringKey.current = key;
      vs.forEach((v, i) => ring.current!.setColorAt(i, tmpColor.set(v ? VCOL[v] : "#2a3c31")));
      if (ring.current.instanceColor) ring.current.instanceColor.needsUpdate = true;
    }
    const yes = vs.filter((v) => v === "EVET").length;
    if (glow.current) glow.current.opacity = THREE.MathUtils.damp(glow.current.opacity, yes >= 2 ? 0.55 : 0, 4, dt);
    acc.current += dt;
    if (acc.current > 0.3) {
      acc.current = 0;
      if (yes !== ui.yes || l.outcome !== ui.outcome || l.blocks !== ui.blocks || JSON.stringify(l.latencies) !== JSON.stringify(ui.lat)) setUi({ yes, outcome: l.outcome, lat: l.latencies, blocks: l.blocks });
    }
  });

  const fmt = (ms?: number) => (ms == null ? null : `${(ms / 1000).toFixed(1).replace(".", ",")} sn`);

  return (
    <group visible={visible}>
      {/* kenarlar: tek çizgi segmenti */}
      <Line points={segPoints} segments color="#c9d6ce" lineWidth={1.5} transparent opacity={0.55} />
      <Packets active={visible} />
      {EDGES.filter(([, , label]) => label).map(([f, t, label]) => {
        const a = N[f].pos;
        const b = N[t].pos;
        const mid: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 1.8, (a[2] + b[2]) / 2];
        return (
          <Label3D key={`${f}-${t}`} id={`edge-${f}-${t}`} position={mid} distanceFactor={80} z={15} interactive>
            <div hidden={!visible} className="pointer-events-none whitespace-nowrap font-mono text-[12px] text-dim">
              {label}
            </div>
          </Label3D>
        );
      })}

      {/* kutu düğümler */}
      <Instances items={boxes}>
        <boxGeometry args={[3, 3, 3]} />
        <meshStandardMaterial emissive="#ffffff" emissiveIntensity={0.06} />
      </Instances>
      {/* meteoroloji bulutu */}
      <Instances items={meteo}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial />
      </Instances>
      {/* yapay zekâ: yarı saydam küre + dönen parçacıklar */}
      <group position={N.ai.pos}>
        <mesh>
          <sphereGeometry args={[3.2, 24, 16]} />
          <meshStandardMaterial color="#8b7bd8" transparent opacity={0.35} emissive="#8b7bd8" emissiveIntensity={0.4} />
        </mesh>
        <Instances items={aiDots} groupRef={aiInner}>
          <sphereGeometry args={[0.35, 8, 6]} />
          <meshBasicMaterial />
        </Instances>
      </group>
      {/* oylama halkası */}
      <group position={N.vote.pos} rotation-x={Math.PI / 2}>
        <instancedMesh ref={ring} args={[undefined, undefined, 3]}>
          <torusGeometry args={[3, 0.55, 8, 24, (Math.PI * 2) / 3 - 0.16]} />
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
        <mesh>
          <torusGeometry args={[4.2, 0.18, 6, 48]} />
          <meshBasicMaterial ref={glow} color="#2f9e6b" transparent opacity={0} toneMapped={false} />
        </mesh>
      </group>
      {/* akıllı sözleşme: blok yığını */}
      <group position={[N.chain.pos[0], N.chain.pos[1] - 2.2, N.chain.pos[2]]}>
        <instancedMesh ref={blocksRef} args={[undefined, undefined, MAX_BLOCKS]}>
          <boxGeometry args={[2.2, 1.05, 2.2]} />
          <meshStandardMaterial emissive="#ffffff" emissiveIntensity={0.05} />
        </instancedMesh>
      </group>
      {/* çiftçi telefonu */}
      <mesh position={N.phone.pos}>
        <boxGeometry args={[2.2, 4, 0.35]} />
        <meshStandardMaterial color="#0b120e" emissive="#dff2e7" emissiveIntensity={0.25} />
      </mesh>

      {/* düğüm etiketleri + gecikme rozetleri */}
      {Object.entries(N).map(([k, n]) => (
        <Label3D key={k} id={`node-${k}`} position={[n.pos[0], n.pos[1] + (k === "chain" ? blocks * 1.25 + 0.5 : 4.6), n.pos[2]]} distanceFactor={80} z={18} interactive>
          <div hidden={!visible} className="pointer-events-none flex flex-col items-center gap-0.5">
            <div className="whitespace-nowrap rounded bg-bg/85 px-2 py-0.5 font-mono text-[13px] font-bold" style={{ color: n.color }}>
              {n.label}
            </div>
            {k === "vote" && (
              <div className={`whitespace-nowrap rounded px-2 py-0.5 font-display text-[16px] font-extrabold ${ui.yes >= 2 ? "bg-green text-bg" : "bg-surface-2 text-dim"}`}>
                {ui.yes}/3 {ui.outcome === "ODE" || ui.yes >= 2 ? "· ÖDE" : ui.outcome === "GRI_BOLGE" ? "· GRİ BÖLGE" : ""}
              </div>
            )}
            {k === "chain" && fmt(ui.lat.zincir) && <div className="whitespace-nowrap rounded bg-surface-2 px-1.5 font-mono text-[11px] text-dim">karar → zincir: {fmt(ui.lat.zincir)}</div>}
            {k === "bank" && fmt(ui.lat.odeme) && <div className="whitespace-nowrap rounded bg-surface-2 px-1.5 font-mono text-[11px] text-dim">ödeme: {fmt(ui.lat.odeme)} · SİMÜLASYON</div>}
            {k === "phone" && fmt(ui.lat.toplam) && <div className="whitespace-nowrap rounded bg-surface-2 px-1.5 font-mono text-[11px] text-dim">karar → SMS: {fmt(ui.lat.toplam)}</div>}
          </div>
        </Label3D>
      ))}
    </group>
  );
}
