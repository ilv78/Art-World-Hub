import { useState, useCallback, useEffect, useRef } from "react";

export function useImmersiveMode() {
  const [isImmersive, setIsImmersive] = useState(false);
  // Track whether we successfully entered browser fullscreen
  const wasFullscreenRef = useRef(false);

  const enterImmersive = useCallback(() => {
    document.body.classList.add("immersive-mode");
    setIsImmersive(true);
    document.documentElement.requestFullscreen?.()
      .then(() => { wasFullscreenRef.current = true; })
      .catch(() => {
        // Fullscreen API unavailable or denied — CSS-only fallback is already active
      });
  }, []);

  const exitImmersive = useCallback(() => {
    document.body.classList.remove("immersive-mode");
    setIsImmersive(false);
    wasFullscreenRef.current = false;
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const toggleImmersive = useCallback(() => {
    if (isImmersive) {
      exitImmersive();
    } else {
      enterImmersive();
    }
  }, [isImmersive, enterImmersive, exitImmersive]);

  // Sync state only when browser fullscreen was actively used and then exited (e.g. ESC key)
  // On mobile where fullscreen may not activate, this won't interfere
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && wasFullscreenRef.current) {
        wasFullscreenRef.current = false;
        document.body.classList.remove("immersive-mode");
        setIsImmersive(false);
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove("immersive-mode");
      wasFullscreenRef.current = false;
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
  }, []);

  return { isImmersive, toggleImmersive, enterImmersive, exitImmersive };
}
