import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import {
  THREE_AMBIENT_LIGHT_INTENSITY,
  THREE_BOX_SIZE_UNITS,
  THREE_CAMERA_FOV_DEGREES,
  THREE_CAMERA_POSITION_Z_UNITS,
  THREE_DEVICE_PIXEL_RATIO,
  THREE_DIRECTIONAL_LIGHT_INTENSITY,
  THREE_DIRECTIONAL_LIGHT_POSITION,
  THREE_LEFT_BOX_POSITION,
  THREE_RIGHT_BOX_POSITION,
} from "./three-fixture-constants";

declare global {
  interface Window {
    __REACT_GRAB_THREE_FRAME_COUNT__?: number;
  }
}

interface ThreeGrabBoxProps {
  color: string;
  name: string;
  position: [number, number, number];
}

const ThreeGrabBox = (props: ThreeGrabBoxProps): React.JSX.Element => (
  <mesh name={props.name} position={props.position} onClick={() => undefined}>
    <boxGeometry args={[THREE_BOX_SIZE_UNITS, THREE_BOX_SIZE_UNITS, THREE_BOX_SIZE_UNITS]} />
    <meshStandardMaterial color={props.color} />
  </mesh>
);

const DecorativePoints = (): React.JSX.Element => {
  const positions = useMemo(
    () => new Float32Array([...THREE_LEFT_BOX_POSITION, ...THREE_RIGHT_BOX_POSITION]),
    [],
  );

  return (
    <points name="decorative-points" position={[0, 0, 1]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.08} />
    </points>
  );
};

const FrameCounter = (): null => {
  useFrame(() => {
    window.__REACT_GRAB_THREE_FRAME_COUNT__ = (window.__REACT_GRAB_THREE_FRAME_COUNT__ ?? 0) + 1;
  });
  return null;
};

export const ThreeFiberFixture = (): React.JSX.Element => (
  <section className="border rounded-lg p-4" data-testid="three-fiber-section">
    <h2 className="text-lg font-bold mb-4">React Three Fiber Scene</h2>
    <div className="h-80 overflow-hidden rounded-lg bg-slate-950">
      <Canvas
        camera={{ position: [0, 0, THREE_CAMERA_POSITION_Z_UNITS], fov: THREE_CAMERA_FOV_DEGREES }}
        data-testid="three-fiber-canvas"
        dpr={THREE_DEVICE_PIXEL_RATIO}
      >
        <FrameCounter />
        <ambientLight intensity={THREE_AMBIENT_LIGHT_INTENSITY} />
        <directionalLight
          position={THREE_DIRECTIONAL_LIGHT_POSITION}
          intensity={THREE_DIRECTIONAL_LIGHT_INTENSITY}
        />
        <DecorativePoints />
        <ThreeGrabBox color="#38bdf8" name="left-cube" position={THREE_LEFT_BOX_POSITION} />
        <ThreeGrabBox color="#f472b6" name="right-cube" position={THREE_RIGHT_BOX_POSITION} />
      </Canvas>
    </div>
  </section>
);
