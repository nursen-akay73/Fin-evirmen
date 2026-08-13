import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { heroState } from "./heroState.js";

export function FinancialParticles({ anchors, count = 18 }) {
  const points = useRef();
  const { positions, lives, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const lives = new Float32Array(count);
    const velocities = [];
    for (let i = 0; i < count; i += 1) {
      lives[i] = 0;
      velocities.push(new THREE.Vector3());
    }
    return { positions, lives, velocities };
  }, [count]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  useFrame((_, delta) => {
    if (!points.current || heroState.reducedMotion) {
      return;
    }
    const p = heroState.scroll;
    const active = p > 0.5 && p < 0.9;
    const attr = points.current.geometry.attributes.position;
    for (let i = 0; i < count; i += 1) {
      if (lives[i] <= 0) {
        if (active && Math.random() < 0.08 && anchors.length) {
          const origin = anchors[i % anchors.length];
          attr.array[i * 3] = origin[0] + (Math.random() - 0.5) * 0.7;
          attr.array[i * 3 + 1] = origin[1] + (Math.random() - 0.5) * 0.8;
          attr.array[i * 3 + 2] = origin[2] + 0.08;
          velocities[i].set((Math.random() - 0.5) * 0.4, 0.25 + Math.random() * 0.4, (Math.random() - 0.5) * 0.15);
          lives[i] = 0.7 + Math.random() * 1.1;
        } else {
          attr.array[i * 3 + 1] = -20;
        }
        continue;
      }
      lives[i] -= delta;
      attr.array[i * 3] += velocities[i].x * delta;
      attr.array[i * 3 + 1] += velocities[i].y * delta;
      attr.array[i * 3 + 2] += velocities[i].z * delta;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        color="#ffb74d"
        size={0.055}
        transparent
        opacity={0.85}
        depthWrite={false}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
