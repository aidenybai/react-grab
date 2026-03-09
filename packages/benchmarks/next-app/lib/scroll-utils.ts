export function scrollToElement(
  elementOrSelector: HTMLElement | string,
  options?: ScrollIntoViewOptions,
): void {
  const element =
    typeof elementOrSelector === "string"
      ? document.querySelector(elementOrSelector)
      : elementOrSelector;

  element?.scrollIntoView({
    behavior: "smooth",
    block: "start",
    ...options,
  });
}

export function scrollToTop(behavior: ScrollBehavior = "smooth"): void {
  window.scrollTo({ top: 0, behavior });
}

export function getScrollPercentage(): number {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  if (scrollHeight <= clientHeight) return 100;
  return Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
}

export function isNearBottom(threshold = 100): boolean {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  return scrollTop + clientHeight >= scrollHeight - threshold;
}

export function lockScroll(): () => void {
  const scrollY = window.scrollY;
  const body = document.body;
  const originalOverflow = body.style.overflow;
  const originalPosition = body.style.position;
  const originalTop = body.style.top;
  const originalWidth = body.style.width;

  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.width = "100%";

  return () => {
    body.style.overflow = originalOverflow;
    body.style.position = originalPosition;
    body.style.top = originalTop;
    body.style.width = originalWidth;
    window.scrollTo(0, scrollY);
  };
}

export function getScrollbarWidth(): number {
  const outer = document.createElement("div");
  outer.style.visibility = "hidden";
  outer.style.overflow = "scroll";
  document.body.appendChild(outer);
  const inner = document.createElement("div");
  outer.appendChild(inner);
  const width = outer.offsetWidth - inner.offsetWidth;
  outer.remove();
  return width;
}
