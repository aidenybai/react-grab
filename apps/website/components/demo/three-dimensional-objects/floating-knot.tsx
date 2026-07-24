"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { Mesh } from "three";
import {
  THREE_FLOAT_AMPLITUDE_UNITS,
  THREE_FLOAT_SPEED,
  THREE_KNOT_ACTIVE_METALNESS,
  THREE_KNOT_ACTIVE_SCALE,
  THREE_KNOT_INACTIVE_METALNESS,
  THREE_KNOT_INACTIVE_SCALE,
  THREE_KNOT_POSITION,
  THREE_KNOT_RADIAL_SEGMENTS,
  THREE_KNOT_RADIUS_UNITS,
  THREE_KNOT_ROTATION_SPEED,
  THREE_KNOT_TUBE_SEGMENTS,
  THREE_KNOT_TUBE_UNITS,
  THREE_SHAPE_ROUGHNESS,
} from "@/components/demo/constants";

export const FloatingKnot = () => {
  const meshRef = useRef<Mesh>(null);
  const [isActive, setIsActive] = useState(false);

  useFrame((frameState, frameDelta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.rotation.x += frameDelta * THREE_KNOT_ROTATION_SPEED;
    mesh.rotation.y += frameDelta * THREE_KNOT_ROTATION_SPEED;
    mesh.position.y =
      Math.sin(frameState.clock.elapsedTime * THREE_FLOAT_SPEED) * THREE_FLOAT_AMPLITUDE_UNITS;
  });

  return (
    <group position={THREE_KNOT_POSITION}>
      <mesh
        ref={meshRef}
        name="floating-knot"
        scale={isActive ? THREE_KNOT_ACTIVE_SCALE : THREE_KNOT_INACTIVE_SCALE}
        onClick={(event) => {
          event.stopPropagation();
          setIsActive((wasActive) => !wasActive);
        }}
      >
        <torusKnotGeometry
          args={[
            THREE_KNOT_RADIUS_UNITS,
            THREE_KNOT_TUBE_UNITS,
            THREE_KNOT_TUBE_SEGMENTS,
            THREE_KNOT_RADIAL_SEGMENTS,
          ]}
        />
        <meshStandardMaterial
          color={isActive ? "#ff8b4c" : "#ff6b2c"}
          metalness={isActive ? THREE_KNOT_ACTIVE_METALNESS : THREE_KNOT_INACTIVE_METALNESS}
          roughness={THREE_SHAPE_ROUGHNESS}
        />
      </mesh>
    </group>
  );
};

FloatingKnot.displayName = "FloatingKnot";
