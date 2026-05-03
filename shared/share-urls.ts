// Share-link builders for the social-share buttons (#569).
// Pure functions only — no DOM, no fetch — so they can be unit-tested from
// the server-side test suite without a jsdom environment.
//
// Twitter/X uses `twitter.com/intent/tweet` rather than the newer
// `x.com/intent/post` for compatibility — both work, the twitter.com form is
// older and still honored by both clients.

import type { SharePlatform, ShareItemType } from "./schema";

export interface ShareTarget {
  /** Absolute URL of the page being shared (no UTM params yet). */
  url: string;
  /** Page title — used as primary text on most platforms. */
  title: string;
  /** Optional description — used by Web Share API and Pinterest. */
  description?: string;
  /** Optional image URL — required by Pinterest, ignored elsewhere. */
  imageUrl?: string;
  /** Item type the URL points at — used for UTM campaign tagging. */
  itemType: ShareItemType;
}

const UTM_MEDIUM = "share";

/** Append UTM params to a URL. Drops any incoming utm_* params first so the
 *  same user re-sharing a URL they arrived at via a previous share doesn't
 *  produce duplicate utm parameters. */
export function withUtm(url: string, source: string, campaign: string): string {
  const hashIdx = url.indexOf("#");
  const base = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  const hash = hashIdx >= 0 ? url.slice(hashIdx) : "";

  const qIdx = base.indexOf("?");
  const path = qIdx >= 0 ? base.slice(0, qIdx) : base;
  const existingParams = new URLSearchParams(qIdx >= 0 ? base.slice(qIdx + 1) : "");

  for (const key of Array.from(existingParams.keys())) {
    if (key.toLowerCase().startsWith("utm_")) existingParams.delete(key);
  }
  existingParams.set("utm_source", source);
  existingParams.set("utm_medium", UTM_MEDIUM);
  existingParams.set("utm_campaign", campaign);

  const queryString = existingParams.toString();
  return `${path}${queryString ? `?${queryString}` : ""}${hash}`;
}

export function buildShareUrl(
  platform: Exclude<SharePlatform, "copy" | "native">,
  target: ShareTarget,
): string {
  const tagged = withUtm(target.url, platform, target.itemType);
  const e = encodeURIComponent;
  switch (platform) {
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${e(tagged)}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${e(tagged)}`;
    case "pinterest":
      return (
        `https://pinterest.com/pin/create/button/?url=${e(tagged)}` +
        `&media=${e(target.imageUrl ?? "")}` +
        `&description=${e(target.description ?? target.title)}`
      );
    case "x":
      return `https://twitter.com/intent/tweet?url=${e(tagged)}&text=${e(target.title)}`;
    case "bluesky":
      return `https://bsky.app/intent/compose?text=${e(`${target.title} ${tagged}`)}`;
  }
}

/** Build the payload for navigator.share() on mobile. */
export function buildNativeShareData(target: ShareTarget): {
  title: string;
  text: string;
  url: string;
} {
  return {
    title: target.title,
    text: target.description ?? target.title,
    url: withUtm(target.url, "native", target.itemType),
  };
}
