import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: string | number): string {
  return `${parseInt(String(amount)).toLocaleString()} \u20AC`;
}
