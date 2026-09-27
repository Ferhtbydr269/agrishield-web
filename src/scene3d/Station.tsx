"use client";
/**
 * YER İSTASYONU — donanım ikizi, parça parça (AGRISHIELD_PROMPT.md 12.4). Her parça ayrı group + hotspot.
 * Hover'da parça vurgulanır, tıklanınca parça kartı açılır. Patlatılmış görünümde parçalar kendi yönlerinde
 * 0,6 m'ye kadar ayrılır; kutunun kapağı açılır. Kesit modunda toprak profili görünür.
 */
import { Line } from "@react-three/drei";
import { Label3D } from "./labels";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CUT, DEPTH_EXAG, STATION_POS, type V3 } from "./layout";
import { STATION_HOTSPOTS } from "./hotspots";
import type { SceneLive } from "./useSceneLive";

const ALU = "#aeb7b3";
const HL = "#e0a526";

export interface StationProps {
  live: React.RefObject<SceneLive>;
  explode: number;
  labels: boolean;
  cut: boolean;
  liveSoil: boolean;
  hover: string | null;
  selected: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  showHotspots: boolean;
  windOn?: boolean;
  /** uzak görünümde istasyon işaretine tıklanınca yakın plana geç */
  onZoom?: () => void;
  farMarker?: boolean;
}

const EXPLODE_DIR: Record<string, V3> = {
  H2: [0, 0.5, -0.8],
  H3: [0.35, 0.7, 0],
  H4: [-0.9, 0.2, 0],
  H5: [0, 0.55, 0.8],
  H6: [0.9, 0.1, 0],
  H7: [0, 0, 0.9],
  H10: [-0.7, -0.1, 0.4],
};

function offset(id: string, e: number): V3 {
  const d = EXPLODE_DIR[id];
  if (!d) return [0, 0, 0];
  const len = Math.hypot(...d);
  const k = (0.6 * e) / len;
  return [d[0] * k, d[1] * k, d[2] * k];
}

/** Etkileşimli parça grubu */
function Part({ id, e, hover, selected, onHover, onSelect, children }: { id: string; e: number; hover: string | null; selected: string | null; onHover: (id: string | null) => void; onSelect: (id: string) => void; children: (hl: boolean) => React.ReactNode }) {
  const o = offset(id, e);
  const hl = hover === id || selected === id;
  return (
    <group
      position={o}
      onPointerOver={(ev: ThreeEvent<PointerEvent>) => {
        ev.stopPropagation();
        onHover(id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = "";
      }}
      onClick={(ev: ThreeEvent<MouseEvent>) => {
        ev.stopPropagation();
        onSelect(id);
      }}
    >
      {children(hl)}
    </group>
  );
}

const std = (color: string, hl: boolean, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => ({
  color,
  emissive: hl ? HL : "#000000",
  emissiveIntensity: hl ? 0.45 : 0,
  roughness: 0.55,
  metalness: 0.05,
  ...extra,
});

export function moistureColor(m: number, out = new THREE.Color()) {
  const t = THREE.MathUtils.clamp((m - 5) / 33, 0, 1);
  return out.set("#dcc9a1").lerp(new THREE.Color("#3f2a1b"), t);
}

export function Station(p: StationProps) {
  const { live, explode: e } = p;
  const led = useRef<THREE.MeshStandardMaterial>(null);
  const halo = useRef<THREE.SpriteMaterial>(null);
  const cups = useRef<THREE.Group>(null);
  const bucket = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);
  const panelMat = useRef<THREE.MeshStandardMaterial>(null);
  const rings = useRef<THREE.Mesh[]>([]);
  const battBar = useRef<THREE.Mesh>(null);
  const [rainLabel, setRainLabel] = useState("0,0 mm");
  const [tempLabel, setTempLabel] = useState({ t: 14, hot: false });
  const state = useRef({ lastReading: 0, blinkT: 99, ringT: 99, tipT: 99, tipDir: 1, lastDay: 0, rainAcc: 0, labelT: 0 });

  const cable1 = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 2.45, -0.2), new THREE.Vector3(0.06, 2.0, -0.06), new THREE.Vector3(0.06, 1.45, 0.06)]), 16, 0.008, 5), []);
  const cable2 = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.05, 1.2, 0.1), new THREE.Vector3(0.12, 0.6, 0.12), new THREE.Vector3(0.2, 0.02, 0.3)]), 16, 0.008, 5), []);
  const cable3 = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.05, 1.22, 0.1), new THREE.Vector3(-0.15, 0.8, 0.1), new THREE.Vector3(-0.2, 0.6, 0.06)]), 12, 0.007, 5), []);
  // Çizim çağrısı bütçesi (≤120): aynı malzemeli küçük parçalar tek geometride birleştirilir
  const cables = useMemo(() => mergeGeometries([cable1, cable2, cable3])!, [cable1, cable2, cable3]);
  const shield = useMemo(
    () =>
      mergeGeometries(
        Array.from({ length: 6 }, (_, i) => new THREE.CylinderGeometry(0.07, 0.1, 0.024, 16, 1, true).translate(0, i * 0.036, 0)),
      )!,
    [],
  );
  const cupArms = useMemo(
    () =>
      mergeGeometries(
        [0, 1, 2].map((i) => new THREE.CylinderGeometry(0.005, 0.005, 0.14, 5).rotateZ(Math.PI / 2).translate(0.07, 0, 0).rotateY((i * Math.PI * 2) / 3)),
      )!,
    [],
  );
  const cupShells = useMemo(
    () =>
      mergeGeometries(
        [0, 1, 2].map((i) => new THREE.SphereGeometry(0.035, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).translate(0.14, 0, 0).rotateY((i * Math.PI * 2) / 3)),
      )!,
    [],
  );

  useFrame((st, dt) => {
    const l = live.current;
    if (!l) return;
    const s = state.current;
    const t = st.clock.elapsedTime;
    // ölçüm geldi → LED bir kez yeşil, anten 3 halka
    if (l.readingTick !== s.lastReading) {
      s.lastReading = l.readingTick;
      s.blinkT = 0;
      s.ringT = 0;
    }
    s.blinkT += dt;
    s.ringT += dt;
    // LED: iletişim yoksa kırmızı nefes, şüpheli/kurcalama → turuncu hızlı, ölçümde yeşil
    if (led.current && halo.current) {
      let color = "#2f9e6b";
      let intensity = 0.25;
      if (l.deviceStatus === "sessiz") {
        color = "#e05a47";
        intensity = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2.2));
      } else if (l.flags > 0) {
        color = "#f08a24";
        intensity = Math.sin(t * 38) > 0 ? 1.6 : 0.15;
      } else if (s.blinkT < 0.28) {
        intensity = 2.2;
      }
      led.current.emissive.set(color);
      led.current.color.set(color);
      led.current.emissiveIntensity = intensity;
      halo.current.color.set(color);
      halo.current.opacity = Math.min(1, intensity * 0.45);
    }
    // LoRa halkaları: genişleyip sönen 3 halka
    rings.current.forEach((r, i) => {
      if (!r) return;
      const k = (s.ringT - i * 0.22) / 1.1;
      const on = k >= 0 && k <= 1;
      r.visible = on;
      if (on) {
        r.scale.setScalar(1 + k * 9);
        (r.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k);
      }
    });
    // anemometre: dönme hızı = rüzgâr × 0,9 rad/s; durgun havada durur
    const wind = p.windOn === false ? 0 : p.liveSoil && l.deviceWind != null ? l.deviceWind : l.wind;
    if (cups.current) cups.current.rotation.y += wind * 0.9 * dt;
    // yağış ölçer: yağışlı gün geçişinde kova devrilir, sayaç artar
    if (l.dayTick !== s.lastDay) {
      s.lastDay = l.dayTick;
      if (l.rainToday > 0.1) {
        s.tipT = 0;
        s.tipDir *= -1;
        s.rainAcc = l.rainToday;
      } else s.rainAcc = 0;
    }
    s.tipT += dt;
    if (bucket.current) {
      const target = s.tipDir * 0.35;
      const k = Math.min(1, s.tipT / 0.25);
      bucket.current.rotation.z = THREE.MathUtils.lerp(-target, target, k);
    }
    // kapak: patlatılmış görünümde açılır
    if (lid.current) lid.current.rotation.y = THREE.MathUtils.damp(lid.current.rotation.y, -e * 1.7, 5, dt);
    // güneş paneli parıltısı (gündüz)
    if (panelMat.current) panelMat.current.emissiveIntensity = p.hover === "H2" || p.selected === "H2" ? 0.45 : 0.08 + 0.12 * (0.5 + 0.5 * Math.sin(t * 1.3));
    if (battBar.current) battBar.current.scale.x = THREE.MathUtils.clamp((l.batteryV - 3.3) / 0.9, 0.05, 1);
    s.labelT += dt;
    if (s.labelT > 0.5) {
      s.labelT = 0;
      const rl = `${s.rainAcc.toFixed(1).replace(".", ",")} mm`;
      if (rl !== rainLabel) setRainLabel(rl);
      const tt = Math.round(l.tempC);
      if (tt !== tempLabel.t) setTempLabel({ t: tt, hot: tt >= 28 });
    }
  });

  const h = (id: string) => ({ id, e, hover: p.hover, selected: p.selected, onHover: p.onHover, onSelect: p.onSelect });

  return (
    <group position={STATION_POS}>
      {/* temel */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[0.18, 0.2, 0.12, 16]} />
        <meshStandardMaterial color="#8c8a82" roughness={0.9} />
      </mesh>

      {/* H1 direk */}
      <Part {...h("H1")}>
        {(hl) => (
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 3.0, 12]} />
            <meshStandardMaterial {...std(ALU, hl, { metalness: 0.15, roughness: 0.45 })} />
          </mesh>
        )}
      </Part>

      {/* H2 güneş paneli (25° eğimli, güneye bakar) */}
      <Part {...h("H2")}>
        {(hl) => (
          <group>
            <mesh position={[0, 2.5, -0.16]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.012, 0.012, 0.3, 6]} />
              <meshStandardMaterial color={ALU} metalness={0.15} />
            </mesh>
            <mesh position={[0, 2.58, -0.34]} rotation-x={-2.007} castShadow>
              <boxGeometry args={[0.6, 0.4, 0.03]} />
              <meshStandardMaterial ref={panelMat} {...std("#1b2e5a", false, { metalness: 0.4, roughness: 0.25 })} emissive={hl ? HL : "#4aa3e8"} emissiveIntensity={0.1} />
            </mesh>
            <mesh position={[0, 2.585, -0.34]} rotation-x={-2.007}>
              <boxGeometry args={[0.62, 0.42, 0.02]} />
              <meshStandardMaterial color="#c9d6ce" metalness={0.5} />
            </mesh>
          </group>
        )}
      </Part>

      {/* H3 LoRa anteni + yayılan halkalar */}
      <Part {...h("H3")}>
        {(hl) => (
          <group>
            <mesh position={[0.1, 3.08, 0]} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.01, 0.01, 0.2, 6]} />
              <meshStandardMaterial color={ALU} />
            </mesh>
            <mesh position={[0.18, 3.35, 0]} castShadow>
              <cylinderGeometry args={[0.012, 0.016, 0.6, 8]} />
              <meshStandardMaterial {...std("#2b2f2d", hl)} />
            </mesh>
            <mesh position={[0.18, 3.67, 0]}>
              <sphereGeometry args={[0.03, 12, 8]} />
              <meshStandardMaterial {...std("#e05a47", hl)} />
            </mesh>
            {[0, 1, 2].map((i) => (
              <mesh
                key={i}
                ref={(m) => {
                  if (m) rings.current[i] = m;
                }}
                position={[0.18, 3.67, 0]}
                visible={false}
              >
                <torusGeometry args={[0.08, 0.006, 6, 32]} />
                <meshBasicMaterial color="#4aa3e8" transparent opacity={0} depthWrite={false} />
              </mesh>
            ))}
          </group>
        )}
      </Part>

      {/* H4 yağış ölçer: huni + iç tahterevalli */}
      <Part {...h("H4")}>
        {(hl) => (
          <group position={[-0.62, 2.1, 0.1]}>
            <mesh position={[0.31, 0, -0.1]} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.012, 0.012, 0.62, 6]} />
              <meshStandardMaterial color={ALU} />
            </mesh>
            <mesh position={[0, 0.16, 0]}>
              <cylinderGeometry args={[0.1, 0.055, 0.12, 20, 1, true]} />
              <meshStandardMaterial {...std("#dfe3dd", hl, { side: THREE.DoubleSide })} />
            </mesh>
            <mesh position={[0, 0.0, 0]}>
              <cylinderGeometry args={[0.065, 0.065, 0.22, 16, 1, true]} />
              <meshStandardMaterial {...std("#dfe3dd", hl, { side: THREE.DoubleSide, transparent: true, opacity: e > 0.05 ? 0.25 : 0.95 })} />
            </mesh>
            <group ref={bucket} position={[0, -0.02, 0]}>
              <mesh position={[-0.028, 0.012, 0]}>
                <boxGeometry args={[0.05, 0.02, 0.03]} />
                <meshStandardMaterial {...std("#2f9e6b", hl)} />
              </mesh>
              <mesh position={[0.028, 0.012, 0]}>
                <boxGeometry args={[0.05, 0.02, 0.03]} />
                <meshStandardMaterial {...std("#4aa3e8", hl)} />
              </mesh>
              <mesh>
                <boxGeometry args={[0.012, 0.012, 0.04]} />
                <meshStandardMaterial color="#555" />
              </mesh>
            </group>
            <Label3D id="rain" position={[0, 0.34, 0]} distanceFactor={6} z={20} interactive>
              <div className={p.labels && p.showHotspots ? "pointer-events-none whitespace-nowrap rounded bg-bg/85 px-1.5 py-0.5 font-mono text-[11px] text-sky-fg" : "hidden"}>bugün {rainLabel}</div>
            </Label3D>
          </group>
        )}
      </Part>

      {/* H5 anemometre */}
      <Part {...h("H5")}>
        {(hl) => (
          <group position={[0, 3.0, 0.32]}>
            <mesh position={[0, -0.02, -0.16]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.01, 0.01, 0.32, 6]} />
              <meshStandardMaterial color={ALU} />
            </mesh>
            <mesh position={[0, 0.06, 0]}>
              <cylinderGeometry args={[0.01, 0.01, 0.16, 6]} />
              <meshStandardMaterial color={ALU} />
            </mesh>
            <group ref={cups} position={[0, 0.14, 0]}>
              <mesh geometry={cupArms}>
                <meshStandardMaterial {...std(ALU, hl)} />
              </mesh>
              <mesh geometry={cupShells}>
                <meshStandardMaterial {...std("#f2f7f3", hl, { side: THREE.DoubleSide })} />
              </mesh>
            </group>
          </group>
        )}
      </Part>

      {/* H6 radyasyon kalkanı (6 kesik koni) */}
      <Part {...h("H6")}>
        {(hl) => (
          <group position={[0.62, 1.8, 0]}>
            <mesh position={[-0.31, 0.1, 0]} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.012, 0.012, 0.62, 6]} />
              <meshStandardMaterial color={ALU} />
            </mesh>
            <mesh geometry={shield} castShadow>
              <meshStandardMaterial {...std("#f4f5f0", hl, { side: THREE.DoubleSide })} />
            </mesh>
            <Label3D id="temp" position={[0.16, 0.12, 0]} distanceFactor={6} z={20} interactive>
              <div className={p.labels && p.showHotspots ? `pointer-events-none whitespace-nowrap rounded bg-bg/85 px-1.5 py-0.5 font-mono text-[11px] ${tempLabel.hot ? "text-red-fg" : "text-text"}` : "hidden"}>{tempLabel.t} °C</div>
            </Label3D>
          </group>
        )}
      </Part>

      {/* H7 elektronik kutu (IP65) + kapak + içindeki kartlar; H8 LED kapakta */}
      <Part {...h("H7")}>
        {(hl) => (
          <group position={[0, 1.28, 0.1]}>
            <mesh castShadow>
              <boxGeometry args={[0.22, 0.16, 0.09]} />
              <meshStandardMaterial {...std("#d8dcd6", hl)} />
            </mesh>
            {/* kartlar (kapak açılınca görünür) */}
            <mesh position={[-0.035, 0.01, 0.03]} visible={e > 0.02}>
              <boxGeometry args={[0.1, 0.07, 0.006]} />
              <meshStandardMaterial color="#2f9e6b" emissive="#2f9e6b" emissiveIntensity={0.15} />
            </mesh>
            <mesh position={[0.055, -0.03, 0.028]} visible={e > 0.02}>
              <boxGeometry args={[0.07, 0.05, 0.02]} />
              <meshStandardMaterial color="#e0a526" />
            </mesh>
            <group ref={lid} position={[-0.11, 0, 0.047]}>
              <mesh position={[0.11, 0, 0.004]}>
                <boxGeometry args={[0.22, 0.16, 0.008]} />
                <meshStandardMaterial {...std("#e6e9e3", hl)} />
              </mesh>
              <mesh position={[0.11, 0.072, 0.009]}>
                <boxGeometry args={[0.2, 0.004, 0.002]} />
                <meshStandardMaterial color="#9aa29c" />
              </mesh>
              {/* H8 LED */}
              <mesh
                position={[0.18, -0.055, 0.012]}
                onPointerOver={(ev) => {
                  ev.stopPropagation();
                  p.onHover("H8");
                }}
                onClick={(ev) => {
                  ev.stopPropagation();
                  p.onSelect("H8");
                }}
              >
                <sphereGeometry args={[0.015, 10, 8]} />
                <meshStandardMaterial ref={led} color="#2f9e6b" emissive="#2f9e6b" emissiveIntensity={0.3} toneMapped={false} />
              </mesh>
              <sprite position={[0.18, -0.055, 0.02]} scale={[0.14, 0.14, 0.14]}>
                <spriteMaterial ref={halo} color="#2f9e6b" transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} />
              </sprite>
            </group>
          </group>
        )}
      </Part>

      {/* H10 batarya + kablolar */}
      <Part {...h("H10")}>
        {(hl) => (
          <group>
            <mesh position={[-0.2, 0.55, 0.06]}>
              <boxGeometry args={[0.12, 0.08, 0.06]} />
              <meshStandardMaterial {...std("#39413c", hl)} />
            </mesh>
            <mesh position={[-0.2, 0.55, 0.0915]}>
              <boxGeometry args={[0.1, 0.018, 0.002]} />
              <meshBasicMaterial color="#1b2c21" />
            </mesh>
            <mesh ref={battBar} position={[-0.2, 0.55, 0.093]}>
              <boxGeometry args={[0.1, 0.014, 0.002]} />
              <meshBasicMaterial color="#2f9e6b" />
            </mesh>
            <mesh geometry={cables}>
              <meshStandardMaterial {...std("#1d1f1e", hl)} />
            </mesh>
          </group>
        )}
      </Part>

      {/* patlatılmış görünüm: ölçü çizgileri + parça adları (teknik çizim hissi) */}
      {STATION_HOTSPOTS.filter((x) => EXPLODE_DIR[x.id]).map((x) => {
        const o = offset(x.id, e);
        const base = x.local!;
        const to: V3 = [base[0] + o[0], base[1] + o[1], base[2] + o[2]];
        return (
          <group key={x.id}>
            <Line points={[base, to]} visible={e > 0.02} color="#c9d6ce" lineWidth={1} dashed dashSize={0.04} gapSize={0.03} transparent opacity={e > 0.25 ? 0.8 : 0} />
            <Label3D id={`exp-${x.id}`} position={to} distanceFactor={7} z={20} interactive>
              <div className={e > 0.25 && p.showHotspots ? "pointer-events-none -translate-y-[14px] translate-x-[calc(50%+16px)] whitespace-nowrap rounded bg-bg/70 px-1 font-mono text-[11px] uppercase tracking-wider text-chain-fg" : "hidden"}>
                {x.id} · {x.name}
              </div>
            </Label3D>
          </group>
        );
      })}

      {/* uzak görünüm işareti */}
      <Label3D id="station-far" position={[0, 4.4, 0]} visible={Boolean(p.farMarker)} z={12} interactive>
        <button
          type="button"
          onClick={() => p.onZoom?.()}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-soil/70 bg-bg/85 px-2.5 py-1 font-mono text-[12px] font-bold text-soil-fg shadow-lg hover:bg-soil hover:text-bg"
        >
          <span className="size-2 rounded-full bg-soil pulse-dot" aria-hidden /> İstasyon IST-SVK-01 · yakından bak
        </button>
      </Label3D>

      {/* H9 toprak kesiti + problar (kalıcı, kesit kapalıyken gizli) */}
      <SoilProfile visible={p.cut} live={live} liveSoil={p.liveSoil} labels={p.labels} hl={p.hover === "H9" || p.selected === "H9"} onHover={p.onHover} onSelect={p.onSelect} />

      {/* hotspot'lar (kalıcı; yakın presetlerde görünür) */}
      {STATION_HOTSPOTS.map((x) => {
        const o = offset(x.id, e);
        const pos: V3 = x.id === "H9" ? [0.35, -0.35, CUT.z0 - STATION_POS[2] + 0.45] : [x.local![0] + o[0], x.local![1] + o[1], x.local![2] + o[2]];
        const active = p.hover === x.id || p.selected === x.id;
        const show = p.showHotspots && (p.cut || x.id !== "H9");
        return (
          <Label3D key={x.id} id={`hs-${x.id}`} position={pos} distanceFactor={5} z={30} interactive>
            <button
              type="button"
              onMouseEnter={() => p.onHover(x.id)}
              onMouseLeave={() => p.onHover(null)}
              onClick={() => p.onSelect(x.id)}
              className={
                show
                  ? `group flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[11px] font-bold shadow-lg transition-colors ${active ? "border-wheat bg-wheat text-[#1a1305]" : "border-wheat/60 bg-bg/85 text-wheat-fg hover:bg-wheat hover:text-[#1a1305]"}`
                  : "hidden"
              }
              aria-label={`${x.id}: ${x.name}`}
              tabIndex={show ? 0 : -1}
            >
              <span aria-hidden>+</span>
              <span className={active ? "inline" : "hidden group-hover:inline"}>{x.name}</span>
            </button>
          </Label3D>
        );
      })}
    </group>
  );
}

/* ───────────── toprak profili (kesit) ───────────── */

function SoilProfile({ visible, live, liveSoil, labels: labelsIn, hl, onHover, onSelect }: { visible: boolean; live: React.RefObject<SceneLive>; liveSoil: boolean; labels: boolean; hl: boolean; onHover: (id: string | null) => void; onSelect: (id: string) => void }) {
  const labels = labelsIn && visible;
  const zBack = CUT.z0 - STATION_POS[2];
  const zFront = CUT.z1 - STATION_POS[2];
  const width = CUT.x1 - CUT.x0;
  const cx = (CUT.x0 + CUT.x1) / 2;
  const layers = useMemo(
    () => [
      { key: "s10", from: 0, to: 0.1, label: "0–10 cm", probe: 0.1 },
      { key: "s30", from: 0.1, to: 0.3, label: "10–30 cm", probe: 0.3 },
      { key: "s60", from: 0.3, to: 0.6, label: "30–60 cm", probe: 0.6 },
    ],
    [],
  );
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const sideMats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const roots = useRef<THREE.Group>(null);
  const [vals, setVals] = useState<{ s10: number; s30: number; s60: number; live: boolean }>({ s10: 22, s30: 25, s60: 28, live: false });
  const acc = useRef(0);
  const tmp = useMemo(() => new THREE.Color(), []);

  const rootGeos = useMemo(() => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647), (seed - 1) / 2147483646);
    return Array.from({ length: 12 }, (_, i) => {
      const x = CUT.x0 + 0.15 + (i / 11) * (width - 0.3);
      const pts = [new THREE.Vector3(x, 0, zBack + 0.03)];
      let px = x;
      for (let k = 1; k <= 6; k++) {
        px += (rnd() - 0.5) * 0.12;
        pts.push(new THREE.Vector3(px, -k * 0.16, zBack + 0.03 + rnd() * 0.02));
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 18, 0.006 + rnd() * 0.004, 4);
    });
  }, [width, zBack]);

  useFrame((_, dt) => {
    const l = live.current;
    if (!l) return;
    const useDevice = liveSoil && l.deviceSoil != null;
    const v = useDevice ? { s10: l.deviceSoil!, s30: l.deviceSoil!, s60: l.deviceSoil! } : l.soil;
    // renk 2 sn'den kısa sürede yeni değere oturur
    layers.forEach((ly, i) => {
      const m = moistureColor(v[ly.key as "s10"], tmp);
      const back = mats.current[i];
      const side = sideMats.current[i];
      back?.color.lerp(m, 1 - Math.exp(-6 * dt));
      side?.color.lerp(m, 1 - Math.exp(-6 * dt));
      // profil kuzeye bakar (gölgede); katman renkleri sahnede okunsun diye hafif öz ışık
      if (back) {
        if (hl) back.emissive.set(HL).multiplyScalar(0.35).add(tmp.copy(back.color).multiplyScalar(0.4));
        else back.emissive.copy(back.color).multiplyScalar(0.55);
      }
      if (side) side.emissive.copy(side.color).multiplyScalar(0.35);
    });
    // kökler: kuraklıkta kısalır
    if (roots.current) {
      const target = THREE.MathUtils.clamp(0.35 + (v.s30 / 30) * 0.65, 0.35, 1);
      roots.current.scale.y = THREE.MathUtils.damp(roots.current.scale.y, target, 1.5, dt);
    }
    acc.current += dt;
    if (acc.current > 0.25) {
      acc.current = 0;
      const r = (n: number) => Math.round(n * 10) / 10;
      if (r(v.s10) !== vals.s10 || r(v.s30) !== vals.s30 || r(v.s60) !== vals.s60 || useDevice !== vals.live) setVals({ s10: r(v.s10), s30: r(v.s30), s60: r(v.s60), live: useDevice });
    }
  });

  const E = DEPTH_EXAG;
  return (
    <group
      visible={visible}
      onPointerOver={
        visible
          ? (ev) => {
              ev.stopPropagation();
              onHover("H9");
            }
          : undefined
      }
      onPointerOut={visible ? () => onHover(null) : undefined}
      onClick={
        visible
          ? (ev) => {
              ev.stopPropagation();
              onSelect("H9");
            }
          : undefined
      }
    >
      {layers.map((ly, i) => {
        const h = (ly.to - ly.from) * E;
        const y = -(ly.from * E) - h / 2;
        return (
          <group key={ly.key}>
            {/* arka duvar */}
            <mesh position={[cx, y, zBack - 0.03]}>
              <boxGeometry args={[width, h, 0.06]} />
              <meshStandardMaterial
                ref={(m) => {
                  mats.current[i] = m;
                }}
                color="#7a5a3a"
                roughness={1}
              />
            </mesh>
            {/* yan duvarlar */}
            {[CUT.x0, CUT.x1].map((x) => (
              <mesh key={x} position={[x, y, (zBack + zFront) / 2]}>
                <boxGeometry args={[0.04, h, zFront - zBack]} />
                <meshStandardMaterial
                  ref={(m) => {
                    if (x === CUT.x0) sideMats.current[i] = m;
                  }}
                  color="#6c4f33"
                  roughness={1}
                />
              </mesh>
            ))}
          </group>
        );
      })}
      {/* taban */}
      <mesh position={[cx, -0.6 * E - 0.02, (zBack + zFront) / 2]}>
        <boxGeometry args={[width, 0.04, zFront - zBack]} />
        <meshStandardMaterial color="#4a3526" roughness={1} />
      </mesh>
      {/* kökler */}
      <group ref={roots}>
        {rootGeos.map((g, i) => (
          <mesh key={i} geometry={g}>
            <meshStandardMaterial color="#e8dcc0" roughness={0.9} />
          </mesh>
        ))}
      </group>
      {/* problar: 10 / 30 / 60 cm */}
      {layers.map((ly) => {
        const y = -ly.probe * E + 0.06;
        const v = vals[ly.key as "s10"];
        return (
          <group key={`p-${ly.key}`}>
            <mesh position={[0.35, y, zBack + 0.18]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.018, 0.018, 0.36, 8]} />
              <meshStandardMaterial color="#2b2f2d" emissive={hl ? HL : "#000"} emissiveIntensity={hl ? 0.4 : 0} />
            </mesh>
            <mesh position={[0.35, y, zBack + 0.37]}>
              <boxGeometry args={[0.06, 0.04, 0.04]} />
              <meshStandardMaterial color="#2f9e6b" />
            </mesh>
            <Label3D id={`probe-${ly.key}`} position={[0.62, y, zBack + 0.3]} distanceFactor={3.2} z={25} visible={labels} interactive>
                <div className="pointer-events-none whitespace-nowrap rounded-md border border-line bg-bg/90 px-2 py-1 font-mono text-[12px] shadow">
                  <span className="text-dim">{ly.label}</span>{" "}
                  <b className={v < 18 ? "text-red-fg" : "text-text"}>%{v.toFixed(1).replace(".", ",")}</b>
                </div>
              </Label3D>
          </group>
        );
      })}
      <Label3D id="live-soil" position={[cx, 0.35, zBack + 0.2]} distanceFactor={3.2} z={25} visible={labels && vals.live} interactive>
          <div className="pointer-events-none whitespace-nowrap rounded bg-green/20 px-2 py-0.5 font-mono text-[11px] font-bold text-green-fg">CANLI · demo cihazında tek prob</div>
        </Label3D>
    </group>
  );
}
