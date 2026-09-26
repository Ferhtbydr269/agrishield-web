"use client";
/**
 * VERİ AKIŞI ŞEMASI (12.7) — sahnenin finali. Zemin soluklaşır, üstte akış katmanı belirir.
 *   İSTASYON ─LoRa─▶ GATEWAY ─internet─▶ BULUT/API ─▶ YAPAY ZEKÂ
 *   UYDU ──tarama──▶ BULUT/API · METEOROLOJİ ──▶ BULUT/API
 *   ÜÇ TANIK → OYLAMA HALKASI (2/3 dolunca yeşile döner) → AKILLI SÖZLEŞME (blok yığını) → BANKA/FAST → ÇİFTÇİ TELEFONU
 * Gecikme rozetleri gerçek ölçülen sürelerden gelir.
 */
import { Line } from "@react-three/drei";
import { Label3D } from "./labels";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
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

function Packets({ from, to, color, speed = 0.45, count = 2 }: { from: V3; to: V3; color: string; speed?: number; count?: number }) {
  const refs = useRef<THREE.Mesh[]>([]);
  const a = useMemo(() => new THREE.Vector3(...from), [from]);
  const b = useMemo(() => new THREE.Vector3(...to), [to]);
  useFrame((st) => {
    refs.current.forEach((m, i) => {
      if (!m) return;
      const t = (st.clock.elapsedTime * speed + i / count) % 1;
      m.position.lerpVectors(a, b, t);
    });
  });
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) refs.current[i] = m;
          }}
        >
          <sphereGeometry args={[0.45, 10, 8]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

const VCOL = { EVET: "#2f9e6b", HAYIR: "#e05a47", VERI_YOK: "#e0a526" } as const;

export function DataFlow({ live, visible = true }: { live: React.RefObject<SceneLive>; visible?: boolean }) {
  const aiInner = useRef<THREE.Group>(null);
  const ring = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  const [ui, setUi] = useState<{ yes: number; outcome: string | null; lat: Record<string, number>; blocks: number }>({ yes: 0, outcome: null, lat: {}, blocks: 0 });
  const acc = useRef(0);

  useFrame((_, dt) => {
    const l = live.current;
    if (!l) return;
    if (aiInner.current) {
      aiInner.current.rotation.y += dt * 0.8;
      aiInner.current.rotation.x += dt * 0.3;
    }
    const vs = [l.witnesses.sat, l.witnesses.station, l.witnesses.meteo];
    vs.forEach((v, i) => ring.current[i]?.color.set(v ? VCOL[v] : "#2a3c31"));
    const yes = vs.filter((v) => v === "EVET").length;
    if (glow.current) glow.current.opacity = THREE.MathUtils.damp(glow.current.opacity, yes >= 2 ? 0.55 : 0, 4, dt);
    acc.current += dt;
    if (acc.current > 0.3) {
      acc.current = 0;
      if (yes !== ui.yes || l.outcome !== ui.outcome || l.blocks !== ui.blocks || JSON.stringify(l.latencies) !== JSON.stringify(ui.lat)) setUi({ yes, outcome: l.outcome, lat: l.latencies, blocks: l.blocks });
    }
  });

  const fmt = (ms?: number) => (ms == null ? null : `${(ms / 1000).toFixed(1).replace(".", ",")} sn`);
  const blocks = Math.min(6, Math.max(2, ui.blocks));

  return (
    <group visible={visible}>
      {EDGES.map(([f, t, label]) => {
        const a = N[f].pos;
        const b = N[t].pos;
        const mid: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 1.8, (a[2] + b[2]) / 2];
        return (
          <group key={`${f}-${t}`}>
            <Line points={[a, b]} color="#c9d6ce" lineWidth={1.5} transparent opacity={0.55} />
            <Packets from={a} to={b} color={N[f].color} />
            {label && (
              <Label3D id={`edge-${f}-${t}`} position={mid} distanceFactor={80} z={15} interactive>
                <div hidden={!visible} className="pointer-events-none whitespace-nowrap font-mono text-[12px] text-dim">{label}</div>
              </Label3D>
            )}
          </group>
        );
      })}
      {Object.entries(N).map(([k, n]) => (
        <group key={k} position={n.pos}>
          {k === "ai" ? (
            <group>
              <mesh>
                <sphereGeometry args={[3.2, 24, 16]} />
                <meshStandardMaterial color="#8b7bd8" transparent opacity={0.35} emissive="#8b7bd8" emissiveIntensity={0.4} />
              </mesh>
              <group ref={aiInner}>
                {Array.from({ length: 7 }, (_, i) => {
                  const a = (i / 7) * Math.PI * 2;
                  return (
                    <mesh key={i} position={[Math.cos(a) * 1.8, Math.sin(a * 2) * 1.2, Math.sin(a) * 1.8]}>
                      <sphereGeometry args={[0.35, 8, 6]} />
                      <meshBasicMaterial color="#d8d0ff" />
                    </mesh>
                  );
                })}
              </group>
            </group>
          ) : k === "vote" ? (
            <group rotation-x={Math.PI / 2}>
              {[0, 1, 2].map((i) => (
                <mesh key={i} rotation-z={(i * Math.PI * 2) / 3 + 0.08}>
                  <torusGeometry args={[3, 0.55, 8, 24, (Math.PI * 2) / 3 - 0.16]} />
                  <meshBasicMaterial
                    ref={(m) => {
                      ring.current[i] = m;
                    }}
                    color="#2a3c31"
                    toneMapped={false}
                  />
                </mesh>
              ))}
              <mesh>
                <torusGeometry args={[4.2, 0.18, 6, 48]} />
                <meshBasicMaterial ref={glow} color="#2f9e6b" transparent opacity={0} toneMapped={false} />
              </mesh>
            </group>
          ) : k === "chain" ? (
            <group position={[0, -2.2, 0]}>
              {Array.from({ length: blocks }, (_, i) => (
                <mesh key={i} position={[0, i * 1.25, 0]} rotation-y={i * 0.25}>
                  <boxGeometry args={[2.2, 1.05, 2.2]} />
                  <meshStandardMaterial color={i === blocks - 1 ? "#2f9e6b" : "#c9d6ce"} emissive={i === blocks - 1 ? "#2f9e6b" : "#000"} emissiveIntensity={0.35} />
                </mesh>
              ))}
            </group>
          ) : k === "phone" ? (
            <mesh>
              <boxGeometry args={[2.2, 4, 0.35]} />
              <meshStandardMaterial color="#0b120e" emissive="#dff2e7" emissiveIntensity={0.25} />
            </mesh>
          ) : k === "meteo" ? (
            <group>
              {[[-1.2, 0, 0, 1.4], [0.6, 0.4, 0, 1.8], [1.9, -0.1, 0, 1.2]].map(([x, y, z, r], i) => (
                <mesh key={i} position={[x, y, z]}>
                  <sphereGeometry args={[r, 12, 10]} />
                  <meshStandardMaterial color="#9fcaeb" />
                </mesh>
              ))}
            </group>
          ) : (
            <mesh>
              <boxGeometry args={[3, 3, 3]} />
              <meshStandardMaterial color={n.color} emissive={n.color} emissiveIntensity={0.25} />
            </mesh>
          )}
          <Label3D id={`node-${k}`} position={[0, k === "chain" ? blocks * 1.25 + 0.5 : 4.6, 0]} distanceFactor={80} z={18} interactive>
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
        </group>
      ))}
    </group>
  );
}
