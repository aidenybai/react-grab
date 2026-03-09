type ClassInput = string | undefined | null | false | Record<string, boolean>;

function processInput(input: ClassInput): string {
  if (!input) return "";
  if (typeof input === "string") return input;
  if (typeof input === "object") {
    return Object.entries(input)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key)
      .join(" ");
  }
  return "";
}

export function cn(...inputs: ClassInput[]): string {
  return inputs.map(processInput).filter(Boolean).join(" ");
}

export function mergeClasses(base: string, overrides?: string | null): string {
  if (!overrides) return base;
  return `${base} ${overrides}`;
}

export function createClassNameBuilder(prefix: string) {
  return {
    root: (className?: string) => cn(prefix, className),
    element: (element: string, className?: string) =>
      cn(`${prefix}__${element}`, className),
    modifier: (modifier: string, active: boolean = true) =>
      active ? `${prefix}--${modifier}` : "",
  };
}

export default cn;
