"use client";

import { lazy, Suspense, useEffect, useState } from "react";

const ThreeDimensionalCanvas = lazy(() => import("@/components/demo/three-dimensional-canvas"));

export const ThreeDimensionalScene = () => {
  const [isReactGrabReady, setIsReactGrabReady] = useState(false);

  useEffect(() => {
    const showThreeDimensionalCanvas = () => setIsReactGrabReady(true);

    window.addEventListener("react-grab:init", showThreeDimensionalCanvas);
    if ("__REACT_GRAB__" in window) showThreeDimensionalCanvas();

    return () => window.removeEventListener("react-grab:init", showThreeDimensionalCanvas);
  }, []);

  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <div className="relative h-80 bg-[#101010] sm:h-96">
        {isReactGrabReady ? (
          <Suspense fallback={null}>
            <ThreeDimensionalCanvas />
          </Suspense>
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <span className="font-mono text-xs uppercase tracking-widest text-white/45">
            React Three Fiber
          </span>
          <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-white/45">
            <span className="size-1.5 rounded-full bg-brand" />
            Live scene
          </span>
        </div>
        <p className="pointer-events-none absolute inset-x-0 bottom-0 p-4 text-center text-xs text-white/50">
          Grab a shape to resolve its mesh and component. Click one to change its material.
        </p>
      </div>
    </div>
  );
};

ThreeDimensionalScene.displayName = "ThreeDimensionalScene";
