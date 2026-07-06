import { useEffect, useRef } from "react";
import { RAF_MUTATOR_COUNT, WAAPI_ANIMATION_COUNT } from "./constants";

// Two animation populations that stress different react-grab mechanisms:
//
// - WAAPI tiles (element.animate): visible to document.getAnimations(), so
//   the activate/deactivate freeze path must collect, pause, and resume every
//   one of them.
// - rAF mutator tiles (style.transform written from a rAF loop): invisible to
//   getAnimations and unfreezable by design — while selection is active their
//   bounds keep changing every frame, so selection/bounds tracking has to
//   chase live geometry instead of a frozen snapshot.
export const AnimationStormSection = () => {
  const waapiContainerRef = useRef<HTMLDivElement>(null);
  const mutatorContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const waapiContainer = waapiContainerRef.current;
    if (!waapiContainer) return;
    const runningAnimations: Animation[] = [];
    for (const tileElement of waapiContainer.querySelectorAll<HTMLElement>("[data-waapi-tile]")) {
      const tileIndex = Number(tileElement.dataset.waapiTile);
      runningAnimations.push(
        tileElement.animate(
          [
            { transform: "translate(0px, 0px) rotate(0deg)" },
            {
              transform: `translate(${(tileIndex % 7) * 4}px, ${(tileIndex % 5) * 4}px) rotate(180deg)`,
            },
            { transform: "translate(0px, 0px) rotate(360deg)" },
          ],
          { duration: 1200 + (tileIndex % 10) * 150, iterations: Infinity },
        ),
      );
    }
    return () => {
      for (const animation of runningAnimations) animation.cancel();
    };
  }, []);

  useEffect(() => {
    const mutatorContainer = mutatorContainerRef.current;
    if (!mutatorContainer) return;
    const mutatorElements = Array.from(
      mutatorContainer.querySelectorAll<HTMLElement>("[data-raf-mutator]"),
    );
    let frameHandle = 0;
    const mutateFrame = (timestamp: number): void => {
      for (let mutatorIndex = 0; mutatorIndex < mutatorElements.length; mutatorIndex++) {
        const phase = timestamp / 400 + mutatorIndex;
        mutatorElements[mutatorIndex].style.transform =
          `translate(${Math.sin(phase) * 14}px, ${Math.cos(phase) * 10}px)`;
      }
      frameHandle = requestAnimationFrame(mutateFrame);
    };
    frameHandle = requestAnimationFrame(mutateFrame);
    return () => cancelAnimationFrame(frameHandle);
  }, []);

  return (
    <section data-testid="heavy-animation-storm-section" className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-bold">
        Animation Storm ({WAAPI_ANIMATION_COUNT} WAAPI + {RAF_MUTATOR_COUNT} rAF mutators)
      </h2>
      <div ref={waapiContainerRef} className="flex flex-wrap gap-2" data-testid="waapi-grid">
        {Array.from({ length: WAAPI_ANIMATION_COUNT }, (_, tileIndex) => (
          <div
            key={tileIndex}
            data-waapi-tile={tileIndex}
            data-testid={`waapi-tile-${tileIndex}`}
            className="flex h-8 w-8 items-center justify-center rounded font-mono text-[9px] text-white"
            style={{ backgroundColor: `hsl(${(tileIndex * 13) % 360}, 65%, 55%)` }}
          >
            {tileIndex}
          </div>
        ))}
      </div>
      <div
        ref={mutatorContainerRef}
        className="flex flex-wrap gap-3"
        data-testid="raf-mutator-grid"
      >
        {Array.from({ length: RAF_MUTATOR_COUNT }, (_, mutatorIndex) => (
          <button
            key={mutatorIndex}
            type="button"
            data-raf-mutator={mutatorIndex}
            data-testid={`raf-mutator-${mutatorIndex}`}
            className="rounded border bg-white px-2 py-1 font-mono text-[10px] shadow-sm"
          >
            live {mutatorIndex}
          </button>
        ))}
      </div>
    </section>
  );
};
