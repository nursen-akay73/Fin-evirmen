import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { FinancialDocumentPlane } from "./FinancialDocumentPlane.jsx";
import { heroState, pulseLogo } from "./heroState.js";

const ALL_DOCS = [
  { id: "dekont", kind: "dekont", home: [-1.85, 0.62, -4.2], rotation: [-0.12, 0.38, -0.08], scale: 1.05, start: 1, opacity: 0.34 },
  { id: "sozlesme", kind: "sozlesme", home: [-2.25, -0.72, -5.6], rotation: [0.1, 0.42, 0.06], scale: 0.92, start: 1, opacity: 0.26 },
  { id: "havale", kind: "havale", home: [-1.45, 0.08, -7.1], rotation: [0.08, -0.28, 0.04], scale: 1.12, start: 1, opacity: 0.2 },
];

function pickDocs() {
  const width = window.innerWidth;
  if (width < 700) {
    return ALL_DOCS.slice(0, 2);
  }
  return ALL_DOCS;
}

function CameraRig() {
  const { camera } = useThree();
  const pulsed = useRef(false);

  useFrame(() => {
    const reduced = heroState.reducedMotion;
    const p = heroState.scroll;
    const targetX = reduced ? -0.15 : -0.15 + heroState.pointerX * 0.12;
    const targetY = reduced ? 0.06 : 0.06 - heroState.pointerY * 0.08;
    const targetZ = reduced ? 6.2 : 6.2 + p * 0.4;
    camera.position.x += (targetX - camera.position.x) * 0.03;
    camera.position.y += (targetY - camera.position.y) * 0.03;
    camera.position.z += (targetZ - camera.position.z) * 0.03;
    camera.lookAt(-1.6, 0.02, -3.4);

    if (!reduced && p > 0.74 && !pulsed.current) {
      pulsed.current = true;
      pulseLogo();
    }
    if (p < 0.58) {
      pulsed.current = false;
    }
  });
  return null;
}

export function HeroWebGLScene() {
  const docs = pickDocs();
  const mobile = typeof window !== "undefined" && window.innerWidth < 700;
  const texSize = mobile ? 256 : 384;

  return (
    <>
      <PerspectiveCamera makeDefault fov={36} position={[-0.15, 0.06, 6.2]} near={0.1} far={22} />
      <fog attach="fog" args={["#0b1220", 4.8, 10.5]} />
      <CameraRig />
      {docs.map((doc) => (
        <FinancialDocumentPlane key={doc.id} {...doc} texSize={texSize} />
      ))}
    </>
  );
}
