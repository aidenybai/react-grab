type FormTags =
  | "input"
  | "INPUT"
  | "menuitem"
  | "menuitemcheckbox"
  | "menuitemradio"
  | "option"
  | "radio"
  | "searchbox"
  | "select"
  | "SELECT"
  | "slider"
  | "spinbutton"
  | "textarea"
  | "TEXTAREA"
  | "textbox";

const FORM_TAGS_AND_ROLES: readonly FormTags[] = [
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

const isReadonlyArray = (value: unknown): value is readonly unknown[] => {
  return Array.isArray(value);
};

const isHotkeyEnabledOnTagName = (
  event: KeyboardEvent,
  enabledOnTags: boolean | readonly FormTags[] = false,
): boolean => {
  const { composed, target } = event;

  let targetTagName: EventTarget | null | string | undefined;
  let targetRole: null | string | undefined;

  if (composed) {
    const composedPath = event.composedPath();
    const targetElement = composedPath[0];

    if (targetElement instanceof HTMLElement) {
      targetTagName = targetElement.tagName;
      targetRole = targetElement.role;
    }
  } else if (target instanceof HTMLElement) {
    targetTagName = target.tagName;
    targetRole = target.role;
  }

  if (isReadonlyArray(enabledOnTags)) {
    return Boolean(
      targetTagName &&
        enabledOnTags &&
        enabledOnTags.some(
          (tag) =>
            (typeof targetTagName === "string" &&
              tag.toLowerCase() === targetTagName.toLowerCase()) ||
            tag === targetRole,
        ),
    );
  }

  return Boolean(targetTagName && enabledOnTags && enabledOnTags);
};

export const isKeyboardEventTriggeredByInput = (
  event: KeyboardEvent,
): boolean => {
  return isHotkeyEnabledOnTagName(event, FORM_TAGS_AND_ROLES);
};
