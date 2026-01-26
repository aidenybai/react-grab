const EDITABLE_TAGS_AND_ROLES: readonly string[] = [
  "input",
  "textarea",
  "select",
  "searchbox",
  "slider",
  "spinbutton",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "radio",
  "textbox",
  "combobox",
];

const getTargetElement = (event: KeyboardEvent): HTMLElement | undefined => {
  if (event.composed) {
    const firstElement = event.composedPath()[0];
    if (firstElement instanceof HTMLElement) {
      return firstElement;
    }
  } else if (event.target instanceof HTMLElement) {
    return event.target;
  }
  return undefined;
};

export const isKeyboardEventTriggeredByInput = (
  event: KeyboardEvent,
): boolean => {
  if (document.designMode === "on") return true;

  const targetElement = getTargetElement(event);
  if (!targetElement) return false;

  if (targetElement.isContentEditable) return true;

  const tagName = targetElement.tagName.toLowerCase();
  return EDITABLE_TAGS_AND_ROLES.some(
    (tagOrRole) => tagOrRole === tagName || tagOrRole === targetElement.role,
  );
};

export const hasTextSelectionInInput = (event: KeyboardEvent): boolean => {
  const target = event.target;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  ) {
    const selectionStart = target.selectionStart ?? 0;
    const selectionEnd = target.selectionEnd ?? 0;
    return selectionEnd - selectionStart > 0;
  }
  return false;
};

export const hasTextSelectionOnPage = (): boolean => {
  const selection = window.getSelection();
  if (!selection) return false;
  return selection.toString().length > 0;
};
