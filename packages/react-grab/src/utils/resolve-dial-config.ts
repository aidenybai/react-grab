import type {
  DialActionConfig,
  DialColorConfig,
  DialConfig,
  DialControl,
  DialControlConfig,
  DialEnumOption,
  DialNumberConfig,
  DialSelectConfig,
  DialSpringConfig,
  DialTextConfig,
} from "../types.js";
import { DIAL_SPRING_DEFAULT_BOUNCE, DIAL_SPRING_DEFAULT_VISUAL_DURATION_S } from "../constants.js";

const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

const toTitleCase = (key: string): string => {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  if (spaced.length === 0) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

interface InferredRange {
  min: number;
  max: number;
  step: number;
}

const inferNumberRange = (value: number): InferredRange => {
  const magnitude = Math.abs(value);
  const step = magnitude <= 1 ? 0.01 : magnitude <= 10 ? 0.1 : magnitude <= 100 ? 1 : 10;
  const bound = magnitude <= 1 ? 1 : magnitude * 3;
  // Bracket toward the sign of the default so a negative default isn't clamped
  // to 0 by an inverted (min > max) range.
  return value < 0 ? { min: -bound, max: 0, step } : { min: 0, max: bound, step };
};

const isHexColor = (value: string): boolean => HEX_COLOR_PATTERN.test(value);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeSelectOptions = (options: DialSelectConfig["options"]): DialEnumOption[] =>
  options.map((option) => (typeof option === "string" ? { value: option, label: option } : option));

const joinPath = (parentPath: string, key: string): string =>
  parentPath ? `${parentPath}.${key}` : key;

const resolveControl = (
  key: string,
  parentPath: string,
  config: DialControlConfig,
): DialControl | null => {
  const path = joinPath(parentPath, key);
  const label = toTitleCase(key);

  if (typeof config === "number") {
    const range = inferNumberRange(config);
    return { kind: "number", key, path, label, default: config, ...range };
  }

  if (typeof config === "boolean") {
    return { kind: "toggle", key, path, label, default: config };
  }

  if (typeof config === "string") {
    if (isHexColor(config)) {
      return { kind: "color", key, path, label, default: config };
    }
    return { kind: "text", key, path, label, default: config };
  }

  if (Array.isArray(config)) {
    const [defaultValue, min, max, step] = config;
    return {
      kind: "number",
      key,
      path,
      label,
      default: defaultValue,
      min,
      max,
      step: step ?? inferNumberRange(defaultValue).step,
    };
  }

  if (isPlainObject(config) && typeof config.type === "string") {
    return resolveTypedControl(key, path, label, config);
  }

  if (isPlainObject(config)) {
    const folderConfig = config as DialConfig;
    return {
      kind: "folder",
      key,
      path,
      label,
      collapsed: folderConfig._collapsed === true,
      children: resolveDialConfig(folderConfig, path),
    };
  }

  return null;
};

const resolveTypedControl = (
  key: string,
  path: string,
  label: string,
  config: Record<string, unknown>,
): DialControl | null => {
  switch (config.type) {
    case "number": {
      const numberConfig = config as unknown as DialNumberConfig;
      const range = inferNumberRange(numberConfig.default);
      return {
        kind: "number",
        key,
        path,
        label,
        default: numberConfig.default,
        min: numberConfig.min ?? range.min,
        max: numberConfig.max ?? range.max,
        step: numberConfig.step ?? range.step,
      };
    }
    case "color": {
      const colorConfig = config as unknown as DialColorConfig;
      return { kind: "color", key, path, label, default: colorConfig.default };
    }
    case "toggle": {
      return { kind: "toggle", key, path, label, default: Boolean(config.default) };
    }
    case "text": {
      const textConfig = config as unknown as DialTextConfig;
      return {
        kind: "text",
        key,
        path,
        label,
        default: textConfig.default ?? "",
        placeholder: textConfig.placeholder,
      };
    }
    case "select": {
      const selectConfig = config as unknown as DialSelectConfig;
      const options = normalizeSelectOptions(selectConfig.options);
      return {
        kind: "select",
        key,
        path,
        label,
        default: selectConfig.default ?? options[0]?.value ?? "",
        options,
      };
    }
    case "spring": {
      const springConfig = config as unknown as DialSpringConfig;
      return {
        kind: "spring",
        key,
        path,
        label,
        default: {
          type: "spring",
          visualDuration: springConfig.visualDuration ?? DIAL_SPRING_DEFAULT_VISUAL_DURATION_S,
          bounce: springConfig.bounce ?? DIAL_SPRING_DEFAULT_BOUNCE,
        },
      };
    }
    case "action": {
      const actionConfig = config as unknown as DialActionConfig;
      return { kind: "action", key, path, label: actionConfig.label ?? label };
    }
    default:
      return null;
  }
};

export const resolveDialConfig = (config: DialConfig, parentPath = ""): DialControl[] => {
  const controls: DialControl[] = [];
  for (const key of Object.keys(config)) {
    if (key === "_collapsed") continue;
    const entry = config[key];
    if (entry === undefined) continue;
    const control = resolveControl(key, parentPath, entry as DialControlConfig);
    if (control) controls.push(control);
  }
  return controls;
};
