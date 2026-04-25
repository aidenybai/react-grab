import {
  getFiberFromHostInstance,
  isCompositeFiber,
  getDisplayName,
  getRDTHook,
  type Fiber,
} from "bippy";
import { Z_INDEX_OVERLAY } from "../../constants.js";
import { detectCspNonce } from "../../utils/detect-csp-nonce.js";
import { hideFromThirdParties } from "../../utils/hide-from-third-parties.js";
import type { Plugin } from "../../types.js";

// ─── Constants ───────────────────────────────────────────────────────────────

const PANEL_WIDTH_PX = 320;
const PANEL_MAX_HEIGHT_PX = 480;
const PANEL_VIEWPORT_PADDING_PX = 12;
const PANEL_GAP_PX = 8;

const EVENT_HANDLER_PATTERN = /^on[A-Z]/;
const INTERNAL_PROPS = new Set(["key", "ref", "$$typeof", "__self", "__source"]);
const BOOLEAN_HTML_ATTRS = new Set([
  "disabled",
  "checked",
  "hidden",
  "readOnly",
  "open",
  "required",
  "multiple",
  "selected",
  "autoFocus",
  "autoPlay",
  "controls",
  "loop",
  "muted",
  "noValidate",
  "formNoValidate",
  "allowFullScreen",
  "async",
  "defer",
  "reversed",
]);
const STRING_ATTRS = new Set([
  "placeholder",
  "title",
  "alt",
  "label",
  "name",
  "type",
  "role",
  "id",
  "htmlFor",
  "tabIndex",
  "accessKey",
  "lang",
  "dir",
  "pattern",
  "accept",
  "action",
  "method",
  "target",
  "rel",
]);
const URL_ATTRS = new Set(["src", "href", "action", "poster", "data", "cite"]);

const COLOR_PATTERN = /^(#([0-9a-fA-F]{3,8})|rgba?\(|hsla?\()/;

const CSS_COLOR_PROPS = new Set([
  "color",
  "backgroundColor",
  "borderColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "textDecorationColor",
  "caretColor",
  "accentColor",
  "columnRuleColor",
  "fill",
  "stroke",
  "stopColor",
  "floodColor",
  "lightingColor",
]);

const CSS_SIZE_PROPS = new Set([
  "fontSize",
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "gap",
  "rowGap",
  "columnGap",
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "borderWidth",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "top",
  "right",
  "bottom",
  "left",
  "inset",
  "letterSpacing",
  "wordSpacing",
  "lineHeight",
  "textIndent",
  "outlineWidth",
  "outlineOffset",
  "flexBasis",
]);

const DISPLAY_OPTIONS = [
  "block",
  "flex",
  "grid",
  "inline",
  "inline-block",
  "inline-flex",
  "inline-grid",
  "none",
  "contents",
  "table",
  "list-item",
];

const POSITION_OPTIONS = ["static", "relative", "absolute", "fixed", "sticky"];

const OVERFLOW_OPTIONS = ["visible", "hidden", "scroll", "auto", "clip"];

const FONT_WEIGHT_OPTIONS = [
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "normal",
  "bold",
  "lighter",
  "bolder",
];

const CSS_UNIT_OPTIONS = ["px", "rem", "em", "%", "vw", "vh", "auto"];

// ─── Editor Types ────────────────────────────────────────────────────────────

type EditorType =
  | "text"
  | "textarea"
  | "number"
  | "toggle"
  | "color"
  | "url"
  | "select"
  | "number-unit"
  | "readonly"
  | "hidden"
  | "object"
  | "json"
  | "style";

interface EditorConfig {
  type: EditorType;
  options?: string[];
}

interface PropEntry {
  key: string;
  value: unknown;
  originalValue: unknown;
  editor: EditorConfig;
  path: string[];
}

// ─── Prop Type Inference ─────────────────────────────────────────────────────

const inferStylePropEditor = (cssPropName: string, value: unknown): EditorConfig => {
  if (CSS_COLOR_PROPS.has(cssPropName)) {
    return { type: "color" };
  }

  if (cssPropName === "fontWeight") {
    return { type: "select", options: FONT_WEIGHT_OPTIONS };
  }

  if (cssPropName === "display") {
    return { type: "select", options: DISPLAY_OPTIONS };
  }

  if (cssPropName === "position") {
    return { type: "select", options: POSITION_OPTIONS };
  }

  if (cssPropName === "overflow" || cssPropName === "overflowX" || cssPropName === "overflowY") {
    return { type: "select", options: OVERFLOW_OPTIONS };
  }

  if (CSS_SIZE_PROPS.has(cssPropName)) {
    return { type: "number-unit" };
  }

  if (typeof value === "number") {
    return { type: "number" };
  }

  return { type: "text" };
};

const inferPropEditor = (propName: string, value: unknown): EditorConfig => {
  if (INTERNAL_PROPS.has(propName)) {
    return { type: "hidden" };
  }

  if (EVENT_HANDLER_PATTERN.test(propName)) {
    return { type: "readonly" };
  }

  if (propName === "children" && typeof value === "string") {
    return { type: "textarea" };
  }

  if (propName === "children" && typeof value !== "string") {
    return { type: "hidden" };
  }

  if (propName === "style" && typeof value === "object" && value !== null) {
    return { type: "style" };
  }

  if (propName === "className") {
    return { type: "text" };
  }

  if (URL_ATTRS.has(propName)) {
    return { type: "url" };
  }

  if (BOOLEAN_HTML_ATTRS.has(propName)) {
    return { type: "toggle" };
  }

  if (STRING_ATTRS.has(propName)) {
    return { type: "text" };
  }

  return inferValueEditor(value);
};

const inferValueEditor = (value: unknown): EditorConfig => {
  if (typeof value === "boolean") {
    return { type: "toggle" };
  }

  if (typeof value === "number") {
    return { type: "number" };
  }

  if (typeof value === "string") {
    if (COLOR_PATTERN.test(value)) {
      return { type: "color" };
    }
    return { type: "text" };
  }

  if (typeof value === "function") {
    return { type: "readonly" };
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return { type: "object" };
  }

  return { type: "json" };
};

const buildPropEntries = (props: Record<string, unknown>): PropEntry[] => {
  const entries: PropEntry[] = [];

  for (const [propName, value] of Object.entries(props)) {
    const editor = inferPropEditor(propName, value);
    if (editor.type === "hidden") continue;

    if (editor.type === "style" && typeof value === "object" && value !== null) {
      entries.push({
        key: propName,
        value,
        originalValue: { ...(value as Record<string, unknown>) },
        editor,
        path: [propName],
      });
      continue;
    }

    entries.push({
      key: propName,
      value,
      originalValue: value,
      editor,
      path: [propName],
    });
  }

  return entries;
};

// ─── Panel Styles ────────────────────────────────────────────────────────────

const PANEL_CSS = `
  :host {
    all: initial;
    direction: ltr;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  @import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500&display=swap");

  .panel {
    position: fixed;
    z-index: ${Z_INDEX_OVERLAY};
    width: ${PANEL_WIDTH_PX}px;
    max-height: ${PANEL_MAX_HEIGHT_PX}px;
    background: #fff;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
    font-family: "Geist", system-ui, -apple-system, sans-serif;
    font-size: 12px;
    color: #1a1a1a;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    pointer-events: auto;
    user-select: none;
    animation: panel-in 0.15s ease-out;
  }

  @keyframes panel-in {
    from { opacity: 0; transform: scale(0.96) translateY(4px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    background: rgba(0, 0, 0, 0.02);
    cursor: grab;
    flex-shrink: 0;
  }

  .header:active { cursor: grabbing; }

  .header-title {
    font-weight: 500;
    font-size: 11px;
    color: rgba(0, 0, 0, 0.7);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .header-tag {
    font-weight: 400;
    color: rgba(0, 0, 0, 0.4);
    margin-left: 4px;
  }

  .close-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px;
    border-radius: 4px;
    color: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .close-button:hover { background: rgba(0, 0, 0, 0.06); color: rgba(0, 0, 0, 0.7); }

  .body {
    overflow-y: auto;
    flex: 1;
    padding: 4px 0;
  }

  .body::-webkit-scrollbar { width: 4px; }
  .body::-webkit-scrollbar-track { background: transparent; }
  .body::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.12); border-radius: 2px; }

  .prop-row {
    display: flex;
    align-items: flex-start;
    padding: 4px 12px;
    gap: 8px;
    min-height: 28px;
  }

  .prop-row:hover { background: rgba(0, 0, 0, 0.02); }

  .prop-label {
    font-size: 11px;
    color: rgba(0, 0, 0, 0.5);
    min-width: 80px;
    max-width: 80px;
    padding-top: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .prop-value {
    flex: 1;
    min-width: 0;
  }

  input[type="text"],
  input[type="number"],
  input[type="url"] {
    width: 100%;
    padding: 3px 6px;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 6px;
    font-family: inherit;
    font-size: 11px;
    color: #1a1a1a;
    background: #fff;
    outline: none;
    transition: border-color 0.1s;
  }

  input[type="text"]:focus,
  input[type="number"]:focus,
  input[type="url"]:focus {
    border-color: rgba(99, 102, 241, 0.5);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
  }

  textarea {
    width: 100%;
    padding: 3px 6px;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 6px;
    font-family: inherit;
    font-size: 11px;
    color: #1a1a1a;
    background: #fff;
    outline: none;
    resize: vertical;
    min-height: 48px;
    max-height: 120px;
    transition: border-color 0.1s;
  }

  textarea:focus {
    border-color: rgba(99, 102, 241, 0.5);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
  }

  select {
    width: 100%;
    padding: 3px 6px;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 6px;
    font-family: inherit;
    font-size: 11px;
    color: #1a1a1a;
    background: #fff;
    outline: none;
    cursor: pointer;
  }

  select:focus {
    border-color: rgba(99, 102, 241, 0.5);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
  }

  .toggle-container {
    display: flex;
    align-items: center;
    padding-top: 2px;
  }

  .toggle {
    position: relative;
    width: 28px;
    height: 16px;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s;
    border: none;
  }

  .toggle.active { background: rgba(99, 102, 241, 0.8); }

  .toggle-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 12px;
    height: 12px;
    background: #fff;
    border-radius: 50%;
    transition: transform 0.15s;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    pointer-events: none;
  }

  .toggle.active .toggle-knob { transform: translateX(12px); }

  .readonly-badge {
    display: inline-block;
    padding: 2px 6px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
    font-size: 10px;
    color: rgba(0, 0, 0, 0.4);
    font-style: italic;
  }

  .color-input-container {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  input[type="color"] {
    width: 24px;
    height: 24px;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 4px;
    padding: 0;
    cursor: pointer;
    background: none;
    flex-shrink: 0;
  }

  input[type="color"]::-webkit-color-swatch-wrapper { padding: 2px; }
  input[type="color"]::-webkit-color-swatch { border: none; border-radius: 2px; }

  .number-unit-container {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .number-unit-container input[type="text"] { flex: 1; }
  .number-unit-container select { width: 56px; flex-shrink: 0; }

  .section-toggle {
    display: flex;
    align-items: center;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.6);
    border: none;
    background: none;
    width: 100%;
    text-align: left;
    gap: 4px;
  }

  .section-toggle:hover { background: rgba(0, 0, 0, 0.03); }

  .section-arrow {
    font-size: 8px;
    transition: transform 0.15s;
    color: rgba(0, 0, 0, 0.35);
  }

  .section-arrow.expanded { transform: rotate(90deg); }

  .section-content { padding-left: 8px; }

  .footer {
    display: flex;
    justify-content: flex-end;
    padding: 6px 12px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    flex-shrink: 0;
  }

  .reset-button {
    padding: 3px 10px;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 6px;
    font-family: inherit;
    font-size: 11px;
    color: rgba(0, 0, 0, 0.6);
    background: #fff;
    cursor: pointer;
    transition: all 0.1s;
  }

  .reset-button:hover {
    background: rgba(0, 0, 0, 0.04);
    border-color: rgba(0, 0, 0, 0.2);
  }

  .object-entries { padding-left: 8px; }

  .url-preview {
    font-size: 10px;
    color: rgba(99, 102, 241, 0.7);
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .url-preview a {
    color: inherit;
    text-decoration: none;
  }

  .url-preview a:hover { text-decoration: underline; }

  .empty-state {
    padding: 24px 12px;
    text-align: center;
    color: rgba(0, 0, 0, 0.35);
    font-size: 11px;
  }
`;

// ─── Fiber Utilities ─────────────────────────────────────────────────────────

const findFiberForElement = (element: Element): Fiber | null => {
  let current: Element | null = element;
  while (current) {
    const fiber = getFiberFromHostInstance(current);
    if (fiber) return fiber;
    current = current.parentElement;
  }
  return null;
};

const findNearestCompositeFiber = (fiber: Fiber): Fiber | null => {
  let current: Fiber | null = fiber.return;
  while (current) {
    if (isCompositeFiber(current)) return current;
    current = current.return;
  }
  return null;
};

const getComponentName = (fiber: Fiber): string => {
  const composite = findNearestCompositeFiber(fiber);
  if (composite) {
    const name = getDisplayName(composite.type);
    if (name) return name;
  }
  if (typeof fiber.type === "string") return `<${fiber.type}>`;
  return "<unknown>";
};

const getTagName = (fiber: Fiber): string | null => {
  if (typeof fiber.type === "string") return fiber.type;
  return null;
};

const isHostFiber = (fiber: Fiber): boolean => typeof fiber.type === "string";

// ─── Prop Application ────────────────────────────────────────────────────────

const applyHostFiberProps = (fiber: Fiber, editedProps: Record<string, unknown>): void => {
  const merged = { ...fiber.memoizedProps, ...editedProps };
  fiber.pendingProps = merged;
  if (fiber.alternate) {
    fiber.alternate.pendingProps = merged;
  }

  for (const renderer of getRDTHook().renderers.values()) {
    if (typeof renderer.scheduleUpdate === "function" && fiber.stateNode) {
      try {
        renderer.scheduleUpdate(fiber);
      } catch {
        // swallow
      }
      break;
    }
  }
};

const applyCompositeFiberProp = (fiber: Fiber, path: string[], value: unknown): void => {
  for (const renderer of getRDTHook().renderers.values()) {
    const rendererRecord = renderer as unknown as Record<string, unknown>;
    if (typeof rendererRecord.overrideProps === "function") {
      try {
        (rendererRecord.overrideProps as (fiber: Fiber, path: string[], value: unknown) => void)(
          fiber,
          path,
          value,
        );
      } catch {
        // swallow
      }
      return;
    }
  }

  const merged = { ...fiber.memoizedProps, ...buildNestedUpdate(path, value) };
  fiber.pendingProps = merged;
  if (fiber.alternate) {
    fiber.alternate.pendingProps = merged;
  }

  for (const renderer of getRDTHook().renderers.values()) {
    if (typeof renderer.scheduleUpdate === "function") {
      try {
        renderer.scheduleUpdate(fiber);
      } catch {
        // swallow
      }
      break;
    }
  }
};

const buildNestedUpdate = (path: string[], value: unknown): Record<string, unknown> => {
  if (path.length === 0) return {};
  if (path.length === 1) return { [path[0]]: value };

  const result: Record<string, unknown> = {};
  let current = result;
  for (let pathIndex = 0; pathIndex < path.length - 1; pathIndex++) {
    const nested: Record<string, unknown> = {};
    current[path[pathIndex]] = nested;
    current = nested;
  }
  current[path[path.length - 1]] = value;
  return result;
};

// ─── Panel DOM Builder ───────────────────────────────────────────────────────

interface PanelState {
  fiber: Fiber;
  entries: PropEntry[];
  originalProps: Record<string, unknown>;
  editedValues: Map<string, unknown>;
  expandedSections: Set<string>;
}

const createCloseIcon = (): SVGSVGElement => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "12");
  svg.setAttribute("height", "12");
  svg.setAttribute("viewBox", "0 0 12 12");
  svg.setAttribute("fill", "none");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M3 3L9 9M9 3L3 9");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.5");
  path.setAttribute("stroke-linecap", "round");
  svg.appendChild(path);
  return svg;
};

const createEditorElement = (
  entry: PropEntry,
  state: PanelState,
  onPropChange: (path: string[], value: unknown) => void,
): HTMLElement => {
  const container = document.createElement("div");
  container.className = "prop-value";

  switch (entry.editor.type) {
    case "text": {
      const input = document.createElement("input");
      input.type = "text";
      input.value = String(entry.value ?? "");
      input.addEventListener("input", () => {
        onPropChange(entry.path, input.value);
      });
      container.appendChild(input);
      break;
    }

    case "textarea": {
      const textarea = document.createElement("textarea");
      textarea.value = String(entry.value ?? "");
      textarea.addEventListener("input", () => {
        onPropChange(entry.path, textarea.value);
      });
      container.appendChild(textarea);
      break;
    }

    case "number": {
      const input = document.createElement("input");
      input.type = "number";
      input.value = String(entry.value ?? 0);
      input.addEventListener("input", () => {
        const parsed = parseFloat(input.value);
        onPropChange(entry.path, Number.isNaN(parsed) ? 0 : parsed);
      });
      container.appendChild(input);
      break;
    }

    case "toggle": {
      const toggleContainer = document.createElement("div");
      toggleContainer.className = "toggle-container";
      const button = document.createElement("button");
      button.className = `toggle ${entry.value ? "active" : ""}`;
      const knob = document.createElement("div");
      knob.className = "toggle-knob";
      button.appendChild(knob);
      button.addEventListener("click", () => {
        const isCurrentlyActive = button.classList.contains("active");
        button.classList.toggle("active");
        onPropChange(entry.path, !isCurrentlyActive);
      });
      toggleContainer.appendChild(button);
      container.appendChild(toggleContainer);
      break;
    }

    case "color": {
      const colorContainer = document.createElement("div");
      colorContainer.className = "color-input-container";
      const colorInput = document.createElement("input");
      colorInput.type = "color";
      const colorValue = normalizeColorForInput(String(entry.value ?? "#000000"));
      colorInput.value = colorValue;
      const textInput = document.createElement("input");
      textInput.type = "text";
      textInput.value = String(entry.value ?? "");
      colorInput.addEventListener("input", () => {
        textInput.value = colorInput.value;
        onPropChange(entry.path, colorInput.value);
      });
      textInput.addEventListener("input", () => {
        if (COLOR_PATTERN.test(textInput.value)) {
          colorInput.value = normalizeColorForInput(textInput.value);
        }
        onPropChange(entry.path, textInput.value);
      });
      colorContainer.appendChild(colorInput);
      colorContainer.appendChild(textInput);
      container.appendChild(colorContainer);
      break;
    }

    case "url": {
      const input = document.createElement("input");
      input.type = "url";
      input.value = String(entry.value ?? "");
      input.addEventListener("input", () => {
        onPropChange(entry.path, input.value);
      });
      container.appendChild(input);

      if (typeof entry.value === "string" && entry.value.length > 0) {
        const preview = document.createElement("div");
        preview.className = "url-preview";
        const link = document.createElement("a");
        link.href = entry.value;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = entry.value;
        preview.appendChild(link);
        container.appendChild(preview);
      }
      break;
    }

    case "select": {
      const select = document.createElement("select");
      const options = entry.editor.options ?? [];
      const currentValue = String(entry.value ?? "");

      if (!options.includes(currentValue) && currentValue) {
        const customOption = document.createElement("option");
        customOption.value = currentValue;
        customOption.textContent = currentValue;
        select.appendChild(customOption);
      }

      for (const optionValue of options) {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        if (optionValue === currentValue) option.selected = true;
        select.appendChild(option);
      }

      select.addEventListener("change", () => {
        onPropChange(entry.path, select.value);
      });
      container.appendChild(select);
      break;
    }

    case "number-unit": {
      const numberUnitContainer = document.createElement("div");
      numberUnitContainer.className = "number-unit-container";
      const { numericValue, unit } = parseNumberUnit(String(entry.value ?? "0px"));
      const numInput = document.createElement("input");
      numInput.type = "text";
      numInput.value = numericValue;
      const unitSelect = document.createElement("select");
      for (const unitOption of CSS_UNIT_OPTIONS) {
        const option = document.createElement("option");
        option.value = unitOption;
        option.textContent = unitOption;
        if (unitOption === unit) option.selected = true;
        unitSelect.appendChild(option);
      }
      const emitUpdate = () => {
        const assembledValue =
          unitSelect.value === "auto" ? "auto" : `${numInput.value}${unitSelect.value}`;
        onPropChange(entry.path, assembledValue);
      };
      numInput.addEventListener("input", emitUpdate);
      unitSelect.addEventListener("change", emitUpdate);
      numberUnitContainer.appendChild(numInput);
      numberUnitContainer.appendChild(unitSelect);
      container.appendChild(numberUnitContainer);
      break;
    }

    case "readonly": {
      const badge = document.createElement("span");
      badge.className = "readonly-badge";
      badge.textContent = typeof entry.value === "function" ? "(function)" : "(event handler)";
      container.appendChild(badge);
      break;
    }

    case "json": {
      const badge = document.createElement("span");
      badge.className = "readonly-badge";
      try {
        badge.textContent = JSON.stringify(entry.value, null, 0)?.slice(0, 60) ?? "null";
      } catch {
        badge.textContent = String(entry.value);
      }
      container.appendChild(badge);
      break;
    }

    case "object": {
      const sectionKey = entry.path.join(".");
      const isExpanded = state.expandedSections.has(sectionKey);
      const toggleButton = document.createElement("button");
      toggleButton.className = "section-toggle";
      const arrow = document.createElement("span");
      arrow.className = `section-arrow ${isExpanded ? "expanded" : ""}`;
      arrow.textContent = "▶";
      toggleButton.appendChild(arrow);
      const labelSpan = document.createElement("span");
      labelSpan.textContent = `{${Object.keys(entry.value as Record<string, unknown>).length} keys}`;
      toggleButton.appendChild(labelSpan);
      container.appendChild(toggleButton);

      const entriesContainer = document.createElement("div");
      entriesContainer.className = "object-entries";
      entriesContainer.style.display = isExpanded ? "block" : "none";

      if (typeof entry.value === "object" && entry.value !== null) {
        for (const [subKey, subValue] of Object.entries(entry.value as Record<string, unknown>)) {
          const subEntry: PropEntry = {
            key: subKey,
            value: subValue,
            originalValue: (entry.originalValue as Record<string, unknown>)?.[subKey],
            editor: inferValueEditor(subValue),
            path: [...entry.path, subKey],
          };
          const subRow = createPropRow(subEntry, state, onPropChange);
          entriesContainer.appendChild(subRow);
        }
      }

      toggleButton.addEventListener("click", () => {
        const isCurrentlyExpanded = state.expandedSections.has(sectionKey);
        if (isCurrentlyExpanded) {
          state.expandedSections.delete(sectionKey);
        } else {
          state.expandedSections.add(sectionKey);
        }
        arrow.className = `section-arrow ${state.expandedSections.has(sectionKey) ? "expanded" : ""}`;
        entriesContainer.style.display = state.expandedSections.has(sectionKey) ? "block" : "none";
      });

      container.appendChild(entriesContainer);
      break;
    }

    case "style": {
      const sectionKey = "style";
      const isExpanded = state.expandedSections.has(sectionKey);
      const toggleButton = document.createElement("button");
      toggleButton.className = "section-toggle";
      const arrow = document.createElement("span");
      arrow.className = `section-arrow ${isExpanded ? "expanded" : ""}`;
      arrow.textContent = "▶";
      toggleButton.appendChild(arrow);
      const labelSpan = document.createElement("span");
      const styleEntryCount =
        typeof entry.value === "object" && entry.value !== null
          ? Object.keys(entry.value as Record<string, unknown>).length
          : 0;
      labelSpan.textContent = `style {${styleEntryCount}}`;
      toggleButton.appendChild(labelSpan);
      container.appendChild(toggleButton);

      const entriesContainer = document.createElement("div");
      entriesContainer.className = "section-content";
      entriesContainer.style.display = isExpanded ? "block" : "none";

      if (typeof entry.value === "object" && entry.value !== null) {
        for (const [cssProp, cssValue] of Object.entries(entry.value as Record<string, unknown>)) {
          const subEditor = inferStylePropEditor(cssProp, cssValue);
          const subEntry: PropEntry = {
            key: cssProp,
            value: cssValue,
            originalValue: (entry.originalValue as Record<string, unknown>)?.[cssProp],
            editor: subEditor,
            path: ["style", cssProp],
          };
          const subRow = createPropRow(subEntry, state, onPropChange);
          entriesContainer.appendChild(subRow);
        }
      }

      toggleButton.addEventListener("click", () => {
        const isCurrentlyExpanded = state.expandedSections.has(sectionKey);
        if (isCurrentlyExpanded) {
          state.expandedSections.delete(sectionKey);
        } else {
          state.expandedSections.add(sectionKey);
        }
        arrow.className = `section-arrow ${state.expandedSections.has(sectionKey) ? "expanded" : ""}`;
        entriesContainer.style.display = state.expandedSections.has(sectionKey) ? "block" : "none";
      });

      container.appendChild(entriesContainer);
      break;
    }
  }

  return container;
};

const createPropRow = (
  entry: PropEntry,
  state: PanelState,
  onPropChange: (path: string[], value: unknown) => void,
): HTMLElement => {
  const row = document.createElement("div");
  row.className = "prop-row";

  const label = document.createElement("div");
  label.className = "prop-label";
  label.textContent = entry.key;
  label.title = entry.key;
  row.appendChild(label);

  const editor = createEditorElement(entry, state, onPropChange);
  row.appendChild(editor);

  return row;
};

// ─── Panel Manager ───────────────────────────────────────────────────────────

interface PropsEditorPanel {
  show: (element: Element) => void;
  hide: () => void;
  dispose: () => void;
  isVisible: () => boolean;
}

const createPropsEditorPanel = (): PropsEditorPanel => {
  let hostElement: HTMLDivElement | null = null;
  let shadowRoot: ShadowRoot | null = null;
  let panelElement: HTMLDivElement | null = null;
  let currentState: PanelState | null = null;
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  const ensureHost = (): ShadowRoot => {
    if (hostElement && shadowRoot) return shadowRoot;

    hostElement = document.createElement("div");
    hostElement.setAttribute("data-react-grab-props-editor", "true");
    hideFromThirdParties(hostElement);
    hostElement.style.zIndex = String(Z_INDEX_OVERLAY);
    hostElement.style.position = "fixed";
    hostElement.style.inset = "0";
    hostElement.style.pointerEvents = "none";

    shadowRoot = hostElement.attachShadow({ mode: "open" });

    const styleElement = document.createElement("style");
    const nonce = detectCspNonce();
    if (nonce) styleElement.nonce = nonce;
    styleElement.textContent = PANEL_CSS;
    shadowRoot.appendChild(styleElement);

    const documentRoot = document.body ?? document.documentElement;
    documentRoot.appendChild(hostElement);

    return shadowRoot;
  };

  const computePosition = (element: Element): { left: number; top: number } => {
    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = rect.right + PANEL_GAP_PX;
    let top = rect.top;

    if (left + PANEL_WIDTH_PX + PANEL_VIEWPORT_PADDING_PX > viewportWidth) {
      left = rect.left - PANEL_WIDTH_PX - PANEL_GAP_PX;
    }

    if (left < PANEL_VIEWPORT_PADDING_PX) {
      left = Math.min(
        rect.left + (rect.width - PANEL_WIDTH_PX) / 2,
        viewportWidth - PANEL_WIDTH_PX - PANEL_VIEWPORT_PADDING_PX,
      );
      left = Math.max(left, PANEL_VIEWPORT_PADDING_PX);
    }

    if (top + PANEL_MAX_HEIGHT_PX > viewportHeight - PANEL_VIEWPORT_PADDING_PX) {
      top = viewportHeight - PANEL_MAX_HEIGHT_PX - PANEL_VIEWPORT_PADDING_PX;
    }

    top = Math.max(top, PANEL_VIEWPORT_PADDING_PX);

    return { left, top };
  };

  const handlePropChange = (path: string[], value: unknown): void => {
    if (!currentState) return;

    const pathKey = path.join(".");
    currentState.editedValues.set(pathKey, value);

    const { fiber } = currentState;

    if (path[0] === "style" && path.length > 1) {
      const currentStyle = {
        ...(fiber.memoizedProps?.style as Record<string, unknown> | undefined),
      };

      for (const [editedKey, editedValue] of currentState.editedValues) {
        if (editedKey.startsWith("style.")) {
          const cssKey = editedKey.slice(6);
          currentStyle[cssKey] = editedValue;
        }
      }

      if (isHostFiber(fiber)) {
        applyHostFiberProps(fiber, { style: currentStyle });
      } else {
        const composite = findNearestCompositeFiber(fiber);
        if (composite) {
          applyCompositeFiberProp(composite, ["style"], currentStyle);
        }
      }
      return;
    }

    if (isHostFiber(fiber)) {
      const editedProps: Record<string, unknown> = {};
      for (const [editedKey, editedValue] of currentState.editedValues) {
        if (!editedKey.includes(".")) {
          editedProps[editedKey] = editedValue;
        }
      }
      applyHostFiberProps(fiber, editedProps);
    } else {
      const composite = findNearestCompositeFiber(fiber);
      if (composite) {
        applyCompositeFiberProp(composite, path, value);
      }
    }
  };

  const handleReset = (): void => {
    if (!currentState) return;

    currentState.editedValues.clear();

    const { fiber, originalProps } = currentState;

    if (isHostFiber(fiber)) {
      fiber.pendingProps = { ...originalProps };
      if (fiber.alternate) {
        fiber.alternate.pendingProps = fiber.pendingProps;
      }
      for (const renderer of getRDTHook().renderers.values()) {
        if (typeof renderer.scheduleUpdate === "function") {
          try {
            renderer.scheduleUpdate(fiber);
          } catch {
            // swallow
          }
          break;
        }
      }
    } else {
      const composite = findNearestCompositeFiber(fiber);
      if (composite) {
        for (const [propName, propValue] of Object.entries(originalProps)) {
          applyCompositeFiberProp(composite, [propName], propValue);
        }
      }
    }

    rebuildBody();
  };

  const setupDrag = (header: HTMLElement, panel: HTMLElement): void => {
    const handleMouseDown = (event: MouseEvent) => {
      isDragging = true;
      const panelRect = panel.getBoundingClientRect();
      dragOffsetX = event.clientX - panelRect.left;
      dragOffsetY = event.clientY - panelRect.top;
      event.preventDefault();
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;
      const newLeft = event.clientX - dragOffsetX;
      const newTop = event.clientY - dragOffsetY;
      panel.style.left = `${newLeft}px`;
      panel.style.top = `${newTop}px`;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    header.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const rebuildBody = (): void => {
    if (!panelElement || !currentState) return;

    const body = panelElement.querySelector(".body");
    if (!body) return;

    body.innerHTML = "";

    const fiber = currentState.fiber;
    const currentProps = fiber.memoizedProps ?? {};
    currentState.entries = buildPropEntries(currentProps as Record<string, unknown>);

    if (currentState.entries.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No editable props";
      body.appendChild(empty);
      return;
    }

    for (const entry of currentState.entries) {
      const editedKey = entry.path.join(".");
      if (currentState.editedValues.has(editedKey)) {
        entry.value = currentState.editedValues.get(editedKey);
      }
      const row = createPropRow(entry, currentState, handlePropChange);
      body.appendChild(row);
    }
  };

  const show = (element: Element): void => {
    const root = ensureHost();

    const fiber = findFiberForElement(element);
    if (!fiber) return;

    const memoizedProps = fiber.memoizedProps ?? {};
    const originalProps: Record<string, unknown> = {};
    for (const [propName, propValue] of Object.entries(memoizedProps as Record<string, unknown>)) {
      if (typeof propValue === "object" && propValue !== null) {
        originalProps[propName] = Array.isArray(propValue) ? [...propValue] : { ...propValue };
      } else {
        originalProps[propName] = propValue;
      }
    }

    currentState = {
      fiber,
      entries: buildPropEntries(memoizedProps as Record<string, unknown>),
      originalProps,
      editedValues: new Map(),
      expandedSections: new Set(),
    };

    if (panelElement) {
      panelElement.remove();
    }

    panelElement = document.createElement("div");
    panelElement.className = "panel";

    const position = computePosition(element);
    panelElement.style.left = `${position.left}px`;
    panelElement.style.top = `${position.top}px`;

    const header = document.createElement("div");
    header.className = "header";

    const titleContainer = document.createElement("div");
    titleContainer.className = "header-title";

    const componentName = getComponentName(fiber);
    const tagName = getTagName(fiber);

    titleContainer.textContent = componentName;
    if (tagName && componentName !== `<${tagName}>`) {
      const tagSpan = document.createElement("span");
      tagSpan.className = "header-tag";
      tagSpan.textContent = `<${tagName}>`;
      titleContainer.appendChild(tagSpan);
    }

    header.appendChild(titleContainer);

    const closeButton = document.createElement("button");
    closeButton.className = "close-button";
    closeButton.appendChild(createCloseIcon());
    closeButton.addEventListener("click", hide);
    header.appendChild(closeButton);

    panelElement.appendChild(header);

    const body = document.createElement("div");
    body.className = "body";
    panelElement.appendChild(body);

    const footer = document.createElement("div");
    footer.className = "footer";
    const resetButton = document.createElement("button");
    resetButton.className = "reset-button";
    resetButton.textContent = "Reset";
    resetButton.addEventListener("click", handleReset);
    footer.appendChild(resetButton);
    panelElement.appendChild(footer);

    root.appendChild(panelElement);

    setupDrag(header, panelElement);
    rebuildBody();
  };

  const hide = (): void => {
    if (panelElement) {
      panelElement.remove();
      panelElement = null;
    }
    currentState = null;
  };

  const dispose = (): void => {
    hide();
    if (hostElement) {
      hostElement.remove();
      hostElement = null;
      shadowRoot = null;
    }
  };

  const isVisible = (): boolean => panelElement !== null;

  return { show, hide, dispose, isVisible };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const normalizeColorForInput = (color: string): string => {
  if (color.startsWith("#") && (color.length === 4 || color.length === 7 || color.length === 9)) {
    if (color.length === 4) {
      return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    }
    return color.slice(0, 7);
  }

  if (color.startsWith("rgb")) {
    const match = color.match(/(\d+)/g);
    if (match && match.length >= 3) {
      const toHexChannel = (channel: string) => parseInt(channel, 10).toString(16).padStart(2, "0");
      return `#${toHexChannel(match[0])}${toHexChannel(match[1])}${toHexChannel(match[2])}`;
    }
  }

  return "#000000";
};

const parseNumberUnit = (value: string): { numericValue: string; unit: string } => {
  if (value === "auto") return { numericValue: "", unit: "auto" };

  const match = String(value).match(/^(-?[\d.]+)\s*(px|rem|em|%|vw|vh)?$/);
  if (match) {
    return { numericValue: match[1], unit: match[2] || "px" };
  }

  if (typeof value === "string" && !Number.isNaN(Number(value))) {
    return { numericValue: value, unit: "px" };
  }

  return { numericValue: String(value), unit: "px" };
};

// ─── Plugin ──────────────────────────────────────────────────────────────────

export const propsEditorPlugin: Plugin = {
  name: "props-editor",
  setup: () => {
    let panel: PropsEditorPanel | null = null;

    const getPanel = (): PropsEditorPanel => {
      if (!panel) {
        panel = createPropsEditorPanel();
      }
      return panel;
    };

    return {
      actions: [
        {
          id: "props",
          label: "Props",
          shortcut: "P",
          showInToolbarMenu: true,
          onAction: (context) => {
            const propsPanel = getPanel();
            propsPanel.show(context.element);
            context.hideContextMenu();
          },
        },
      ],
      hooks: {
        onDeactivate: () => {
          panel?.hide();
        },
        onElementSelect: () => {
          panel?.hide();
        },
      },
      cleanup: () => {
        panel?.dispose();
        panel = null;
      },
    };
  },
};
