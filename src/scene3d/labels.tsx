"use client";
/**
 * 3D etiket katmanı — drei <Html> yerine. Her etiket için ayrı React kökü açmaz: içerik sahne dışındaki tek bir
 * DOM katmanında (normal React ağacında) çizilir, konumu her karede kameraya göre projekte edilir.
 * Böylece Canvas söküldüğünde (sunumda sahne geçişi) "removeChild" yarışı olmaz.
 */
import { useFrame, useThree } from "@react-three/fiber";
import { createContext, useContext, useEffect, useRef } from "react";
import * as THREE from "three";
import { create, type StoreApi, type UseBoundStore } from "zustand";

export interface LabelSpec {
  id: string;
  obj: THREE.Object3D | null;
  node: React.ReactNode;
  visible: boolean;
  distanceFactor?: number;
  interactive?: boolean;
  z?: number;
}

interface LabelState {
  specs: Record<string, LabelSpec>;
  upsert: (s: LabelSpec) => void;
  remove: (id: string) => void;
}

export type LabelStore = UseBoundStore<StoreApi<LabelState>> & { els: Map<string, HTMLDivElement> };

export function createLabelStore(): LabelStore {
  const s = create<LabelState>((set) => ({
    specs: {},
    upsert: (spec) => set((st) => ({ specs: { ...st.specs, [spec.id]: spec } })),
    remove: (id) =>
      set((st) => {
        const next = { ...st.specs };
        delete next[id];
        return { specs: next };
      }),
  })) as LabelStore;
  s.els = new Map();
  return s;
}

const Ctx = createContext<LabelStore | null>(null);

export function LabelProvider({ store, children }: { store: LabelStore; children: React.ReactNode }) {
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

/** Sahne içinde: yerel konumda görünmez bir çapa + DOM katmanında içerik */
export function Label3D({
  id,
  position = [0, 0, 0],
  visible = true,
  distanceFactor,
  interactive = false,
  z = 10,
  children,
}: {
  id: string;
  position?: [number, number, number];
  visible?: boolean;
  distanceFactor?: number;
  interactive?: boolean;
  z?: number;
  children: React.ReactNode;
}) {
  const store = useContext(Ctx);
  const ref = useRef<THREE.Object3D>(null);
  useEffect(() => {
    store?.getState().upsert({ id, obj: ref.current, node: children, visible, distanceFactor, interactive, z });
  });
  useEffect(() => () => store?.getState().remove(id), [store, id]);
  return <object3D ref={ref} position={position} />;
}

/** Sahne içinde: her karede etiketleri ekrana projekte eder. boost: sunum tuvalinde etiketleri büyütür */
export function LabelProjector({ store, boost = 1 }: { store: LabelStore; boost?: number }) {
  const { camera, size } = useThree();
  const v = useRef(new THREE.Vector3());
  const cam = useRef(new THREE.Vector3());
  useFrame(() => {
    const { specs } = store.getState();
    camera.getWorldPosition(cam.current);
    const persp = camera as THREE.PerspectiveCamera;
    const k = 2 * Math.tan(((persp.fov ?? 45) * Math.PI) / 360);
    for (const id in specs) {
      const s = specs[id];
      const el = store.els.get(id);
      if (!el) continue;
      if (!s.visible || !s.obj) {
        el.style.display = "none";
        continue;
      }
      s.obj.getWorldPosition(v.current);
      const dist = v.current.distanceTo(cam.current);
      v.current.project(camera);
      if (v.current.z > 1 || v.current.z < -1) {
        el.style.display = "none";
        continue;
      }
      const x = ((v.current.x + 1) / 2) * size.width;
      const y = ((1 - v.current.y) / 2) * size.height;
      const scale = Math.min(3, (s.distanceFactor ? Math.min(3, Math.max(0.35, s.distanceFactor / (k * dist))) : 1) * boost);
      el.style.display = "block";
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      el.style.zIndex = String(s.z ?? 10);
    }
  });
  return null;
}

/** Sahne dışında: tüm etiketlerin DOM katmanı */
export function LabelLayer({ store }: { store: LabelStore }) {
  const specs = store((s) => s.specs);
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden" aria-hidden={false}>
      {Object.values(specs).map((s) => (
        <div
          key={s.id}
          ref={(el) => {
            if (el) store.els.set(s.id, el);
            else store.els.delete(s.id);
          }}
          className={s.interactive ? "pointer-events-auto" : "pointer-events-none"}
          style={{ position: "absolute", left: 0, top: 0, display: "none", willChange: "transform" }}
        >
          {s.node}
        </div>
      ))}
    </div>
  );
}
