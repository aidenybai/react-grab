"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { Mesh } from "three";
import {
  THREE_CUBE_ACTIVE_METALNESS,
  THREE_CUBE_ACTIVE_SCALE,
  THREE_CUBE_INACTIVE_METALNESS,
  THREE_CUBE_INACTIVE_SCALE,
  THREE_CUBE_POSITION,
  THREE_CUBE_ROTATION,
  THREE_CUBE_ROTATION_SPEED,
  THREE_CUBE_SIZE_UNITS,
  THREE_FLOAT_AMPLITUDE_UNITS,
  THREE_FLOAT_SPEED,
  THREE_SHAPE_ROUGHNESS,
} from "@/components/demo/constants";

export const FloatingCube = () => {
  const meshRef = useRef<Mesh>(null);
  const [isActive, setIsActive] = useState(false);

  useFrame((frameState, frameDelta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.rotation.x += frameDelta * THREE_CUBE_ROTATION_SPEED;
    mesh.rotation.z -= frameDelta * THREE_CUBE_ROTATION_SPEED;
    mesh.position.y =
      THREE_CUBE_POSITION[1] +
      Math.cos(frameState.clock.elapsedTime * THREE_FLOAT_SPEED) * THREE_FLOAT_AMPLITUDE_UNITS;
  });

  return (
    <mesh
      ref={meshRef}
      name="floating-cube"
      position={THREE_CUBE_POSITION}
      rotation={THREE_CUBE_ROTATION}
      scale={isActive ? THREE_CUBE_ACTIVE_SCALE : THREE_CUBE_INACTIVE_SCALE}
      onClick={(event) => {
        event.stopPropagation();
        setIsActive((wasActive) => !wasActive);
      }}
    >
      <boxGeometry args={[THREE_CUBE_SIZE_UNITS, THREE_CUBE_SIZE_UNITS, THREE_CUBE_SIZE_UNITS]} />
      <meshStandardMaterial
        color={isActive ? "#6c85ff" : "#465dd8"}
        metalness={isActive ? THREE_CUBE_ACTIVE_METALNESS : THREE_CUBE_INACTIVE_METALNESS}
        roughness={THREE_SHAPE_ROUGHNESS}
      />
    </mesh>
  );
};

FloatingCube.displayName = "FloatingCube";
