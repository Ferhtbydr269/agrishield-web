"use client";
/**
 * Kamera: OrbitControls (yer altına girilmez: polar 0,15π–0,48π; mesafe 6–160), preset geçişleri ~900 ms
 * damp ile (konum ve hedef birlikte, asla ani kesme yok). Sahne modunda boşta 8 sn sonra 0,02 rad/s dönüş.
 */
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { PRESETS, START_CAMERA } from "./layout";

export function CameraRig({ preset, presetNonce, autoRotate, reducedMotion, onUserInteract }: { preset: number; presetNonce: number; autoRotate: boolean; reducedMotion: boolean; onUserInteract?: () => void }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const anim = useRef<{ active: boolean; pos: THREE.Vector3; target: THREE.Vector3 }>({ active: false, pos: new THREE.Vector3(...START_CAMERA.position), target: new THREE.Vector3(...START_CAMERA.target) });
  const idle = useRef(0);

  useEffect(() => {
    const p = PRESETS.find((x) => x.key === preset) ?? PRESETS[0];
    anim.current.pos.set(...p.position);
    anim.current.target.set(...p.target);
    anim.current.active = true;
    const c = controls.current;
    if (c) {
      c.minDistance = p.minDistance;
      // kesit presetinde kamera yere yakın olmalı
      c.maxPolarAngle = preset === 3 ? 0.49 * Math.PI : 0.48 * Math.PI;
    }
    if (reducedMotion) {
      camera.position.copy(anim.current.pos);
      c?.target.copy(anim.current.target);
      c?.update();
      anim.current.active = false;
    }
  }, [preset, presetNonce, camera, reducedMotion]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    const a = anim.current;
    if (a.active) {
      // λ=5 → ~900 ms'de hedefe oturur
      camera.position.x = THREE.MathUtils.damp(camera.position.x, a.pos.x, 5, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, a.pos.y, 5, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, a.pos.z, 5, dt);
      c.target.x = THREE.MathUtils.damp(c.target.x, a.target.x, 5, dt);
      c.target.y = THREE.MathUtils.damp(c.target.y, a.target.y, 5, dt);
      c.target.z = THREE.MathUtils.damp(c.target.z, a.target.z, 5, dt);
      if (camera.position.distanceTo(a.pos) < 0.02 && c.target.distanceTo(a.target) < 0.02) a.active = false;
    }
    idle.current += dt;
    c.autoRotate = autoRotate && !reducedMotion && !a.active && idle.current > 8;
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minPolarAngle={0.15 * Math.PI}
      maxPolarAngle={0.48 * Math.PI}
      minDistance={6}
      maxDistance={160}
      autoRotateSpeed={0.19}
      target={START_CAMERA.target}
      onStart={() => {
        idle.current = 0;
        anim.current.active = false;
        onUserInteract?.();
      }}
    />
  );
}
