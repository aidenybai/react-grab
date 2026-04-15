interface InputStateAttributes {
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  required?: boolean;
  readonly?: boolean;
  min?: string;
  max?: string;
  pattern?: string;
}

export const captureInputState = (element: Element): InputStateAttributes | null => {
  if (
    !(element instanceof HTMLInputElement) &&
    !(element instanceof HTMLTextAreaElement) &&
    !(element instanceof HTMLSelectElement)
  ) {
    return null;
  }

  const attributes: InputStateAttributes = {};

  if (element instanceof HTMLInputElement) {
    const inputType = (element.type || "text").toLowerCase();
    if (inputType === "checkbox" || inputType === "radio") {
      attributes.checked = element.checked;
      attributes.indeterminate = element.indeterminate;
    }
    if (element.min) attributes.min = element.min;
    if (element.max) attributes.max = element.max;
    if (element.pattern) attributes.pattern = element.pattern;
  }

  if (element.hasAttribute("disabled")) attributes.disabled = true;
  if (element.hasAttribute("required")) attributes.required = true;

  if (
    (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) &&
    element.readOnly
  ) {
    attributes.readonly = true;
  }

  return attributes;
};

export const serializeInputStateAttributes = (
  state: InputStateAttributes,
): string => {
  const parts: string[] = [];

  if (state.checked) parts.push('checked=""');
  if (state.disabled) parts.push('disabled=""');
  if (state.required) parts.push('required=""');
  if (state.readonly) parts.push('readonly=""');
  if (state.min) parts.push(`min="${state.min}"`);
  if (state.max) parts.push(`max="${state.max}"`);
  if (state.pattern) parts.push(`pattern="${state.pattern}"`);

  return parts.join(" ");
};
