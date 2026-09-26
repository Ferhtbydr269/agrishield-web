"use client";
/**
 * Çevre: kendi gradient gökyüzü shader'ımız (dış doku yok), güneş (Şanlıurfa ~37,2°K), zemin (hafif tümsekli,
 * tarla çevresi düz), tepeler, tarla yolları, prosedürel bulut katmanı. Gündüz-gece geçişi hızlı akışta yumuşatılır.
 */
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CUT, FIELD_BOUNDS } from "./layout";
import type { SceneLive } from "./useSceneLive";

const LAT = (37.2 * Math.PI) / 180;

export function sunFor(dateIso: string, hour: number) {
  const [y, m, d] = dateIso.split("-").map(Number);
  const doy = Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86_400_000);
  const decl = ((23.44 * Math.PI) / 180) * Math.sin((2 * Math.PI * (284 + doy)) / 365);
  const H = ((hour - 12) * 15 * Math.PI) / 180;
  const elev = Math.asin(Math.sin(LAT) * Math.sin(decl) + Math.cos(LAT) * Math.cos(decl) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(LAT) - Math.tan(decl) * Math.cos(LAT));
  // az: 0 = güney, +batı. Dünya: +Z kuzey, +X doğu
  const r = Math.cos(elev);
  return { elev, dir: new THREE.Vector3(-Math.sin(az) * r, Math.sin(elev), -Math.cos(az) * r).normalize() };
}

const PALETTES = {
  night: { top: new THREE.Color("#0e1a14"), horizon: new THREE.Color("#2a3c31") },
  dawn: { top: new THREE.Color("#233447"), horizon: new THREE.Color("#b07c4f") },
  noon: { top: new THREE.Color("#2f5670"), horizon: new THREE.Color("#8fa9a1") },
  dusk: { top: new THREE.Color("#221f35"), horizon: new THREE.Color("#c2683d") },
};

/** Ekranda görünen saat: hızlı akışta öğlene harmanlanır (stroboskop etkisi yok) */
export function displayHour(l: SceneLive, prev: number, forceNight: boolean, dt: number): number {
  if (forceNight) return THREE.MathUtils.damp(prev, 23, 2, dt);
  if (l.speed > 1) return THREE.MathUtils.damp(prev, 12.5, 1.5, dt);
  // yumuşak takip; gece yarısı sarmasını önle
  return THREE.MathUtils.damp(prev, l.hour, 3, dt);
}

const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const skyFrag = /* glsl */ `
uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uBottom; uniform vec3 uSunDir; uniform float uSunVis;
varying vec3 vDir;
void main() {
  float h = vDir.y;
  vec3 c = h > 0.0 ? mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(uHorizon, uBottom, clamp(-h * 4.0, 0.0, 1.0));
  float sun = pow(max(dot(normalize(vDir), normalize(uSunDir)), 0.0), 700.0) * uSunVis;
  float glow = pow(max(dot(normalize(vDir), normalize(uSunDir)), 0.0), 12.0) * 0.25 * uSunVis;
  gl_FragColor = vec4(c + vec3(1.0, 0.86, 0.6) * (sun + glow), 1.0);
}`;

export function Environment({ live, night, fade }: { live: React.RefObject<SceneLive>; night: boolean; fade: boolean }) {
  const sky = useRef<THREE.ShaderMaterial>(null);
  const sunLight = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const shown = useRef(11);
  const { scene } = useThree();

  const skyUniforms = useMemo(
    () => ({
      uTop: { value: PALETTES.noon.top.clone() },
      uHorizon: { value: PALETTES.noon.horizon.clone() },
      uBottom: { value: new THREE.Color("#0b130f") },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunVis: { value: 1 },
    }),
    [],
  );

  const tmpA = useMemo(() => new THREE.Color(), []);
  const tmpB = useMemo(() => new THREE.Color(), []);

  useFrame((_, dt) => {
    const l = live.current;
    if (!l) return;
    shown.current = displayHour(l, shown.current, night, Math.min(dt, 0.1));
    const { elev, dir } = sunFor(l.date, shown.current);
    const e = elev / (Math.PI / 2); // −1..1
    // palet: gece < −0,05 < şafak/akşam < 0,25 < öğle
    const morning = shown.current < 12;
    const twilight = morning ? PALETTES.dawn : PALETTES.dusk;
    if (e <= -0.05) {
      tmpA.copy(PALETTES.night.top);
      tmpB.copy(PALETTES.night.horizon);
    } else if (e < 0.25) {
      const k = (e + 0.05) / 0.3;
      tmpA.copy(PALETTES.night.top).lerp(twilight.top, Math.min(1, k * 1.4)).lerp(PALETTES.noon.top, Math.max(0, k - 0.4));
      tmpB.copy(PALETTES.night.horizon).lerp(twilight.horizon, Math.min(1, k * 1.4)).lerp(PALETTES.noon.horizon, Math.max(0, k - 0.5));
    } else {
      tmpA.copy(PALETTES.noon.top);
      tmpB.copy(PALETTES.noon.horizon);
    }
    // bulutluluk gökyüzünü griler
    const cloud = l.cloud;
    tmpA.lerp(new THREE.Color("#46514d"), cloud * 0.35);
    tmpB.lerp(new THREE.Color("#6e7672"), cloud * 0.3);
    if (sky.current) {
      sky.current.uniforms.uTop.value.copy(tmpA);
      sky.current.uniforms.uHorizon.value.copy(tmpB);
      sky.current.uniforms.uSunDir.value.copy(dir);
      sky.current.uniforms.uSunVis.value = THREE.MathUtils.clamp(e * 6, 0, 1) * (1 - cloud * 0.7);
    }
    const day = THREE.MathUtils.clamp((e + 0.05) * 3, 0, 1);
    if (sunLight.current) {
      sunLight.current.position.copy(dir).multiplyScalar(160).add(new THREE.Vector3(-20, 0, 0));
      sunLight.current.intensity = (fade ? 0.9 : 2.2) * day * (1 - cloud * 0.45);
      sunLight.current.color.setHSL(0.09, 0.6, 0.55 + 0.35 * Math.min(1, e * 3));
    }
    if (hemi.current) {
      hemi.current.intensity = 0.35 + 0.85 * day;
    }
    scene.fog?.color.copy(tmpB);
  });

  return (
    <>
      <mesh scale={600} renderOrder={-1}>
        <sphereGeometry args={[1, 32, 16]} />
        <shaderMaterial ref={sky} uniforms={skyUniforms} vertexShader={skyVert} fragmentShader={skyFrag} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <hemisphereLight ref={hemi} args={["#bcd3d0", "#3b2f22", 0.9]} />
      <directionalLight
        ref={sunLight}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-90}
        shadow-camera-right={90}
        shadow-camera-top={90}
        shadow-camera-bottom={-90}
        shadow-camera-near={10}
        shadow-camera-far={400}
        shadow-bias={-0.0008}
      />
    </>
  );
}

/* ───────────── zemin ───────────── */

function noise(x: number, z: number) {
  return (
    Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.038 - 0.7) * 0.35 +
    Math.sin(x * 0.11 + z * 0.07) * 0.18 +
    Math.cos(x * 0.21 - z * 0.17 + 2.1) * 0.07
  );
}

export function Ground({ cut, fade }: { cut: boolean; fade: boolean }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(400, 400, 96, 96);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const c1 = new THREE.Color("#5f5139");
    const c2 = new THREE.Color("#7a6746");
    const c3 = new THREE.Color("#4d4a33");
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dx = Math.max(FIELD_BOUNDS.minX - 6 - x, 0, x - (FIELD_BOUNDS.maxX + 6));
      const dz = Math.max(FIELD_BOUNDS.minZ - 6 - z, 0, z - (FIELD_BOUNDS.maxZ + 6));
      const nearVillage = Math.hypot(x + 60, z + 40) < 30;
      const flat = nearVillage ? 0 : THREE.MathUtils.smoothstep(Math.hypot(dx, dz), 0, 30);
      pos.setY(i, noise(x, z) * 1.7 * flat - 0.02);
      const n = (noise(x * 2.3, z * 2.1) + 0.6) / 1.2;
      tmp.copy(c1).lerp(c2, THREE.MathUtils.clamp(n, 0, 1)).lerp(c3, flat * 0.35 * THREE.MathUtils.clamp(1 - n, 0, 1));
      colors.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);

  const planes = useMemo(
    () => [
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), CUT.x0),
      new THREE.Plane(new THREE.Vector3(1, 0, 0), -CUT.x1),
      new THREE.Plane(new THREE.Vector3(0, 0, -1), CUT.z0),
      new THREE.Plane(new THREE.Vector3(0, 0, 1), -CUT.z1),
    ],
    [],
  );

  return (
    <mesh geometry={geo} receiveShadow>
      <meshLambertMaterial vertexColors clippingPlanes={cut ? planes : []} clipIntersection transparent={fade} opacity={fade ? 0.35 : 1} />
    </mesh>
  );
}

export function Roads({ fade, cut }: { fade: boolean; cut: boolean }) {
  const planes = useMemo(
    () => [
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), CUT.x0),
      new THREE.Plane(new THREE.Vector3(1, 0, 0), -CUT.x1),
      new THREE.Plane(new THREE.Vector3(0, 0, -1), CUT.z0),
      new THREE.Plane(new THREE.Vector3(0, 0, 1), -CUT.z1),
    ],
    [],
  );
  return (
    <group position={[0, 0.03, 0]}>
      {/* doğu-batı tarla yolu (P-1182 kuzeyi, istasyonun önü); kesit modunda dilim çıkarılır */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 28.75]}>
        <planeGeometry args={[126, 3]} />
        <meshLambertMaterial color="#8e7c58" transparent={fade} opacity={fade ? 0.35 : 1} clippingPlanes={cut ? planes : []} clipIntersection />
      </mesh>
      {/* kuzey-güney yol (P-1244 ile P-1207 arası) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 51]}>
        <planeGeometry args={[3, 40]} />
        <meshLambertMaterial color="#8e7c58" transparent={fade} opacity={fade ? 0.35 : 1} clippingPlanes={cut ? planes : []} clipIntersection />
      </mesh>
      {/* köye giden yol */}
      <mesh rotation-x={-Math.PI / 2} rotation-z={-0.72} position={[-38, 0, -18]}>
        <planeGeometry args={[3.2, 62]} />
        <meshLambertMaterial color="#8e7c58" transparent={fade} opacity={fade ? 0.35 : 1} />
      </mesh>
    </group>
  );
}

export function Hills() {
  const hills: [number, number, number, number, number][] = [
    [-230, -160, 95, 22, 0.2],
    [215, -185, 80, 16, 1.1],
    [60, 255, 110, 19, 2.3],
  ];
  return (
    <group>
      {hills.map(([x, z, r, h, rot]) => (
        <mesh key={x} position={[x, h / 2 - 1, z]} rotation-y={rot}>
          <coneGeometry args={[r, h, 7, 1]} />
          <meshLambertMaterial color="#465443" flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* ───────────── bulutlar ───────────── */

const cloudFrag = /* glsl */ `
uniform float uTime; uniform float uCover; uniform float uSeed; uniform vec3 uColor;
varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0; float a = 0.5; for (int k = 0; k < 5; k++){ v += a*n(p); p *= 2.03; a *= 0.5; } return v; }
void main(){
  vec2 p = vUv * vec2(5.0, 3.2) + vec2(uTime * 0.012 + uSeed, uTime * 0.004);
  float d = fbm(p);
  float edge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x) * smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
  float a = smoothstep(0.62 - uCover * 0.32, 0.9, d) * edge * (0.25 + uCover * 0.7);
  gl_FragColor = vec4(uColor, a);
}`;
const cloudVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

export function Clouds({ live, enabled }: { live: React.RefObject<SceneLive>; enabled: boolean }) {
  const mats = useRef<(THREE.ShaderMaterial | null)[]>([]);
  const layers = useMemo(
    () => [
      { y: 62, seed: 0.0, size: [220, 150] as [number, number], pos: [10, 30] as [number, number] },
      { y: 74, seed: 3.7, size: [260, 170] as [number, number], pos: [-30, 10] as [number, number] },
      { y: 88, seed: 7.1, size: [300, 190] as [number, number], pos: [40, -20] as [number, number] },
    ],
    [],
  );
  const uniforms = useMemo(() => layers.map((l) => ({ uTime: { value: 0 }, uCover: { value: 0.2 }, uSeed: { value: l.seed }, uColor: { value: new THREE.Color("#dfe6e1") } })), [layers]);
  const cover = useRef(0.2);
  useFrame((st, dt) => {
    const l = live.current;
    if (!l) return;
    const target = enabled ? Math.max(l.cloud, l.satPass.cloudy && l.satPass.active ? 0.9 : 0) : 0;
    cover.current = THREE.MathUtils.damp(cover.current, target, 1.5, dt);
    for (const m of mats.current) {
      if (!m) continue;
      m.uniforms.uTime.value = st.clock.elapsedTime;
      m.uniforms.uCover.value = cover.current;
    }
  });
  return (
    <group>
      {layers.map((l, i) => (
        <mesh key={l.y} position={[l.pos[0], l.y, l.pos[1]]} rotation-x={-Math.PI / 2} renderOrder={2}>
          <planeGeometry args={l.size} />
          <shaderMaterial
            ref={(m) => {
              mats.current[i] = m;
            }}
            uniforms={uniforms[i]}
            vertexShader={cloudVert}
            fragmentShader={cloudFrag}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
