// Auto-opens an artwork modal when the URL contains `?artwork=<slug>` (#569).
// Used on parent pages that host the ArtworkDetailDialog (store, gallery,
// artist profile, curator gallery). Keeps the URL in sync: closing the modal
// strips the param, opening it (programmatically or via this effect) sets it.

import { useEffect, useRef } from "react";
import { useSearch } from "wouter";
import type { ArtworkWithArtist } from "@shared/schema";

interface Options {
  artworks: ArtworkWithArtist[] | undefined;
  selected: ArtworkWithArtist | null;
  setSelected: (a: ArtworkWithArtist | null) => void;
}

export function useArtworkModalFromQuery({ artworks, selected, setSelected }: Options) {
  const search = useSearch();
  const targetSlug = new URLSearchParams(search).get("artwork");
  const lastAppliedSlug = useRef<string | null>(null);

  // When the slug from the URL changes (or artworks finish loading), open the
  // matching artwork. We track the last slug we acted on so a user closing the
  // modal doesn't immediately reopen it on the next render. Important: don't
  // record the slug as "applied" until we actually find a match — otherwise
  // the first render (before the artworks query resolves) would mark it as
  // applied and we'd never open the modal once data arrives.
  useEffect(() => {
    if (!targetSlug) {
      lastAppliedSlug.current = null;
      return;
    }
    if (!artworks) return;
    if (lastAppliedSlug.current === targetSlug) return;
    const match = artworks.find((a) => a.slug === targetSlug);
    if (match) {
      setSelected(match);
      lastAppliedSlug.current = targetSlug;
    }
  }, [artworks, targetSlug, setSelected]);

  // When the modal closes (selected went from open → null), drop ?artwork=
  // from the URL so refreshing doesn't keep reopening it. Crucially, only
  // strip on the transition — on the initial render `selected` is null AND
  // the URL may carry `?artwork=`; stripping there would race the artworks
  // query and the modal would never open.
  const prevSelected = useRef<typeof selected>(null);
  useEffect(() => {
    const wasOpen = prevSelected.current !== null;
    const isClosed = selected === null;
    prevSelected.current = selected;
    if (!wasOpen || !isClosed) return;
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("artwork")) {
      url.searchParams.delete("artwork");
      window.history.replaceState(
        {},
        "",
        url.pathname + (url.search ? url.search : "") + url.hash,
      );
      lastAppliedSlug.current = null;
    }
  }, [selected]);
}
