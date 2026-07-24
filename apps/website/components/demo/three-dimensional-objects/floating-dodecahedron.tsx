"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { Mesh } from "three";
import {
  THREE_DODECAHEDRON_ACTIVE_METALNESS,
  THREE_DODECAHEDRON_ACTIVE_SCALE,
  THREE_DODECAHEDRON_DETAIL,
  THREE_DODECAHEDRON_INACTIVE_METALNESS,
  THREE_DODECAHEDRON_INACTIVE_SCALE,
  THREE_DODECAHEDRON_POSITION,
  THREE_DODECAHEDRON_RADIUS_UNITS,
  THREE_DODECAHEDRON_ROTATION_SPEED,
  THREE_FLOAT_AMPLITUDE_UNITS,
  THREE_FLOAT_SPEED,
  THREE_SHAPE_ROUGHNESS,
} from "@/components/demo/constants";

export const FloatingDodecahedron = () => {
  const meshRef = useRef<Mesh>(null);
  const [isActive, setIsActive] = useState(false);

  useFrame((frameState, frameDelta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.rotation.x -= frameDelta * THREE_DODECAHEDRON_ROTATION_SPEED;
    mesh.rotation.y += frameDelta * THREE_DODECAHEDRON_ROTATION_SPEED;
    mesh.position.y =
      THREE_DODECAHEDRON_POSITION[1] -
      Math.sin(frameState.clock.elapsedTime * THREE_FLOAT_SPEED) * THREE_FLOAT_AMPLITUDE_UNITS;
  });

  return (
    <mesh
      ref={meshRef}
      name="floating-dodecahedron"
      position={THREE_DODECAHEDRON_POSITION}
      scale={isActive ? THREE_DODECAHEDRON_ACTIVE_SCALE : THREE_DODECAHEDRON_INACTIVE_SCALE}
      onClick={(event) => {
        event.stopPropagation();
        setIsActive((wasActive) => !wasActive);
      }}
    >
      <dodecahedronGeometry args={[THREE_DODECAHEDRON_RADIUS_UNITS, THREE_DODECAHEDRON_DETAIL]} />
      <meshStandardMaterial
        color={isActive ? "#f5f1e8" : "#d8d2c5"}
        metalness={
          isActive ? THREE_DODECAHEDRON_ACTIVE_METALNESS : THREE_DODECAHEDRON_INACTIVE_METALNESS
        }
        roughness={THREE_SHAPE_ROUGHNESS}
      />
    </mesh>
  );
};

FloatingDodecahedron.displayName = "FloatingDodecahedron";
