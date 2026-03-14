import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges multiple tailwind classes using clsx and tailwind-merge.
 * This ensures that conflicting classes (like 'p-2' and 'p-4') are resolved correctly.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
