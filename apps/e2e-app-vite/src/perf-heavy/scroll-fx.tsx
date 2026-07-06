import { useEffect, useMemo, useRef } from "react";
import { LAZY_SECTION_COUNT, PARALLAX_LAYER_COUNT, SMOOTH_SCROLL_LERP_FACTOR } from "./constants";
import { createSeededRandom } from "./synthetic-data";

// Marketing-site scroll machinery, all of which fights react-grab's
// scroll-during-selection path:
//
// - a Lenis-style smooth scroller: wheel is preventDefault-ed (non-passive)
//   and scroll position is animated toward the target from a rAF lerp loop,
//   so window scroll keeps moving for many frames after the last wheel event.
// - parallax layers whose transforms are rewritten inside the scroll handler
//   (read scrollY → write style: the classic layout-thrash shape).
// - IntersectionObserver-revealed sections toggling classes as they enter,
//   mutating the DOM mid-scroll.
export const ScrollFxSection = () => {
  const parallaxContainerRef = useRef<HTMLDivElement>(null);
  const sectionListRef = useRef<HTMLDivElement>(null);

  const sectionBlurbs = useMemo(() => {
    const random = createSeededRandom(0x5c01);
    return Array.from({ length: LAZY_SECTION_COUNT }, (_, sectionIndex) => ({
      id: sectionIndex,
      heading: `Feature ${sectionIndex + 1}`,
      metric: `${Math.floor(random() * 90) + 10}% faster`,
    }));
  }, []);

  useEffect(() => {
    let targetScrollY = window.scrollY;
    let animatedScrollY = window.scrollY;
    let frameHandle = 0;
    let isLoopRunning = false;

    const runScrollLoop = (): void => {
      animatedScrollY += (targetScrollY - animatedScrollY) * SMOOTH_SCROLL_LERP_FACTOR;
      if (Math.abs(targetScrollY - animatedScrollY) < 0.5) {
        animatedScrollY = targetScrollY;
        isLoopRunning = false;
      } else {
        frameHandle = requestAnimationFrame(runScrollLoop);
      }
      window.scrollTo(0, animatedScrollY);
    };

    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
      targetScrollY = Math.max(0, Math.min(maxScrollY, targetScrollY + event.deltaY));
      if (!isLoopRunning) {
        isLoopRunning = true;
        frameHandle = requestAnimationFrame(runScrollLoop);
      }
    };

    const handleScroll = (): void => {
      const parallaxContainer = parallaxContainerRef.current;
      if (!parallaxContainer) return;
      const layers = parallaxContainer.querySelectorAll<HTMLElement>("[data-parallax-layer]");
      for (const layerElement of layers) {
        const layerDepth = Number(layerElement.dataset.parallaxLayer) + 1;
        layerElement.style.transform = `translateY(${window.scrollY * layerDepth * 0.04}px)`;
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(frameHandle);
    };
  }, []);

  useEffect(() => {
    const sectionList = sectionListRef.current;
    if (!sectionList) return;
    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle("opacity-100", entry.isIntersecting);
          entry.target.classList.toggle("opacity-30", !entry.isIntersecting);
        }
      },
      { threshold: 0.3 },
    );
    for (const sectionElement of sectionList.querySelectorAll("[data-lazy-section]")) {
      revealObserver.observe(sectionElement);
    }
    return () => revealObserver.disconnect();
  }, []);

  return (
    <section data-testid="heavy-scroll-fx-section" className="relative flex flex-col gap-4 p-4">
      <div className="sticky top-0 z-20 border-b bg-white/90 px-2 py-3" data-testid="sticky-header">
        <h2 className="text-lg font-bold">Scroll FX (hijacked wheel + parallax + lazy reveal)</h2>
      </div>
      <div
        ref={parallaxContainerRef}
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {Array.from({ length: PARALLAX_LAYER_COUNT }, (_, layerIndex) => (
          <div
            key={layerIndex}
            data-parallax-layer={layerIndex}
            className="absolute rounded-full opacity-10"
            style={{
              left: `${(layerIndex * 17) % 90}%`,
              top: `${layerIndex * 400}px`,
              width: 180 + layerIndex * 40,
              height: 180 + layerIndex * 40,
              backgroundColor: `hsl(${layerIndex * 47}, 70%, 50%)`,
            }}
          />
        ))}
      </div>
      <div ref={sectionListRef} className="flex flex-col gap-40 py-10">
        {sectionBlurbs.map((blurb) => (
          <article
            key={blurb.id}
            data-lazy-section={blurb.id}
            data-testid={`lazy-section-${blurb.id}`}
            className="mx-auto w-full max-w-xl rounded border bg-white p-6 opacity-30 transition-opacity duration-500"
          >
            <h3 className="text-base font-semibold">{blurb.heading}</h3>
            <p className="text-sm text-gray-600">
              Scroll-revealed content block. Benchmarked at {blurb.metric}.
            </p>
            <button type="button" className="mt-3 rounded border px-3 py-1 text-xs">
              Learn more
            </button>
          </article>
        ))}
      </div>
    </section>
  );
};
