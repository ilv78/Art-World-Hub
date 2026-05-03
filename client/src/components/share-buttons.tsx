// Social-share button row (#569).
//
// Renders a hybrid UI:
// - On mobile (Web Share API available): a single "Share" button that opens
//   the OS share sheet, so the user can route to whatever app they have
//   installed (including Instagram).
// - On desktop / no Web Share API: a row of per-platform buttons + Copy link.
//
// Every share click is reported to /api/share-events for our own analytics.

import { useState, useEffect, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Share2, Link as LinkIcon, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  buildShareUrl,
  buildNativeShareData,
  postShareEvent,
  type ShareTarget,
} from "@/lib/share-urls";
import type { SharePlatform, ShareItemType } from "@shared/schema";

interface ShareButtonsProps {
  /** Absolute URL of the page being shared. */
  url: string;
  /** Item type — used for analytics + UTM tagging. */
  itemType: ShareItemType;
  /** Stable item id (artwork.id, blog post id, gallery id, artist.id). */
  itemId: string;
  /** Page title — primary share text. */
  title: string;
  /** Optional description — used by Web Share + Pinterest. */
  description?: string;
  /** Optional image URL — required by Pinterest. */
  imageUrl?: string;
  /** Visual variant — default is the row, "compact" is icon-only. */
  className?: string;
}

interface BrandIconProps {
  className?: string;
}

// Inline brand SVGs. Kept tiny and single-color so they tint with currentColor.
// Paths are the official simplified marks (24x24 viewBox).
const FacebookIcon = ({ className }: BrandIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.3-1.5 1.6-1.5h1.7V4.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.4V14h2.7v8h3.4z" />
  </svg>
);
const LinkedInIcon = ({ className }: BrandIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.22 8h4.56v14H.22V8zm7.6 0h4.37v1.92h.06c.61-1.15 2.1-2.36 4.32-2.36 4.62 0 5.47 3.04 5.47 7v7.44h-4.55v-6.6c0-1.57-.03-3.6-2.2-3.6-2.2 0-2.54 1.72-2.54 3.49V22H7.82V8z" />
  </svg>
);
const PinterestIcon = ({ className }: BrandIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 5 3 9.3 7.4 11.1-.1-.9-.2-2.4 0-3.4.2-.9 1.4-5.6 1.4-5.6s-.4-.7-.4-1.7c0-1.6.9-2.8 2.1-2.8 1 0 1.5.7 1.5 1.6 0 1-.6 2.5-.9 3.8-.3 1.1.6 2.1 1.7 2.1 2 0 3.6-2.1 3.6-5.2 0-2.7-2-4.6-4.8-4.6-3.3 0-5.2 2.5-5.2 5 0 1 .4 2 .9 2.6.1.1.1.2.1.3l-.4 1.4c-.1.2-.2.3-.4.2-1.5-.7-2.5-2.9-2.5-4.6 0-3.8 2.7-7.2 7.9-7.2 4.1 0 7.4 3 7.4 6.9 0 4.1-2.6 7.5-6.2 7.5-1.2 0-2.4-.6-2.8-1.4l-.7 2.9c-.3 1-1 2.3-1.5 3.1 1.1.4 2.3.5 3.5.5 6.6 0 12-5.4 12-12S18.6 0 12 0z" />
  </svg>
);
const XIcon = ({ className }: BrandIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
  </svg>
);
const BlueskyIcon = ({ className }: BrandIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.296 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z" />
  </svg>
);

interface PlatformConfig {
  platform: Exclude<SharePlatform, "copy" | "native">;
  label: string;
  Icon: (p: BrandIconProps) => ReactElement;
  /** Brand color used for hover state. */
  brandColor: string;
}

const PLATFORMS: PlatformConfig[] = [
  { platform: "facebook", label: "Share on Facebook", Icon: FacebookIcon, brandColor: "#1877F2" },
  { platform: "linkedin", label: "Share on LinkedIn", Icon: LinkedInIcon, brandColor: "#0A66C2" },
  { platform: "pinterest", label: "Pin on Pinterest", Icon: PinterestIcon, brandColor: "#E60023" },
  { platform: "x", label: "Share on X", Icon: XIcon, brandColor: "#000000" },
  { platform: "bluesky", label: "Share on Bluesky", Icon: BlueskyIcon, brandColor: "#0085FF" },
];

function detectUserAgentClass(): "mobile" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  return window.matchMedia?.("(max-width: 767px)").matches ||
    "ontouchstart" in window ||
    (navigator.maxTouchPoints ?? 0) > 0
    ? "mobile"
    : "desktop";
}

export function ShareButtons({
  url,
  itemType,
  itemId,
  title,
  description,
  imageUrl,
  className,
}: ShareButtonsProps) {
  const { toast } = useToast();
  const [hasNativeShare, setHasNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);

  // Feature-detect on mount only — SSR has no navigator. We also gate on the
  // mobile UA class because desktop browsers (Edge, Safari) increasingly
  // implement navigator.share but the OS share sheet there is awkward; we
  // prefer the explicit button row on desktop.
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = detectUserAgentClass();
    setHasNativeShare(ua === "mobile" && typeof navigator.share === "function");
  }, []);

  const target: ShareTarget = { url, title, description, imageUrl, itemType };
  const userAgentClass = detectUserAgentClass();

  const recordEvent = (platform: SharePlatform) => {
    void postShareEvent({ itemType, itemId, platform, userAgentClass });
  };

  const onPlatformClick = (platform: Exclude<SharePlatform, "copy" | "native">) => {
    const shareUrl = buildShareUrl(platform, target);
    recordEvent(platform);
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=600");
  };

  const onNativeShare = async () => {
    try {
      await navigator.share(buildNativeShareData(target));
      recordEvent("native");
    } catch {
      // user dismissed — no-op (don't record an event for dismissals)
    }
  };

  const onCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      recordEvent("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied", description: "The page URL is on your clipboard." });
    } catch {
      toast({
        title: "Couldn't copy link",
        description: "Your browser blocked clipboard access.",
        variant: "destructive",
      });
    }
  };

  if (hasNativeShare) {
    return (
      <div className={className} data-testid="share-buttons-mobile">
        <Button onClick={onNativeShare} className="w-full gap-2" data-testid="button-share-native">
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}
        data-testid="share-buttons-desktop"
      >
        {PLATFORMS.map(({ platform, label, Icon, brandColor }) => (
          <Tooltip key={platform}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                onClick={() => onPlatformClick(platform)}
                aria-label={label}
                data-testid={`button-share-${platform}`}
                className="hover:text-white"
                style={{ ["--brand-hover" as string]: brandColor }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = brandColor)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
              >
                <Icon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              onClick={onCopyLink}
              aria-label="Copy link"
              data-testid="button-share-copy"
            >
              {copied ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{copied ? "Copied!" : "Copy link"}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
