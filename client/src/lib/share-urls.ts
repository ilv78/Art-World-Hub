// Client-side wrapper around the pure share-URL helpers in @shared/share-urls.
// This file owns the analytics POST (browser-only) and re-exports the pure
// helpers for ergonomics in components.

import type { SharePlatform, ShareItemType } from "@shared/schema";

export type { ShareTarget } from "@shared/share-urls";
export { buildShareUrl, buildNativeShareData, withUtm } from "@shared/share-urls";

/** Returns the share URL for an item, using the current window origin so each
 *  environment shares its own data (local → localhost, staging → staging,
 *  prod → vernis9.art). Strips query/hash from the user's session so we
 *  share a clean canonical path, not whatever filters the user had open.
 *  Pass an explicit `path` when the share UI lives in a modal (e.g. the
 *  artwork-detail dialog) — `window.location.pathname` would point at the
 *  parent page (`/store`, `/gallery`), not the artwork itself. */
export function getCanonicalShareUrl(path?: string): string {
  if (typeof window === "undefined") return "";
  const targetPath = path ?? window.location.pathname;
  return `${window.location.origin}${targetPath}`;
}

/** What we send to /api/share-events when the user clicks a share button. */
export interface ShareEventPayload {
  itemType: ShareItemType;
  itemId: string;
  platform: SharePlatform;
  userAgentClass?: "mobile" | "desktop";
}

export async function postShareEvent(payload: ShareEventPayload): Promise<void> {
  // Fire-and-forget — failures don't block the user's share. We use
  // keepalive so the request survives if the user navigates away during a
  // popup share.
  try {
    await fetch("/api/share-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // analytics failure is not user-visible
  }
}
