"use client";

import React, { useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";
import * as THREE from "three";
import Image from "next/image";
import { type ModelFamily } from "@/lib/chat-store";

// ----- Texture mapping by model family -----
const TEXTURE_MAP: Record<ModelFamily | string, string> = {
  auto: "/uncgpt.png",
  claude: "/claude-icon.svg",
  llama: "/llama.png",
  qwen: "/qwen.png",
  kiwi: "/kiwi.png",
  deepseek: "/deepseek.png",
  gemma: "/gemma.png",
  glm: "/glm.png",
  "gpt-oss": "/gpt-oss.png",
  default: "/uncgpt.png",
};

// ----- Sphere with texture loading + fallback -----
function ModelSphere({ family }: { family?: ModelFamily }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texturePath = TEXTURE_MAP[family ?? "default"] ?? TEXTURE_MAP.default;

  // Try to load texture, fallback to null if missing
  const texture = React.useMemo(() => {
    try {
      const tex = new THREE.TextureLoader().load(
        texturePath,
        undefined,
        undefined,
      );
      return tex;
    } catch {
      return null;
    }
  }, [texturePath]);

  // Use texture if available, else use a fallback color
  const colorMap: Record<ModelFamily | string, string> = {
    auto: "#a855f7",
    claude: "#3b82f6",
    llama: "#22c55e",
    qwen: "#f97316",
    kiwi: "#06b6d4",
    deepseek: "#0ea5e9",
    gemma: "#facc15",
    glm: "#ef4444",
    "gpt-oss": "#10b981",
    default: "#a855f7",
  };

  const fallbackColor = colorMap[family ?? "default"] ?? colorMap.default;

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]}>
      {texture ? (
        <meshStandardMaterial map={texture} roughness={0.8} metalness={0.2} />
      ) : (
        <meshStandardMaterial color={fallbackColor} roughness={0.5} metalness={0.1} />
      )}
    </Sphere>
  );
}

// ----- Main exported component -----
interface MarsAvatarProps {
  model?: string; // model value from MODELS
  family?: ModelFamily; // "auto" | "claude" | "llama" | "qwen" | "kiwi" | ...
  size?: number;
  useSimpleIcon?: boolean; // If true, use simple 2D icon instead of 3D sphere
}

export function MarsAvatar({ model, family, size = 32, useSimpleIcon = false }: MarsAvatarProps) {
  // Determine family from model if not provided
  let determinedFamily = family;
  if (!determinedFamily && model) {
    const m = model.toLowerCase();
    if (m === "auto") determinedFamily = "auto";
    else if (m.includes("claude")) determinedFamily = "claude";
    else if (m.includes("llama")) determinedFamily = "llama";
    else if (m.includes("qwen")) determinedFamily = "qwen";
    else if (m.includes("kiwi") || m.includes("kimi")) determinedFamily = "kiwi";
    else if (m.includes("deepseek")) determinedFamily = "deepseek";
    else if (m.includes("gemma")) determinedFamily = "gemma";
    else if (m.includes("glm")) determinedFamily = "glm";
    else if (m.includes("gpt-oss")) determinedFamily = "gpt-oss";
  }

  determinedFamily = determinedFamily ?? "auto";

  // Simple icon mode (faster, no 3D rendering)
  if (useSimpleIcon) {
    const iconMap: Record<ModelFamily, string> = {
      auto: "/uncgpt.png",
      claude: "/claude-icon.svg",
      llama: "/llama.png",
      qwen: "/qwen.png",
      kiwi: "/kiwi.png",
      deepseek: "/deepseek.png",
      gemma: "/gemma.png",
      glm: "/glm.png",
      "gpt-oss": "/gpt-oss.png",
    };

    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full overflow-hidden bg-black flex items-center justify-center"
      >
        <Image
          src={iconMap[determinedFamily] || iconMap.auto}
          alt={determinedFamily}
          width={size}
          height={size}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // 3D sphere mode
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full overflow-hidden bg-black"
    >
      <Canvas camera={{ position: [0, 0, 2.5], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 5, 5]} intensity={1.2} />
        <Suspense fallback={null}>
          <ModelSphere family={determinedFamily} />
        </Suspense>
      </Canvas>
    </div>
  );
}
