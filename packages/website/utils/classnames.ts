type ClassValue = string | number | boolean | undefined | null;

export const cn = (...classes: ClassValue[]): string => {
  return classes.filter(Boolean).join(" ");
};




