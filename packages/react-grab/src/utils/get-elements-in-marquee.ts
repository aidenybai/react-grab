const MARQUEE_COVERAGE_THRESHOLD = 0.75;

interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const filterElementsInMarquee = (
  marqueeRect: MarqueeRect,
  isValidGrabbableElement: (element: Element) => boolean,
  shouldCheckCoverage: boolean,
): Element[] => {
  const elements: Element[] = [];
  const allElements = Array.from(document.querySelectorAll("*"));

  const marqueeLeft = marqueeRect.x;
  const marqueeTop = marqueeRect.y;
  const marqueeRight = marqueeRect.x + marqueeRect.width;
  const marqueeBottom = marqueeRect.y + marqueeRect.height;

  for (const candidateElement of allElements) {
    if (!shouldCheckCoverage) {
      const tagName = (candidateElement.tagName || "").toUpperCase();
      if (tagName === "HTML" || tagName === "BODY") continue;
    }

    if (!isValidGrabbableElement(candidateElement)) {
      continue;
    }

    const elementRect = candidateElement.getBoundingClientRect();
    const elementLeft = elementRect.left;
    const elementTop = elementRect.top;
    const elementRight = elementRect.left + elementRect.width;
    const elementBottom = elementRect.top + elementRect.height;

    if (shouldCheckCoverage) {
      const intersectionLeft = Math.max(marqueeLeft, elementLeft);
      const intersectionTop = Math.max(marqueeTop, elementTop);
      const intersectionRight = Math.min(marqueeRight, elementRight);
      const intersectionBottom = Math.min(marqueeBottom, elementBottom);

      const intersectionWidth = Math.max(0, intersectionRight - intersectionLeft);
      const intersectionHeight = Math.max(0, intersectionBottom - intersectionTop);
      const intersectionArea = intersectionWidth * intersectionHeight;

      const elementArea = Math.max(0, elementRect.width * elementRect.height);
      const hasMajorityCoverage =
        elementArea > 0 &&
        intersectionArea / elementArea >= MARQUEE_COVERAGE_THRESHOLD;

      if (hasMajorityCoverage) {
        elements.push(candidateElement);
      }
    } else {
      const hasIntersection =
        elementLeft < marqueeRight &&
        elementRight > marqueeLeft &&
        elementTop < marqueeBottom &&
        elementBottom > marqueeTop;

      if (hasIntersection) {
        elements.push(candidateElement);
      }
    }
  }

  return elements;
};

export const getElementsInMarquee = (
  marqueeRect: MarqueeRect,
  isValidGrabbableElement: (element: Element) => boolean,
): Element[] => {
  return filterElementsInMarquee(marqueeRect, isValidGrabbableElement, true);
};

export const getElementsInMarqueeLoose = (
  marqueeRect: MarqueeRect,
  isValidGrabbableElement: (element: Element) => boolean,
): Element[] => {
  return filterElementsInMarquee(marqueeRect, isValidGrabbableElement, false);
};
