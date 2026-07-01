import { clsx, type ClassValue } from "cnfast";
import { twMerge } from "cnfast";

export const cn = (...classes: ClassValue[]): string => twMerge(clsx(classes));
