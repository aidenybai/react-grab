"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { Group, Mesh } from "three";
import {
  THREE_AMBIENT_LIGHT_INTENSITY,
  THREE_CAMERA_FIELD_OF_VIEW_DEGREES,
  THREE_CAMERA_POSITION,
  THREE_CUBE_ACTIVE_METALNESS,
  THREE_CUBE_ACTIVE_SCALE,
  THREE_CUBE_INACTIVE_METALNESS,
  THREE_CUBE_INACTIVE_SCALE,
  THREE_CUBE_POSITION,
  THREE_CUBE_ROTATION,
  THREE_CUBE_ROTATION_SPEED,
  THREE_CUBE_SIZE_UNITS,
  THREE_DEVICE_PIXEL_RATIO_RANGE,
  THREE_DIRECTIONAL_LIGHT_INTENSITY,
  THREE_DIRECTIONAL_LIGHT_POSITION,
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
  THREE_GROUP_ROTATION_AMPLITUDE_RADIANS,
  THREE_GROUP_ROTATION_SPEED,
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
  THREE_POINT_LIGHT_INTENSITY,
  THREE_POINT_LIGHT_POSITION,
  THREE_SHAPE_ROUGHNESS,
} from "@/components/demo/constants";

const FloatingKnot = () => {
  const meshRef = useRef<Mesh>(null);
  const [isActive, setIsActive] = useState(false);

  useFrame((frameState, frameDelta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.rotation.x += frameDelta * THREE_KNOT_ROTATION_SPEED;
    mesh.rotation.y += frameDelta * THREE_KNOT_ROTATION_SPEED;
    mesh.position.y =
      THREE_KNOT_POSITION[1] +
      Math.sin(frameState.clock.elapsedTime * THREE_FLOAT_SPEED) * THREE_FLOAT_AMPLITUDE_UNITS;
  });

  return (
    <mesh
      ref={meshRef}
      name="floating-knot"
      position={THREE_KNOT_POSITION}
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
  );
};

FloatingKnot.displayName = "FloatingKnot";

const FloatingDodecahedron = () => {
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

const FloatingCube = () => {
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
