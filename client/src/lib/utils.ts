import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: string | number): string {
  return `${parseInt(String(amount)).toLocaleString()} \u20AC`;
}

export const PRICE_ON_REQUEST_LABEL = "Price on request";

// Single source of truth for rendering an artwork's price: shows
// "Price on request" when the artwork is marked POR (or has no numeric price),
// otherwise the formatted amount.
export function formatArtworkPrice(
  artwork: { price?: string | number | null; priceOnRequest?: boolean | null },
): string {
  if (artwork.priceOnRequest || artwork.price == null || String(artwork.price).trim() === "") {
    return PRICE_ON_REQUEST_LABEL;
  }
  return formatPrice(artwork.price);
}

export function truncateAtWord(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}\u2026`;
}
