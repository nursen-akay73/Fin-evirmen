import { useEffect, useState } from "react";
import { heroState } from "./heroState.js";

export function HeroDebug() {
  const [info, setInfo] = useState({
    fps: 0,
    cam: [0, 0, 0],
    meshes: [],
    scroll: 0,
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setInfo({
        fps: heroState.fps,
        cam: heroState.cam.slice(),
        meshes: heroState.meshes.slice(),
        scroll: heroState.scroll,
      });
    }, 200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="hero-gl-debug">
      <strong>WebGL / R3F</strong>
      <div>FPS {info.fps || "—"}</div>
      <div>
        cam {info.cam.map((n) => n.toFixed(2)).join(" ")}
      </div>
      <div>scroll {info.scroll.toFixed(2)}</div>
      {info.meshes.map((mesh) => (
        <div key={mesh.id}>
          {mesh.id} {mesh.x.toFixed(2)} {mesh.y.toFixed(2)} {mesh.z.toFixed(2)}
        </div>
      ))}
    </div>
  );
}
