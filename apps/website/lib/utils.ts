import { clsx, type ClassValue } from "cnfast";
import { twMerge } from "cnfast";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
