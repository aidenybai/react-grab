import { FROZEN_ELEMENT_ATTRIBUTE } from "../constants.js";
import { getElementsAbove } from "./get-element-at-position.js";

const FROZEN_STYLES = `
[${FROZEN_ELEMENT_ATTRIBUTE}],
[${FROZEN_ELEMENT_ATTRIBUTE}] *,
[${FROZEN_ELEMENT_ATTRIBUTE}]::before,
[${FROZEN_ELEMENT_ATTRIBUTE}]::after,
[${FROZEN_ELEMENT_ATTRIBUTE}] *::before,
[${FROZEN_ELEMENT_ATTRIBUTE}] *::after {
  animation-play-state: paused !important;
  transition: none !important;
}
`;

let styleElement: HTMLStyleElement | null = null;
let frozenElements: Element[] = [];
let pausedAnimations = new Set<Animation>();
let pausedVideos: HTMLVideoElement[] = [];

const originalAnimationPlay =
  // eslint-disable-next-line @typescript-eslint/unbound-method
  typeof Animation !== "undefined" ? Animation.prototype.play : undefined;

const ensureStylesInjected = (): void => {
  if (styleElement) return;

  styleElement = document.createElement("style");
  styleElement.setAttribute("data-react-grab-frozen-styles", "");
  styleElement.textContent = FROZEN_STYLES;
  document.head.appendChild(styleElement);
};

const isAnimationInFrozenScope = (animation: Animation): boolean => {
  const effect = animation.effect;
  if (!(effect instanceof KeyframeEffect)) return false;

  const target = effect.target;
  if (!target || !(target instanceof Element)) return false;

  return frozenElements.some(
    (element) => element === target || element.contains(target),
  );
};

export const freezeAllAnimations = (elements: Element[]): void => {
  if (elements.length === 0) return;

  unfreezeAllAnimations();
  ensureStylesInjected();

  const allElementsToFreeze = new Set<Element>();

  for (const element of elements) {
    allElementsToFreeze.add(element);

    const elementsAbove = getElementsAbove(element);
    for (const elementAbove of elementsAbove) {
      allElementsToFreeze.add(elementAbove);
    }
  }

  frozenElements = [...allElementsToFreeze];

  for (const element of frozenElements) {
    element.setAttribute(FROZEN_ELEMENT_ATTRIBUTE, "");

    const animations = element.getAnimations({ subtree: true });
    for (const animation of animations) {
      if (animation.playState === "running") {
        animation.pause();
        pausedAnimations.add(animation);
      }
    }

    const videos = element.querySelectorAll<HTMLVideoElement>("video");
    for (const video of Array.from(videos)) {
      if (!video.paused) {
        video.pause();
        pausedVideos.push(video);
      }
    }
  }

  Animation.prototype.play = function () {
    if (isAnimationInFrozenScope(this)) {
      pausedAnimations.add(this);
      this.pause();
    } else {
      originalAnimationPlay?.call(this);
    }
  };
};

export const unfreezeAllAnimations = (): void => {
  if (frozenElements.length === 0) return;

  if (originalAnimationPlay) {
    Animation.prototype.play = originalAnimationPlay;
  }

  for (const element of frozenElements) {
    element.removeAttribute(FROZEN_ELEMENT_ATTRIBUTE);
  }

  for (const animation of pausedAnimations) {
    animation.play();
  }

  for (const video of pausedVideos) {
    void video.play();
  }

  frozenElements = [];
  pausedAnimations = new Set<Animation>();
  pausedVideos = [];
};

export const freezeAnimations = (elements: Element[]): (() => void) => {
  if (elements.length === 0) {
    unfreezeAllAnimations();
    return () => {};
  }

  freezeAllAnimations(elements);
  return unfreezeAllAnimations;
};
