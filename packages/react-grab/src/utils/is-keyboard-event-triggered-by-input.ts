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

const isCustomElement = (element: HTMLElement): boolean => {
  // we just do a basic check w/o any complex RegExp or validation against the list of legacy names containing a hyphen,
  // as none of them is likely to be an event target, and it won't hurt anyway if we miss.
  // see: https://html.spec.whatwg.org/multipage/custom-elements.html#prod-potentialcustomelementname
  return (
    Boolean(element.tagName) &&
    !element.tagName.startsWith("-") &&
    element.tagName.includes("-")
  );
};

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

  if (target instanceof HTMLElement && isCustomElement(target) && composed) {
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
