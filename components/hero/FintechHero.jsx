import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { HeroWebGLScene } from "./HeroWebGLScene.jsx";
import { HeroDebug } from "./HeroDebug.jsx";
import { heroState } from "./heroState.js";

export function FintechHero() {
  return (
    <>
      <Canvas
        className="hero-gl-canvas"
        gl={{
          alpha: true,
          antialias: window.innerWidth >= 900,
          powerPreference: "high-performance",
          stencil: false,
          toneMapping: THREE.NoToneMapping,
        }}
        dpr={[1, 1.25]}
        camera={{ fov: 40, position: [-1.35, 0.18, 5.7], near: 0.1, far: 28 }}
        style={{ pointerEvents: "none" }}
        frameloop={heroState.reducedMotion ? "demand" : "always"}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <HeroWebGLScene />
      </Canvas>
      {heroState.debug ? <HeroDebug /> : null}
    </>
  );
}
