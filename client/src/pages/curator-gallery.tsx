import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { MazeGallery3D } from "@/components/maze-gallery-3d";
import { Skeleton } from "@/components/ui/skeleton";
import { Box } from "lucide-react";
import type { CuratorGalleryWithArtworks, MazeLayout } from "@shared/schema";

export default function CuratorGalleryPage() {
  const [, params] = useRoute("/curator-gallery/:id");
  const galleryId = params?.id;

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
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="p-4 border-b bg-background">
        <h1 className="font-serif text-2xl font-bold">{gallery.name}</h1>
        <p className="text-sm text-muted-foreground">
          Curated by {curatorName}
          {gallery.description && ` — ${gallery.description}`}
        </p>
      </div>
      <div className="flex-1 relative">
        {gallery.artworks.length > 0 && layout ? (
          <MazeGallery3D
            artworks={gallery.artworks}
            layout={layout}
            galleryTemplate={gallery.galleryTemplate || "contemporary"}
            artist={{ id: gallery.id, name: gallery.name, avatarUrl: null, specialization: `Curated by ${curatorName}`, bio: posterBio, email: null, country: null, userId: null, galleryLayout: null, galleryTemplate: null, socialLinks: null }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Box className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">This gallery has no artworks yet.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
