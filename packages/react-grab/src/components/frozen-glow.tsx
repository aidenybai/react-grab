import { createSignal, onCleanup, onMount, type Component } from "solid-js";
import {
  FADE_DURATION_MS,
  FROZEN_GLOW_COLOR,
  FROZEN_GLOW_EDGE_PX,
  Z_INDEX_OVERLAY_CANVAS,
} from "../constants.js";
import { getScopeContainer } from "../utils/runtime-mode.js";

interface FrozenGlowProps {
  visible: boolean;
}

/**
 * Edge glow shown while React Grab is active/frozen. Unscoped it hugs the
 * viewport; inside a scoped instance (demo showcases) it hugs the scope
 * container's box instead, tracking it across scroll and resize so the glow
 * never tints the host page.
 */
export const FrozenGlow: Component<FrozenGlowProps> = (props) => {
  const scopeContainer = getScopeContainer();
  const scopeBorderRadius = scopeContainer ? getComputedStyle(scopeContainer).borderRadius : "0px";

  const measureRect = () => scopeContainer?.getBoundingClientRect() ?? null;
  const [scopeRect, setScopeRect] = createSignal(measureRect());

  if (scopeContainer) {
    onMount(() => {
      const handleViewportChange = () => setScopeRect(measureRect());
      const resizeObserver = new ResizeObserver(handleViewportChange);
      resizeObserver.observe(scopeContainer);
      window.addEventListener("scroll", handleViewportChange, { capture: true, passive: true });
      window.addEventListener("resize", handleViewportChange);
      onCleanup(() => {
        resizeObserver.disconnect();
        window.removeEventListener("scroll", handleViewportChange, { capture: true });
        window.removeEventListener("resize", handleViewportChange);
      });
    });
  }

  const top = () => {
    const rect = scopeRect();
    return rect ? `${rect.top}px` : "0";
  };
  const left = () => {
    const rect = scopeRect();
    return rect ? `${rect.left}px` : "0";
  };
  const width = () => {
    const rect = scopeRect();
    return rect ? `${rect.width}px` : "100%";
  };
  const height = () => {
    const rect = scopeRect();
    return rect ? `${rect.height}px` : "100%";
  };

  // translateZ(0) promotes to its own compositor layer so opacity
  // transitions skip main-thread repaints; contain:strict with
  // will-change:opacity pre-allocates the layer.
  return (
    <div
      style={{
        position: "fixed",
        top: top(),
        left: left(),
        width: width(),
        height: height(),
        "border-radius": scopeBorderRadius,
        "pointer-events": "none",
        "z-index": Z_INDEX_OVERLAY_CANVAS,
        opacity: props.visible ? 1 : 0,
        transition: `opacity ${FADE_DURATION_MS}ms ease-out`,
        "will-change": "opacity",
        contain: "strict",
        transform: "translateZ(0)",
        "box-shadow": `inset 0 0 ${FROZEN_GLOW_EDGE_PX}px ${FROZEN_GLOW_COLOR}`,
      }}
    />
  );
};
