const FORM_TAGS_AND_ROLES: readonly string[] = [
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
];

const isEventFromFormElement = (event: KeyboardEvent): boolean => {
  const { composed, target } = event;

  let targetTagName: string | undefined;
  let targetRole: string | null | undefined;

  if (composed) {
    const composedPath = event.composedPath();
    const firstElement = composedPath[0];

    if (firstElement instanceof HTMLElement) {
      targetTagName = firstElement.tagName;
      targetRole = firstElement.role;
    }
  } else if (target instanceof HTMLElement) {
    targetTagName = target.tagName;
    targetRole = target.role;
  }

  if (!targetTagName) return false;

  const normalizedTagName = targetTagName.toLowerCase();
  return FORM_TAGS_AND_ROLES.some(
    (tagOrRole) => tagOrRole === normalizedTagName || tagOrRole === targetRole,
  );
};

export const isKeyboardEventTriggeredByInput = (
  event: KeyboardEvent,
): boolean => {
  return isEventFromFormElement(event);
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
