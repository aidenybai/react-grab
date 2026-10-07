import { cn } from "./cn.js";

type VariantOptions = Record<string, string>;
type VariantsSchema = Record<string, VariantOptions>;

type VariantSelection<Schema extends VariantsSchema> = {
  [Group in keyof Schema]?: keyof Schema[Group];
};

interface VariantsConfig<Schema extends VariantsSchema> {
  variants?: Schema;
  defaultVariants?: VariantSelection<Schema>;
}

// A tiny class-variance-authority-style helper: map a base class plus named
// variant groups to a single className. Returns a function so call sites read
// like shadcn's `buttonVariants({ variant: "ghost" })`.
export const createVariants =
  <Schema extends VariantsSchema>(base: string, config: VariantsConfig<Schema> = {}) =>
  (selection: VariantSelection<Schema> = {}): string => {
    const schema = config.variants;
    if (!schema) return base;
    const picked: string[] = [base];
    for (const group in schema) {
      const chosen = selection[group] ?? config.defaultVariants?.[group];
      if (chosen === undefined) continue;
      const className = schema[group][String(chosen)];
      if (className) picked.push(className);
    }
    return cn(...picked);
  };
