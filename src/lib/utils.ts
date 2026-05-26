import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utilitário 'cn' para combinar dinamicamente classes CSS Tailwind.
 * Combina classes condicionais de forma limpa usando 'clsx' e resolve conflitos usando 'twMerge'.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
