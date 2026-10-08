"use client";
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { MotionValue } from "framer-motion";
import type { Remaining } from "@/hooks/useCountdown";

const pad = (n: number) => String(n).padStart(2, "0");

function drawScreen(ctx: CanvasRenderingContext2D, r: Remaining) {
  const W = 1024, H = 640;
  ctx.fillStyle = "#050a08";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#0e1c17";
  ctx.fillRect(0, 0, W, 44);
  ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(30 + i * 28, 22, 8, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.textAlign = "center";
  ctx.fillStyle = "#8fb5a5";
  ctx.font = "500 34px monospace";
  ctx.fillText("event.starts_in()", W / 2, 130);
  const cols = [
    [String(r.days), "DAYS"], [pad(r.hours), "HOURS"], [pad(r.minutes), "MIN"], [pad(r.seconds), "SEC"],
  ];
  cols.forEach(([v, l], i) => {
    const x = 130 + i * 255;
    ctx.fillStyle = "#facc15";
    ctx.shadowColor = "rgba(250,204,21,0.55)";
    ctx.shadowBlur = 18;
    ctx.font = "700 150px monospace";
    ctx.fillText(v, x, 340);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#8fb5a5";
    ctx.font = "500 30px monospace";
    ctx.fillText(l, x, 400);
    if (i < 3) {
      ctx.fillStyle = "#facc15";
      ctx.shadowColor = "rgba(250,204,21,0.45)";
      ctx.shadowBlur = 14;
      ctx.font = "700 120px monospace";
      ctx.fillText(":", x + 128, 330);
      ctx.shadowBlur = 0;
    }
  });
  ctx.fillStyle = "#14b8a6";
  ctx.font = "500 30px monospace";
  ctx.fillText(r.done ? "// it's happening" : "// Thinking Beyond Borders", W / 2, 540);
}

function Laptop({ remaining, progress }: { remaining: Remaining; progress: MotionValue<number> }) {
  const group = useRef<THREE.Group>(null);
  const { camera, size } = useThree();

  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 640;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return { canvas, texture };
  }, []);

  useEffect(() => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawScreen(ctx, remaining);
    texture.needsUpdate = true;
  }, [remaining, canvas, texture]);

  const keys = useMemo(() => {
    const out: [number, number][] = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 14; c++) out.push([-1.45 + c * 0.223, -0.5 + r * 0.2]);
    return out;
  }, []);

  useFrame((state) => {
    const aspect = size.width / size.height;
    const target = Math.max(5.4, 5.2 / aspect);
    camera.position.z += (target - camera.position.z) * 0.1;
    camera.position.y = 1.3;
    camera.lookAt(0, 0.75, 0);
    const p = progress.get();
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const ry = -0.7 + p * 1.5 + Math.sin(t * 0.3) * 0.04;
    const rx = 0.05 + p * 0.25;
    g.rotation.y += (ry - g.rotation.y) * 0.06;
    g.rotation.x += (rx - g.rotation.x) * 0.06;
    g.position.y = -0.2 + Math.sin(t * 0.6) * 0.03;
  });

  const grey = "#9aa0a6";
  return (
    <group ref={group}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3.5, 0.14, 2.3]} />
        <meshStandardMaterial color={grey} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.075, 0.05]}>
        <boxGeometry args={[3.3, 0.02, 2.0]} />
        <meshStandardMaterial color="#5f6368" metalness={0.3} roughness={0.7} />
      </mesh>
      {keys.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.095, z - 0.2]}>
          <boxGeometry args={[0.18, 0.03, 0.16]} />
          <meshStandardMaterial color="#2b2e31" roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.088, 0.68]}>
        <boxGeometry args={[1.0, 0.01, 0.55]} />
        <meshStandardMaterial color="#7d8288" metalness={0.5} roughness={0.35} />
      </mesh>
      <group position={[0, 0.07, -1.15]} rotation={[-0.2, 0, 0]}>
        <mesh position={[0, 1.15, 0]}>
          <boxGeometry args={[3.5, 2.3, 0.1]} />
          <meshStandardMaterial color={grey} metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.15, 0.052]}>
          <planeGeometry args={[3.3, 2.1]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

export default function Hero3D({ remaining, progress }: { remaining: Remaining; progress: MotionValue<number> }) {
  return (
    <Canvas dpr={[1, 1.6]} camera={{ position: [0, 1.3, 6], fov: 40 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={1.1} />
      <hemisphereLight args={["#e8fff6", "#04140e", 0.8]} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} />
      <pointLight position={[-4, 2, 3]} intensity={30} color="#14b8a6" />
      <pointLight position={[4, 1, -3]} intensity={20} color="#059669" />
      <Laptop remaining={remaining} progress={progress} />
    </Canvas>
  );
}
