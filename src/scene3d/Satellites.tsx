"use client";
/**
 * Uydular: Sentinel-2 (optik) eğimli yörüngede dolanır; parselin üzerinden geçerken aşağı doğru tarama konisi
 * açılır ve tarlayı süpürür (parsellerde renk "yenilenir"). Bulut varsa geçiş GRİ olur: "bulutlu geçiş: veri yok".
 * Sentinel-1 (radar) bulutlu dönemde devreye girer: mor-mavi koni, bulutun içinden geçer.
 */
import { Label3D } from "./labels";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { SceneLive } from "./useSceneLive";

const A = new THREE.Vector3(-150, 165, -70);
const B = new THREE.Vector3(150, 165, 130);
const TA = new THREE.Vector3(-8, 0, -16);
const TB = new THREE.Vector3(8, 0, 76);
const DOWN = new THREE.Vector3(0, -1, 0);

function SatModel({ color, hl }: { color: string; hl: boolean }) {
  return (
    <group scale={2.2}>
      <mesh>
        <boxGeometry args={[1.6, 1.2, 2.4]} />
        <meshStandardMaterial color="#d9dcd5" metalness={0.5} roughness={0.35} emissive={hl ? "#e0a526" : "#000"} emissiveIntensity={hl ? 0.5 : 0} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 3.9, 0, 0]}>
          <boxGeometry args={[6, 0.06, 1.6]} />
          <meshStandardMaterial color={color} metalness={0.4} roughness={0.3} emissive={color} emissiveIntensity={0.15} />
        </mesh>
      ))}
      <mesh position={[0, -0.9, 0.6]}>
        <cylinderGeometry args={[0.05, 0.05, 0.6, 6]} />
        <meshStandardMaterial color="#888" />
      </mesh>
    </group>
  );
}

export function Satellites({ live, labels, onSelect, hover, selected, onHover }: { live: React.RefObject<SceneLive>; labels: boolean; onSelect: (id: string) => void; hover: string | null; selected: string | null; onHover: (id: string | null) => void }) {
  const sat = useRef<THREE.Group>(null);
  const cone = useRef<THREE.Mesh>(null);
  const coneMat = useRef<THREE.MeshBasicMaterial>(null);
  const [pass, setPass] = useState<{ on: boolean; kind: "S2" | "S1"; cloudy: boolean }>({ on: false, kind: "S2", cloudy: false });
  const tmpP = useMemo(() => new THREE.Vector3(), []);
  const tmpT = useMemo(() => new THREE.Vector3(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const coneGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(1, 1, 28, 1, true);
    g.translate(0, -0.5, 0);
    return g;
  }, []);

  useFrame((st, dt) => {
    const l = live.current;
    if (!l || !sat.current) return;
    const sp = l.satPass;
    const on = sp.active;
    if (on) {
      tmpP.lerpVectors(A, B, sp.progress);
      tmpT.lerpVectors(TA, TB, sp.progress);
    } else {
      const a = st.clock.elapsedTime * 0.07;
      tmpP.set(Math.cos(a) * 230, 150 + Math.sin(a * 1.3) * 25, Math.sin(a) * 140 + 20);
    }
    sat.current.position.lerp(tmpP, on ? 1 : 1 - Math.exp(-3 * dt));
    sat.current.lookAt(0, 0, 20);
    if (cone.current && coneMat.current) {
      cone.current.visible = on || coneMat.current.opacity > 0.01;
      if (on) {
        const dir = tmpT.clone().sub(sat.current.position);
        const len = dir.length();
        dir.normalize();
        q.setFromUnitVectors(DOWN, dir);
        cone.current.position.copy(sat.current.position);
        cone.current.quaternion.copy(q);
        cone.current.scale.set(22, len, 22);
      }
      coneMat.current.opacity = THREE.MathUtils.damp(coneMat.current.opacity, on ? 0.2 : 0, 8, dt);
      coneMat.current.color.set(sp.cloudy ? "#8f9894" : sp.sensor === "S1" ? "#7c6fe0" : "#4aa3e8");
    }
    const kind = sp.sensor;
    if (on !== pass.on || kind !== pass.kind || sp.cloudy !== pass.cloudy) setPass({ on, kind, cloudy: sp.cloudy });
  });

  const id = pass.kind === "S1" ? "S1" : "S2";
  const hl = hover === id || selected === id;
  return (
    <group>
      <group
        ref={sat}
        position={[200, 150, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(id);
        }}
      >
        <SatModel color={pass.kind === "S1" ? "#3f3a8a" : "#1b2e5a"} hl={hl} />
        <Label3D id="sat" position={[0, 9, 0]} distanceFactor={120} z={20} visible={labels} interactive>
            <button type="button" onClick={() => onSelect(id)} className="whitespace-nowrap rounded-full border border-sky/60 bg-bg/85 px-2 py-0.5 font-mono text-[13px] font-bold text-sky-fg">
              + {pass.kind === "S1" ? "Sentinel-1 (radar)" : "Sentinel-2"}
            </button>
          </Label3D>
      </group>
      <mesh ref={cone} geometry={coneGeo} visible={false} renderOrder={3}>
        <meshBasicMaterial ref={coneMat} color="#4aa3e8" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <Label3D id="sat-pass" position={[0, 30, 30]} distanceFactor={110} z={20} visible={pass.on && labels} interactive>
          <div
            className={`pointer-events-none whitespace-nowrap rounded-lg px-3 py-1.5 font-mono text-[14px] font-bold ${pass.cloudy ? "bg-surface-2/90 text-dim" : pass.kind === "S1" ? "bg-violet/25 text-violet-fg" : "bg-sky/20 text-sky-fg"}`}
          >
            {pass.cloudy ? "Bulutlu geçiş: veri yok" : pass.kind === "S1" ? "Radar bulutu deler; ama sadece yüzey nemini görür." : "Sentinel-2 geçişi · NDVI güncellendi"}
          </div>
        </Label3D>
    </group>
  );
}
