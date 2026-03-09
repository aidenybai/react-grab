export type ValidationResult = string | null;
export type Validator<T = string> = (value: T) => ValidationResult;

export const required: Validator = (value) =>
  value && value.trim().length > 0 ? null : "This field is required";

export const email: Validator = (value) => {
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return pattern.test(value) ? null : "Please enter a valid email address";
};

export const minLength =
  (min: number): Validator =>
  (value) =>
    value.length >= min ? null : `Must be at least ${min} characters`;

export const maxLength =
  (max: number): Validator =>
  (value) =>
    value.length <= max ? null : `Must be no more than ${max} characters`;

export const pattern =
  (regex: RegExp, message: string): Validator =>
  (value) =>
    regex.test(value) ? null : message;

export const url: Validator = (value) => {
  try {
    new URL(value);
    return null;
  } catch {
    return "Please enter a valid URL";
  }
};

export const numeric: Validator = (value) =>
  /^\d+$/.test(value) ? null : "Must be a number";

export const slug: Validator = (value) =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
    ? null
    : "Must contain only lowercase letters, numbers, and hyphens";

export function compose(...validators: Validator[]): Validator {
  return (value: string) => {
    for (const validator of validators) {
      const result = validator(value);
      if (result) return result;
    }
    return null;
  };
}

export function validateForm<T extends Record<string, string>>(
  values: T,
  rules: Partial<Record<keyof T, Validator>>,
): Partial<Record<keyof T, string>> {
  const errors: Partial<Record<keyof T, string>> = {};
  for (const [field, validator] of Object.entries(rules)) {
    if (validator) {
      const error = (validator as Validator)(values[field] || "");
      if (error) errors[field as keyof T] = error;
    }
  }
  return errors;
}
