import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { MazeGallery3D } from "@/components/maze-gallery-3d";
import { ArtworkCard } from "@/components/artwork-card";
import { ArtworkDetailDialog } from "@/components/artwork-detail-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Box, X, Frame } from "lucide-react";
import { useImmersiveMode } from "@/hooks/use-immersive-mode";
import type { ArtworkWithArtist, CuratorGalleryWithArtworks, MazeLayout } from "@shared/schema";

type ViewMode = "3d" | "classic";

export default function CuratorGalleryPage() {
  const [, params] = useRoute("/curator-gallery/:id");
  const galleryId = params?.id;
  const { isImmersive, toggleImmersive } = useImmersiveMode();
  const isMobile = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  const [viewMode, setViewMode] = useState<ViewMode>(isMobile ? "classic" : "3d");
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkWithArtist | null>(null);

  const { data: gallery, isLoading, error } = useQuery<CuratorGalleryWithArtworks>({
    queryKey: [`/api/curator-galleries/${galleryId}`],
    enabled: !!galleryId,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-[500px] rounded-md" />
      </div>
    );
  }

  if (error || !gallery) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Box className="w-12 h-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Gallery not found or no longer available.</p>
      </div>
    );
  }

  const layout = gallery.galleryLayout as MazeLayout | null;
  const curatorName = [gallery.curator.firstName, gallery.curator.lastName].filter(Boolean).join(" ") || "Curator";

  // Build poster bio with description + artist/artwork listing
  const posterBio = (() => {
    const parts: string[] = [];
    if (gallery.description) parts.push(gallery.description);
    parts.push("");
    const byArtist = new Map<string, { name: string; titles: string[] }>();
    for (const aw of gallery.artworks) {
      if (!byArtist.has(aw.artist.id)) byArtist.set(aw.artist.id, { name: aw.artist.name, titles: [] });
      byArtist.get(aw.artist.id)!.titles.push(aw.title);
    }
    for (const { name, titles } of Array.from(byArtist.values())) {
      parts.push(`${name}: ${titles.join(", ")}`);
    }
    return parts.join("\n");
  })();

  return (
    <div className={`flex flex-col ${isImmersive ? "h-screen" : "h-[calc(100vh-4rem)]"}`}>
      {isImmersive && (
        <Button
          size="icon"
          variant="secondary"
          className="fixed top-4 right-4 z-50 shadow-lg"
          onClick={toggleImmersive}
          data-testid="button-exit-immersive"
        >
          <X className="w-5 h-5" />
        </Button>
      )}
      {!isImmersive && (
        <div className="p-4 border-b bg-background flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-serif text-2xl font-bold">{gallery.name}</h1>
            <p className="text-sm text-muted-foreground">
              Curated by {curatorName}
              {gallery.description && ` — ${gallery.description}`}
            </p>
          </div>
          {gallery.artworks.length > 0 && layout && (
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="shrink-0">
              <TabsList>
                <TabsTrigger value="3d"><Box className="h-4 w-4 mr-1" /> 3D</TabsTrigger>
                <TabsTrigger value="classic"><Frame className="h-4 w-4 mr-1" /> 2D</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      )}
      <div className="flex-1 relative">
        {gallery.artworks.length > 0 && layout ? (
          viewMode === "3d" ? (
            <MazeGallery3D
              artworks={gallery.artworks}
              layout={layout}
              galleryTemplate={gallery.galleryTemplate || "contemporary"}
              artist={{ id: gallery.id, name: gallery.name, avatarUrl: null, specialization: `Curated by ${curatorName}`, bio: posterBio, email: null, country: null, userId: null, galleryLayout: null, galleryTemplate: null, socialLinks: null }}
              isImmersive={isImmersive}
              onRequestImmersive={toggleImmersive}
            />
          ) : (
            <div className="p-4 sm:p-6 overflow-y-auto h-full">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {gallery.artworks.map((artwork) => (
                  <ArtworkCard
                    key={artwork.id}
                    artwork={artwork}
                    onViewDetails={() => setSelectedArtwork(artwork)}
                  />
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Box className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">This gallery has no artworks yet.</p>
            </div>
          </div>
        )}
      </div>

      <ArtworkDetailDialog
        artwork={selectedArtwork}
        open={!!selectedArtwork}
        onOpenChange={(open) => !open && setSelectedArtwork(null)}
      />
    </div>
  );
}
