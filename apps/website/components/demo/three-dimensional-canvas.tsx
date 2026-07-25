"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { FloatingCube } from "@/components/demo/three-dimensional-objects/floating-cube";
import { FloatingDodecahedron } from "@/components/demo/three-dimensional-objects/floating-dodecahedron";
import { FloatingKnot } from "@/components/demo/three-dimensional-objects/floating-knot";
import {
  THREE_AMBIENT_LIGHT_INTENSITY,
  THREE_CAMERA_FIELD_OF_VIEW_DEGREES,
  THREE_CAMERA_POSITION,
  THREE_DEVICE_PIXEL_RATIO_RANGE,
  THREE_DIRECTIONAL_LIGHT_INTENSITY,
  THREE_DIRECTIONAL_LIGHT_POSITION,
  THREE_GROUP_ROTATION_AMPLITUDE_RADIANS,
  THREE_GROUP_ROTATION_SPEED,
  THREE_POINT_LIGHT_INTENSITY,
  THREE_POINT_LIGHT_POSITION,
} from "@/components/demo/constants";

const ShapeCollection = () => {
  const groupRef = useRef<Group>(null);

  useFrame((frameState) => {
    const group = groupRef.current;
    if (!group) return;
    group.rotation.y =
      Math.sin(frameState.clock.elapsedTime * THREE_GROUP_ROTATION_SPEED) *
      THREE_GROUP_ROTATION_AMPLITUDE_RADIANS;
  });

  return (
    <group ref={groupRef}>
      <FloatingKnot />
      <FloatingDodecahedron />
      <FloatingCube />
    </group>
  );
};

ShapeCollection.displayName = "ShapeCollection";

const ThreeScene = () => (
  <>
    <color attach="background" args={["#101010"]} />
    <ambientLight intensity={THREE_AMBIENT_LIGHT_INTENSITY} />
    <directionalLight
      intensity={THREE_DIRECTIONAL_LIGHT_INTENSITY}
      position={THREE_DIRECTIONAL_LIGHT_POSITION}
    />
    <pointLight
      color="#ff6b2c"
      intensity={THREE_POINT_LIGHT_INTENSITY}
      position={THREE_POINT_LIGHT_POSITION}
    />
    <ShapeCollection />
  </>
);

ThreeScene.displayName = "ThreeScene";

const ThreeDimensionalCanvas = () => (
  <Canvas
    aria-label="Three interactive floating shapes"
    camera={{
      fov: THREE_CAMERA_FIELD_OF_VIEW_DEGREES,
      position: THREE_CAMERA_POSITION,
    }}
    dpr={THREE_DEVICE_PIXEL_RATIO_RANGE}
    role="img"
  >
    <ThreeScene />
  </Canvas>
);

ThreeDimensionalCanvas.displayName = "ThreeDimensionalCanvas";

export default ThreeDimensionalCanvas;
