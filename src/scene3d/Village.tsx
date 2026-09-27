"use client";
/**
 * Köy (basit evler + kooperatif binası), çatıda gateway, sembolik LoRa kapsama kubbesi ve
 * istasyon → gateway paket animasyonu (CatmullRomCurve3 üzerinde parlak küre + iz), gateway → bulut huzmesi.
 */
import { Line } from "@react-three/drei";
import { Label3D } from "./labels";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CLOUD_API_POS, GATEWAY_POS, STATION_POS, VILLAGE_POS } from "./layout";
import type { SceneLive } from "./useSceneLive";

const HOUSES: [number, number, number, number][] = [
  // x, z, dönüş, ölçek
  [-78, -52, 0.2, 1],
  [-72, -30, -0.3, 0.9],
  [-84, -38, 0.5, 1.1],
  [-66, -58, 0.1, 0.85],
  [-50, -56, -0.2, 1],
  [-44, -44, 0.35, 0.9],
  [-90, -24, 0.1, 1],
  [-58, -22, -0.15, 0.95],
  [-92, -54, -0.4, 1.05],
  [-40, -30, 0.25, 0.8],
];

/** 10 ev → 2 çizim çağrısı (duvarlar + çatılar, InstancedMesh). */
function Houses() {
  const walls = useRef<THREE.InstancedMesh>(null);
  const roofs = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    const inner = new THREE.Object3D();
    HOUSES.forEach(([x, z, r, s], i) => {
      o.position.set(x, 0, z);
      o.rotation.set(0, r, 0);
      o.scale.setScalar(s);
      o.updateMatrix();
      inner.position.set(0, 1.6, 0);
      inner.rotation.set(0, 0, 0);
      inner.updateMatrix();
      walls.current?.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(o.matrix, inner.matrix));
      inner.position.set(0, 3.9, 0);
      inner.rotation.set(0, Math.PI / 4, 0);
      inner.updateMatrix();
      roofs.current?.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(o.matrix, inner.matrix));
    });
    for (const m of [walls.current, roofs.current]) {
      if (!m) continue;
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
    }
  }, []);
  return (
    <>
      <instancedMesh ref={walls} args={[undefined, undefined, HOUSES.length]} castShadow receiveShadow>
        <boxGeometry args={[5, 3.2, 4]} />
        <meshStandardMaterial color="#cdbfa1" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={roofs} args={[undefined, undefined, HOUSES.length]} castShadow>
        <coneGeometry args={[3.7, 1.6, 4]} />
        <meshStandardMaterial color="#9a4e34" roughness={0.9} flatShading />
      </instancedMesh>
    </>
  );
}

export function Village({
  live,
  dome,
  labels,
  hover,
  selected,
  onHover,
  onSelect,
}: {
  live: React.RefObject<SceneLive>;
  dome: boolean;
  labels: boolean;
  hover: string | null;
  selected: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(STATION_POS[0] + 0.18, 3.67, STATION_POS[2]),
        new THREE.Vector3(-18, 20, 6),
        new THREE.Vector3(-44, 22, -22),
        new THREE.Vector3(GATEWAY_POS[0], GATEWAY_POS[1] + 1.4, GATEWAY_POS[2]),
      ]),
    [],
  );
  const pathPoints = useMemo(() => curve.getPoints(80), [curve]);
  const packet = useRef<THREE.Mesh>(null);
  const trail = useRef<THREE.InstancedMesh>(null);
  const trailObj = useMemo(() => new THREE.Object3D(), []);
  const beam = useRef<THREE.MeshBasicMaterial>(null);
  const domeMat = useRef<THREE.MeshBasicMaterial>(null);
  const st = useRef({ t: 2, lastTick: 0, beam: 0, queued: false });
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const hl = hover === "GW" || selected === "GW";

  useFrame((_, dt) => {
    const l = live.current;
    if (!l) return;
    const s = st.current;
    if (l.readingTick !== s.lastTick) {
      s.lastTick = l.readingTick;
      if (s.t >= 1) s.t = 0;
      else s.queued = true;
    }
    if (s.t < 1) {
      s.t += dt / 1.2;
      if (s.t >= 1) {
        s.beam = 1;
        if (s.queued) {
          s.queued = false;
          s.t = 0;
        }
      }
    }
    const on = s.t < 1;
    if (packet.current) {
      packet.current.visible = on;
      if (on) packet.current.position.copy(curve.getPointAt(Math.min(1, s.t), tmp));
    }
    const tr = trail.current;
    if (tr) {
      tr.visible = on && s.t > 0.035;
      if (tr.visible) {
        for (let i = 0; i < 4; i++) {
          const tt = Math.max(0, s.t - (i + 1) * 0.035);
          trailObj.position.copy(curve.getPointAt(Math.min(1, tt), tmp));
          trailObj.scale.setScalar(0.8 - i * 0.16);
          trailObj.updateMatrix();
          tr.setMatrixAt(i, trailObj.matrix);
        }
        tr.instanceMatrix.needsUpdate = true;
      }
    }
    s.beam = Math.max(0, s.beam - dt * 0.8);
    if (beam.current) beam.current.opacity = 0.08 + s.beam * 0.5;
    if (domeMat.current) domeMat.current.opacity = THREE.MathUtils.damp(domeMat.current.opacity, dome ? 0.07 : 0, 4, dt);
  });

  return (
    <group>
      <Houses />
      {/* kooperatif binası */}
      <group position={VILLAGE_POS}>
        <mesh position={[0, 3.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[14, 6.4, 9]} />
          <meshStandardMaterial color="#b9ad93" roughness={0.9} />
        </mesh>
        <mesh position={[0, 6.55, 0]}>
          <boxGeometry args={[14.4, 0.3, 9.4]} />
          <meshStandardMaterial color="#8b8272" />
        </mesh>
        <Label3D id="coop" position={[0, 8.6, -4]} distanceFactor={60} z={15} visible={labels} interactive>
            <div className="pointer-events-none whitespace-nowrap rounded bg-bg/80 px-2 py-0.5 font-mono text-[12px] text-dim">Kooperatif</div>
          </Label3D>
      </group>
      {/* gateway: çatıda kutu + çubuk anten */}
      <group
        position={GATEWAY_POS}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover("GW");
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect("GW");
        }}
      >
        <mesh position={[0, -2.5, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 1.8, 8]} />
          <meshStandardMaterial color="#aeb7b3" metalness={0.5} />
        </mesh>
        <mesh position={[0, -1.4, 0]} castShadow>
          <boxGeometry args={[0.8, 0.6, 0.4]} />
          <meshStandardMaterial color="#e6e9e3" emissive={hl ? "#e0a526" : "#000"} emissiveIntensity={hl ? 0.5 : 0} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 2.6, 8]} />
          <meshStandardMaterial color="#2b2f2d" emissive={hl ? "#e0a526" : "#000"} emissiveIntensity={hl ? 0.5 : 0} />
        </mesh>
        <mesh position={[0, 1.55, 0]}>
          <sphereGeometry args={[0.12, 10, 8]} />
          <meshStandardMaterial color="#4aa3e8" emissive="#4aa3e8" emissiveIntensity={0.6} />
        </mesh>
        <Label3D id="gw" position={[0, 2.6, 0]} distanceFactor={45} z={30} visible={labels} interactive>
            <button
              type="button"
              onClick={() => onSelect("GW")}
              className="whitespace-nowrap rounded-full border border-sky/60 bg-bg/85 px-2 py-0.5 font-mono text-[12px] font-bold text-sky-fg"
            >
              + Gateway
            </button>
          </Label3D>
      </group>
      {/* sembolik kapsama kubbesi (140 m yarıçap) */}
      <mesh position={[GATEWAY_POS[0], 0, GATEWAY_POS[2]]}>
        <sphereGeometry args={[140, 36, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial ref={domeMat} color="#4aa3e8" transparent opacity={0.07} depthWrite={false} side={THREE.DoubleSide} wireframe />
      </mesh>
      <Label3D id="dome" position={[GATEWAY_POS[0] + 40, 70, GATEWAY_POS[2] + 40]} distanceFactor={90} z={15} visible={dome && labels} interactive>
          <div className="pointer-events-none whitespace-nowrap rounded bg-bg/80 px-2 py-1 font-mono text-[13px] text-sky-fg">LoRa kapsama ~10 km (sembolik)</div>
        </Label3D>
      {/* paket yolu + paket */}
      <Line points={pathPoints} color="#4aa3e8" lineWidth={1.2} dashed dashSize={1.2} gapSize={1.2} transparent opacity={0.4} />
      <mesh ref={packet} visible={false}>
        <sphereGeometry args={[0.55, 12, 10]} />
        <meshBasicMaterial color="#9fd3ff" toneMapped={false} />
      </mesh>
      <instancedMesh ref={trail} args={[undefined, undefined, 4]} visible={false} frustumCulled={false}>
        <sphereGeometry args={[0.5, 8, 6]} />
        <meshBasicMaterial color="#4aa3e8" transparent opacity={0.4} depthWrite={false} />
      </instancedMesh>
      {/* gateway → bulut huzmesi */}
      <mesh position={[CLOUD_API_POS[0], (GATEWAY_POS[1] + CLOUD_API_POS[1]) / 2 + 1, CLOUD_API_POS[2]]}>
        <cylinderGeometry args={[0.35, 0.35, CLOUD_API_POS[1] - GATEWAY_POS[1], 10, 1, true]} />
        <meshBasicMaterial ref={beam} color="#4aa3e8" transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}
