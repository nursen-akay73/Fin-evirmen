import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getDocumentCanvas } from "./documentTextures.js";
import { heroState } from "./heroState.js";
import vert from "./shaders/documentVertex.glsl?raw";
import frag from "./shaders/documentFragment.glsl?raw";

export function FinancialDocumentPlane({
  kind,
  home,
  rotation,
  scale = 1,
  opacity = 0.3,
  texSize = 384,
}) {
  const group = useRef();
  const material = useRef();
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  const drawn = useMemo(() => getDocumentCanvas(kind, texSize), [kind, texSize]);
  const texture = useMemo(() => {
    const map = new THREE.CanvasTexture(drawn.canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.minFilter = THREE.LinearFilter;
    map.magFilter = THREE.LinearFilter;
    map.generateMipmaps = false;
    map.needsUpdate = true;
    return map;
  }, [drawn]);

  const uniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uTime: { value: 0 },
      uBurn: { value: 0 },
      uEdge: { value: 0 },
      uOpacity: { value: opacity },
      uBlur: { value: 0.0032 },
      uGold: { value: new THREE.Color("#ffb74d") },
    }),
    [texture, opacity]
  );

  const width = scale;
  const height = width / drawn.aspect;

  useFrame((state) => {
    const mesh = group.current;
    const mat = material.current;
    if (!mesh || !mat) {
      return;
    }
    const p = heroState.scroll;
    const reduced = heroState.reducedMotion;
    const t = state.clock.elapsedTime;
    const bob = reduced ? 0 : Math.sin(t * 0.28 + phase) * 0.03;
    const sway = reduced ? 0 : Math.cos(t * 0.22 + phase) * 0.022;
    mesh.position.x = home[0] + sway;
    mesh.position.y = home[1] + bob;
    mesh.position.z = home[2] - p * 0.25;
    mesh.rotation.z = rotation[2] + (reduced ? 0 : Math.sin(t * 0.16 + phase) * 0.018);
    mesh.rotation.y = rotation[1];
    mat.uniforms.uTime.value = t;
    mat.uniforms.uBurn.value = 0;
    mat.uniforms.uEdge.value = 0;
    mat.uniforms.uOpacity.value = opacity * (1 - p * 0.35);
  });

  return (
    <group ref={group} position={home} rotation={rotation}>
      <mesh>
        <planeGeometry args={[width, height, 8, 8]} />
        <shaderMaterial
          ref={material}
          vertexShader={vert}
          fragmentShader={frag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </mesh>
    </group>
  );
}
