"use client";
/**
 * Parseller (NDVI renkli plakalar + ekim sıraları + kuraklık çatlakları + uydu tarama dalgası) ve buğday
 * (InstancedMesh, rüzgâr vertex shader'da; rüzgâr yoksa salınım durur). Doku dosyası yok — hepsi prosedürel.
 */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Label3D } from "./labels";
import { PARCEL_LAYOUT } from "./layout";
import type { SceneLive } from "./useSceneLive";

const DRY = new THREE.Color("#8a5d06");
const WET = new THREE.Color("#2f9e6b");

const plateVert = /* glsl */ `
varying vec3 vPos; varying vec3 vN;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vPos = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const plateFrag = /* glsl */ `
uniform vec3 uDry; uniform vec3 uWet; uniform float uNdvi; uniform float uCrack; uniform float uScan;
uniform float uScanOn; uniform vec3 uScanColor; uniform float uLight; uniform float uFade; uniform float uFocus;
varying vec3 vPos; varying vec3 vN;
vec2 h2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
float vEdge(vec2 x){
  vec2 n = floor(x); vec2 f = fract(x); vec2 mg, mr; float md = 8.0;
  for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++){ vec2 g = vec2(float(i), float(j)); vec2 o = h2(n+g); vec2 r = g+o-f; float d = dot(r,r); if (d<md){ md=d; mr=r; mg=g; } }
  md = 8.0;
  for (int j=-2;j<=2;j++) for (int i=-2;i<=2;i++){ vec2 g = mg+vec2(float(i), float(j)); vec2 o = h2(n+g); vec2 r = g+o-f; if (dot(mr-r,mr-r)>0.00001) md = min(md, dot(0.5*(mr+r), normalize(r-mr))); }
  return md;
}
void main(){
  vec3 soil = vec3(0.36, 0.27, 0.17);
  if (vN.y < 0.5) { gl_FragColor = vec4(soil * 0.7 * uLight, uFade); return; }
  float t = clamp((uNdvi - 0.15) / 0.5, 0.0, 1.0);
  vec3 c = mix(uDry, uWet, t);
  // ekim sıraları: 0,7 m aralıkla ince toprak şeritleri
  float row = abs(fract(vPos.x / 0.7) - 0.5) * 2.0;
  c = mix(c, soil, smoothstep(0.82, 0.98, row) * (0.55 - 0.3 * t));
  // çatlaklar: prosedürel Voronoi kenarları, opaklık = 1 − nem/25
  float e = vEdge(vPos.xz * 0.9);
  float crack = (1.0 - smoothstep(0.02, 0.07, e)) * uCrack;
  c = mix(c, vec3(0.2, 0.13, 0.07), crack * 0.85);
  // uydu tarama dalgası: geçtiği yerde renk "yenilenir"
  float band = exp(-pow((vPos.z - uScan) / 2.2, 2.0)) * uScanOn;
  c = mix(c, uScanColor, band * 0.55);
  c *= uLight * (0.82 + 0.18 * uFocus);
  gl_FragColor = vec4(c, uFade);
}`;

const wheatVert = /* glsl */ `
attribute float aPhase; attribute float aScale;
uniform float uTime; uniform float uWind; uniform float uHeight;
varying float vY; varying float vShade;
void main(){
  vec3 p = position;
  float y = p.y;
  p.y *= uHeight * aScale;
  vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
  float amp = clamp(uWind / 4.0, 0.0, 1.6) * 0.11 * uHeight;
  float sway = sin(uTime * (1.1 + uWind * 0.35) + aPhase + w.x * 0.15) * amp;
  w.x += y * y * sway; w.z += y * y * sway * 0.35;
  vY = y; vShade = 0.78 + 0.22 * fract(aPhase * 7.13);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const wheatFrag = /* glsl */ `
uniform vec3 uStem; uniform vec3 uHead; uniform float uLight; uniform float uFade;
varying float vY; varying float vShade;
void main(){
  vec3 c = mix(uStem, uHead, smoothstep(0.7, 0.92, vY));
  c *= (0.5 + 0.5 * vY) * vShade * uLight;
  gl_FragColor = vec4(c, uFade);
}`;

function ndviToStem(ndvi: number, out: THREE.Color) {
  const t = THREE.MathUtils.clamp((ndvi - 0.18) / 0.45, 0, 1);
  return out.set("#b39445").lerp(new THREE.Color("#3e8f4b"), t);
}
function ndviToHead(ndvi: number, out: THREE.Color) {
  const t = THREE.MathUtils.clamp((ndvi - 0.18) / 0.45, 0, 1);
  return out.set("#c9a24e").lerp(new THREE.Color("#86b453"), t);
}
/** NDVI 0,6 → 0,8 m yeşil; NDVI 0,3 → 0,45 m sarı-kahve */
export function ndviToHeight(ndvi: number) {
  return THREE.MathUtils.clamp(0.45 + (ndvi - 0.3) * (0.35 / 0.3), 0.08, 0.95);
}

function Plate({ id, corners, live, fade, focus }: { id: string; corners: [number, number][]; live: React.RefObject<SceneLive>; fade: boolean; focus: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const geo = useMemo(() => {
    const s = new THREE.Shape(corners.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.15, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [corners]);
  const uniforms = useMemo(
    () => ({
      uDry: { value: DRY.clone() },
      uWet: { value: WET.clone() },
      uNdvi: { value: 0.4 },
      uCrack: { value: 0 },
      uScan: { value: -999 },
      uScanOn: { value: 0 },
      uScanColor: { value: new THREE.Color("#4aa3e8") },
      uLight: { value: 1 },
      uFade: { value: 1 },
      uFocus: { value: focus ? 1 : 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const acc = useRef(0);
  const target = useRef({ ndvi: 0.4, crack: 0 });
  useFrame((_, dt) => {
    const l = live.current;
    const m = mat.current;
    if (!l || !m) return;
    acc.current += dt;
    // hedef değerler 250 ms'de bir; her karede yumuşak yaklaşma (damp)
    if (acc.current > 0.25) {
      acc.current = 0;
      target.current.ndvi = l.ndvi[id] ?? target.current.ndvi;
      target.current.crack = l.irrigated[id] ? 0 : THREE.MathUtils.clamp(1 - l.soil.s30 / 25, 0, 1);
    }
    const u = m.uniforms;
    u.uNdvi.value = THREE.MathUtils.damp(u.uNdvi.value, target.current.ndvi, 3, dt);
    u.uCrack.value = THREE.MathUtils.damp(u.uCrack.value, target.current.crack, 2, dt);
    u.uFade.value = THREE.MathUtils.damp(u.uFade.value, fade ? 0.3 : 1, 4, dt);
    const sp = l.satPass;
    u.uScanOn.value = THREE.MathUtils.damp(u.uScanOn.value, sp.active ? 1 : 0, 6, dt);
    if (sp.active) u.uScan.value = -16 + sp.progress * 92;
    u.uScanColor.value.set(sp.cloudy ? "#8f9894" : sp.sensor === "S1" ? "#8b7bd8" : "#4aa3e8");
  });
  return (
    <mesh geometry={geo}>
      <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={plateVert} fragmentShader={plateFrag} transparent={fade} />
    </mesh>
  );
}

function Wheat({ id, corners, count, live, fade, windOn }: { id: string; corners: [number, number][]; count: number; live: React.RefObject<SceneLive>; fade: boolean; windOn: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { geo, mesh } = useMemo(() => {
    const g = new THREE.ConeGeometry(0.045, 1, 4, 2, true);
    g.translate(0, 0.5, 0);
    const xs = corners.map((c) => c[0]);
    const zs = corners.map((c) => c[1]);
    const [x0, x1, z0, z1] = [Math.min(...xs) + 0.6, Math.max(...xs) - 0.6, Math.min(...zs) + 0.6, Math.max(...zs) - 0.6];
    let seed = id.charCodeAt(2) * 97 + id.charCodeAt(4);
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const phase = new Float32Array(count);
    const scale = new Float32Array(count);
    const im = new THREE.InstancedMesh(g, undefined as unknown as THREE.Material, count);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    // ekim sıralarına hizalı dağılım (0,7 m aralık) + küçük sapma
    for (let i = 0; i < count; i++) {
      const rowsN = Math.floor((x1 - x0) / 0.7);
      const row = Math.floor(rnd() * rowsN);
      const x = x0 + row * 0.7 + (rnd() - 0.5) * 0.18;
      const z = z0 + rnd() * (z1 - z0);
      e.set((rnd() - 0.5) * 0.12, rnd() * Math.PI, (rnd() - 0.5) * 0.12);
      q.setFromEuler(e);
      const w = 0.8 + rnd() * 0.6;
      m4.compose(new THREE.Vector3(x, 0.15, z), q, new THREE.Vector3(w, 1, w));
      im.setMatrixAt(i, m4);
      phase[i] = rnd() * Math.PI * 2;
      scale[i] = 0.82 + rnd() * 0.36;
    }
    g.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phase, 1));
    g.setAttribute("aScale", new THREE.InstancedBufferAttribute(scale, 1));
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false;
    return { geo: g, mesh: im };
  }, [corners, count, id]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWind: { value: 2 },
      uHeight: { value: 0.6 },
      uStem: { value: new THREE.Color("#3e8f4b") },
      uHead: { value: new THREE.Color("#86b453") },
      uLight: { value: 1 },
      uFade: { value: 1 },
    }),
    [],
  );
  const target = useRef({ h: 0.6, ndvi: 0.45 });
  const acc = useRef(0);
  const tmp = useMemo(() => new THREE.Color(), []);
  useFrame((st, dt) => {
    const l = live.current;
    const m = mat.current;
    if (!l || !m) return;
    acc.current += dt;
    if (acc.current > 0.25) {
      acc.current = 0;
      target.current.ndvi = l.ndvi[id] ?? target.current.ndvi;
      target.current.h = ndviToHeight(target.current.ndvi);
    }
    const u = m.uniforms;
    u.uTime.value = st.clock.elapsedTime;
    // rüzgâr gerçek veriden: yoksa salınım durur
    u.uWind.value = THREE.MathUtils.damp(u.uWind.value, windOn ? l.wind : 0, 2, dt);
    u.uHeight.value = THREE.MathUtils.damp(u.uHeight.value, target.current.h, 2.5, dt);
    u.uStem.value.lerp(ndviToStem(target.current.ndvi, tmp), 1 - Math.exp(-2.5 * dt));
    u.uHead.value.lerp(ndviToHead(target.current.ndvi, tmp), 1 - Math.exp(-2.5 * dt));
    u.uFade.value = THREE.MathUtils.damp(u.uFade.value, fade ? 0.25 : 1, 4, dt);
  });

  return (
    <primitive object={mesh}>
      <shaderMaterial ref={mat} attach="material" uniforms={uniforms} vertexShader={wheatVert} fragmentShader={wheatFrag} transparent={fade} />
      <primitive object={geo} attach="geometry" />
    </primitive>
  );
}

/** Uzak görünümlerde parsel etiketleri (takma ad + NDVI) */
function ParcelLabels({ live, show }: { live: React.RefObject<SceneLive>; show: boolean }) {
  const [ndvi, setNdvi] = useState<Record<string, number>>({});
  const acc = useRef(0);
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.5 || !live.current) return;
    acc.current = 0;
    const n = live.current.ndvi;
    if (PARCEL_LAYOUT.some((p) => Math.abs((n[p.id] ?? 0) - (ndvi[p.id] ?? -1)) > 0.004)) setNdvi({ ...n });
  });
  return (
    <>
      {PARCEL_LAYOUT.map((p) => (
        <Label3D key={p.id} id={`parcel-${p.id}`} position={[p.center[0], 1.5, p.center[1]]} visible={show} distanceFactor={90} z={8}>
          <div className="whitespace-nowrap rounded-md border border-line bg-bg/80 px-2 py-1 text-center font-mono text-[13px] shadow">
            <b className="text-text">{p.id}</b>
            <span className="ml-1.5 text-dim">NDVI</span> <b className="text-wheat-fg">{ndvi[p.id] != null ? ndvi[p.id].toFixed(2).replace(".", ",") : "—"}</b>
          </div>
        </Label3D>
      ))}
    </>
  );
}

export function Fields({ live, fade, focusId = "P-1182", windOn = true, labels = false }: { live: React.RefObject<SceneLive>; fade: boolean; focusId?: string; windOn?: boolean; labels?: boolean }) {
  return (
    <group>
      {PARCEL_LAYOUT.map((p) => (
        <group key={p.id}>
          <Plate id={p.id} corners={p.corners} live={live} fade={fade} focus={p.id === focusId} />
          <Wheat id={p.id} corners={p.corners} count={p.wheat} live={live} fade={fade} windOn={windOn} />
        </group>
      ))}
      <ParcelLabels live={live} show={labels && !fade} />
    </group>
  );
}
