import { Canvas } from "@react-three/fiber";
import {
  THREE_BOX_SIZE_UNITS,
  THREE_CAMERA_FOV_DEGREES,
  THREE_CAMERA_POSITION_Z_UNITS,
  THREE_LEFT_BOX_POSITION,
  THREE_RIGHT_BOX_POSITION,
} from "./three-fixture-constants";

interface ThreeGrabBoxProps {
  color: string;
  name: string;
  position: [number, number, number];
}

const ThreeGrabBox = (props: ThreeGrabBoxProps) => (
  <mesh name={props.name} position={props.position}>
    <boxGeometry args={[THREE_BOX_SIZE_UNITS, THREE_BOX_SIZE_UNITS, THREE_BOX_SIZE_UNITS]} />
    <meshStandardMaterial color={props.color} />
  </mesh>
);

export const ThreeFiberFixture = () => (
  <section className="border rounded-lg p-4" data-testid="three-fiber-section">
    <h2 className="text-lg font-bold mb-4">React Three Fiber Scene</h2>
    <div className="h-80 overflow-hidden rounded-lg bg-slate-950">
      <Canvas
        camera={{ position: [0, 0, THREE_CAMERA_POSITION_Z_UNITS], fov: THREE_CAMERA_FOV_DEGREES }}
        data-testid="three-fiber-canvas"
        dpr={1}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[3, 4, 5]} intensity={2} />
        <ThreeGrabBox color="#38bdf8" name="left-cube" position={THREE_LEFT_BOX_POSITION} />
        <ThreeGrabBox color="#f472b6" name="right-cube" position={THREE_RIGHT_BOX_POSITION} />
      </Canvas>
    </div>
  </section>
);
