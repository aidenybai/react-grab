interface ResolveSingleClickSelectionInput {
  pointerX: number;
  pointerY: number;
  detectedElement: Element | null;
  frozenElement: Element | null;
  keyboardSelectedElement: Element | null;
  getElementsAtPoint: (pointerX: number, pointerY: number) => Element[];
  isValidGrabbableElement: (element: Element) => boolean;
}

interface ResolveSingleClickSelectionResult {
  selectedElement: Element | null;
  didResolveFromPointer: boolean;
  didResolveFromFrozenElement: boolean;
  didResolveFromKeyboardElement: boolean;
}

export const resolveSingleClickSelection = (
  input: ResolveSingleClickSelectionInput,
): ResolveSingleClickSelectionResult => {
  const selectedElementUnderPointer =
    input
      .getElementsAtPoint(input.pointerX, input.pointerY)
      .find((elementAtPointer) => input.isValidGrabbableElement(elementAtPointer)) ??
    input.detectedElement;

  if (selectedElementUnderPointer) {
    return {
      selectedElement: selectedElementUnderPointer,
      didResolveFromPointer: true,
      didResolveFromFrozenElement: false,
      didResolveFromKeyboardElement: false,
    };
  }

  if (input.frozenElement) {
    return {
      selectedElement: input.frozenElement,
      didResolveFromPointer: false,
      didResolveFromFrozenElement: true,
      didResolveFromKeyboardElement: false,
    };
  }

  if (input.keyboardSelectedElement) {
    return {
      selectedElement: input.keyboardSelectedElement,
      didResolveFromPointer: false,
      didResolveFromFrozenElement: false,
      didResolveFromKeyboardElement: true,
    };
  }

  return {
    selectedElement: null,
    didResolveFromPointer: false,
    didResolveFromFrozenElement: false,
    didResolveFromKeyboardElement: false,
  };
};
