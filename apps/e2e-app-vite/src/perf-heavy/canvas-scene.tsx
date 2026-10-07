import { useEffect, useMemo, useRef } from "react";
import {
  CANVAS_HEIGHT_PX,
  CANVAS_MARKER_COUNT,
  CANVAS_PARTICLE_COUNT,
  CANVAS_WIDTH_PX,
} from "./constants";
import { createSeededRandom } from "./synthetic-data";

interface CanvasParticle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  radius: number;
  hue: number;
}

// A map/game-style canvas that repaints every animation frame, with DOM
// marker chips absolutely positioned over it (the "map pin" pattern).
// react-grab hit-tests and draws its overlay while the main thread is
// already committed to a per-frame paint loop.
export const CanvasSceneSection = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const markers = useMemo(() => {
    const random = createSeededRandom(0x9a97);
    return Array.from({ length: CANVAS_MARKER_COUNT }, (_, markerIndex) => ({
      id: markerIndex,
      left: Math.floor(random() * (CANVAS_WIDTH_PX - 120)) + 20,
      top: Math.floor(random() * (CANVAS_HEIGHT_PX - 60)) + 20,
    }));
  }, []);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    const renderingContext = canvasElement?.getContext("2d");
    if (!canvasElement || !renderingContext) return;

    const random = createSeededRandom(0xca57);
    const particles: CanvasParticle[] = Array.from({ length: CANVAS_PARTICLE_COUNT }, () => ({
      x: random() * CANVAS_WIDTH_PX,
      y: random() * CANVAS_HEIGHT_PX,
      velocityX: (random() - 0.5) * 4,
      velocityY: (random() - 0.5) * 4,
      radius: random() * 4 + 1,
      hue: Math.floor(random() * 360),
    }));

    let frameHandle = 0;
    const paintFrame = (): void => {
      renderingContext.fillStyle = "rgba(15, 23, 42, 0.35)";
      renderingContext.fillRect(0, 0, CANVAS_WIDTH_PX, CANVAS_HEIGHT_PX);
      for (const particle of particles) {
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;
        if (particle.x < 0 || particle.x > CANVAS_WIDTH_PX) particle.velocityX *= -1;
        if (particle.y < 0 || particle.y > CANVAS_HEIGHT_PX) particle.velocityY *= -1;
        renderingContext.beginPath();
        renderingContext.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        renderingContext.fillStyle = `hsl(${particle.hue}, 70%, 60%)`;
        renderingContext.fill();
      }
      frameHandle = requestAnimationFrame(paintFrame);
    };
    frameHandle = requestAnimationFrame(paintFrame);
    return () => cancelAnimationFrame(frameHandle);
  }, []);

  return (
    <section data-testid="heavy-canvas-section" className="flex flex-col gap-3 p-4">
      <h2 className="text-lg font-bold">
        Canvas Scene ({CANVAS_PARTICLE_COUNT} particles @ 60fps)
      </h2>
      <div className="relative w-fit" data-testid="canvas-stage">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH_PX}
          height={CANVAS_HEIGHT_PX}
          data-testid="heavy-canvas"
          className="rounded border bg-slate-900"
        />
        {markers.map((marker) => (
          <button
            key={marker.id}
            type="button"
            data-canvas-marker={marker.id}
            data-testid={`canvas-marker-${marker.id}`}
            className="absolute rounded-full border border-white/40 bg-white/90 px-2 py-0.5 font-mono text-[10px] shadow"
            style={{ left: marker.left, top: marker.top }}
          >
            pin {marker.id}
          </button>
        ))}
      </div>
    </section>
  );
};
