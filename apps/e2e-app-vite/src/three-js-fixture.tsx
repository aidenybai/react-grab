import { useEffect, useRef } from "react";
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import {
  THREE_AMBIENT_LIGHT_INTENSITY,
  THREE_BOX_SIZE_UNITS,
  THREE_CAMERA_FOV_DEGREES,
  THREE_CAMERA_POSITION_Z_UNITS,
  THREE_DIRECTIONAL_LIGHT_INTENSITY,
  THREE_DIRECTIONAL_LIGHT_POSITION,
  THREE_LEFT_BOX_POSITION,
  THREE_RIGHT_BOX_POSITION,
  THREE_ROTATION_RADIANS_PER_FRAME,
} from "./three-fixture-constants";

declare global {
  interface Window {
    __REACT_GRAB_THREE_JS_FRAME_COUNT__?: number;
  }
}

const createTestBox = (
  name: string,
  color: Color,
  position: [number, number, number],
): Mesh<BoxGeometry, MeshStandardMaterial> => {
  const geometry = new BoxGeometry(
    THREE_BOX_SIZE_UNITS,
    THREE_BOX_SIZE_UNITS,
    THREE_BOX_SIZE_UNITS,
  );
  const material = new MeshStandardMaterial({ color });
  const boxMesh = new Mesh(geometry, material);
  boxMesh.name = name;
  boxMesh.position.set(...position);
  return boxMesh;
};

export const ThreeJsFixture = (): React.JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new WebGLRenderer({ antialias: true, canvas });
    const scene = new Scene();
    scene.background = new Color("#020617");
    const camera = new PerspectiveCamera(
      THREE_CAMERA_FOV_DEGREES,
      canvas.clientWidth / canvas.clientHeight,
    );
    camera.position.z = THREE_CAMERA_POSITION_Z_UNITS;
    const leftBox = createTestBox(
      "three-js-left-cube",
      new Color("#a3e635"),
      THREE_LEFT_BOX_POSITION,
    );
    const rightBox = createTestBox(
      "three-js-right-cube",
      new Color("#fb923c"),
      THREE_RIGHT_BOX_POSITION,
    );
    const directionalLight = new DirectionalLight("#ffffff", THREE_DIRECTIONAL_LIGHT_INTENSITY);
    directionalLight.position.set(...THREE_DIRECTIONAL_LIGHT_POSITION);
    scene.add(
      new AmbientLight("#ffffff", THREE_AMBIENT_LIGHT_INTENSITY),
      directionalLight,
      leftBox,
      rightBox,
    );

    const renderScene = (): void => {
      leftBox.rotation.x += THREE_ROTATION_RADIANS_PER_FRAME;
      leftBox.rotation.y += THREE_ROTATION_RADIANS_PER_FRAME;
      rightBox.rotation.x += THREE_ROTATION_RADIANS_PER_FRAME;
      rightBox.rotation.y += THREE_ROTATION_RADIANS_PER_FRAME;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      window.__REACT_GRAB_THREE_JS_FRAME_COUNT__ =
        (window.__REACT_GRAB_THREE_JS_FRAME_COUNT__ ?? 0) + 1;
    };
    const resizeObserver = new ResizeObserver(renderScene);
    resizeObserver.observe(canvas);
    renderer.setAnimationLoop(renderScene);

    return () => {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      leftBox.geometry.dispose();
      leftBox.material.dispose();
      rightBox.geometry.dispose();
      rightBox.material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <section className="border rounded-lg p-4" data-testid="three-js-section">
      <h2 className="text-lg font-bold mb-4">Three.js Scene</h2>
      <div className="h-80 overflow-hidden rounded-lg bg-slate-950">
        <canvas className="h-full w-full" data-testid="three-js-canvas" ref={canvasRef} />
      </div>
    </section>
  );
};
