import { useEffect, useRef } from "react";
import { registerThreeScene } from "react-grab/primitives";
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  WebGLRenderer,
} from "three";
import {
  THREE_BOX_SIZE_UNITS,
  THREE_CAMERA_FOV_DEGREES,
  THREE_CAMERA_POSITION_Z_UNITS,
  THREE_LEFT_BOX_POSITION,
  THREE_RIGHT_BOX_POSITION,
} from "./three-fixture-constants";

const createBox = (name: string, color: Color, position: [number, number, number]) => {
  const geometry = new BoxGeometry(
    THREE_BOX_SIZE_UNITS,
    THREE_BOX_SIZE_UNITS,
    THREE_BOX_SIZE_UNITS,
  );
  const material = new MeshStandardMaterial({ color });
  const box = new Mesh(geometry, material);
  box.name = name;
  box.position.set(...position);
  return box;
};

export const ThreeJsFixture = () => {
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
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    const leftBox = createBox("three-js-left-cube", new Color("#a3e635"), THREE_LEFT_BOX_POSITION);
    const rightBox = createBox(
      "three-js-right-cube",
      new Color("#fb923c"),
      THREE_RIGHT_BOX_POSITION,
    );
    const directionalLight = new DirectionalLight("#ffffff", 2);
    directionalLight.position.set(3, 4, 5);
    scene.add(new AmbientLight("#ffffff", 1.5), directionalLight, leftBox, rightBox);

    const renderScene = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const resizeObserver = new ResizeObserver(renderScene);
    resizeObserver.observe(canvas);
    renderScene();
    const unregisterScene = registerThreeScene({ camera, pointer, raycaster, renderer, scene });

    return () => {
      unregisterScene();
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
