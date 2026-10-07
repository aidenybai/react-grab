import { clsx, twMerge, type ClassValue } from "cnfast";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
