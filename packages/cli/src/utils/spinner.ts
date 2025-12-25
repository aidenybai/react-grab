import ora from "ora";

interface SpinnerOptions {
  silent?: boolean;
}

export const spinner = (text: string, options?: SpinnerOptions) =>
  ora({ text, isSilent: options?.silent });
