import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Info,
  ShoppingCart,
  X,
  Box,
  Frame,
} from "lucide-react";
import type { ArtworkWithArtist } from "@shared/schema";
import { useCartStore } from "@/lib/cart-store";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { HallwayGallery3D } from "@/components/hallway-gallery-3d";

type ViewMode = "3d" | "classic";

interface ArtistRoom {
  artist: { id: string; name: string; avatarUrl: string | null; specialization: string | null };
  artworks: ArtworkWithArtist[];
}

export default function Gallery() {
  const isMobile = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  const [viewMode, setViewMode] = useState<ViewMode>(isMobile ? "classic" : "3d");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);

  const { data: artworks, isLoading: artworksLoading } = useQuery<ArtworkWithArtist[]>({
    queryKey: ["/api/artworks"],
  });

  const { data: hallwayData, isLoading: hallwayLoading } = useQuery<ArtistRoom[]>({
    queryKey: ["/api/gallery/hallway"],
  });

  const { data: curatedData } = useQuery<{ gallery: { id: string; name: string; description?: string | null; galleryLayout?: any; curator: { id: string; firstName: string | null; lastName: string | null } }; artworks: ArtworkWithArtist[] }[]>({
    queryKey: ["/api/gallery/curated"],
  });

  const { addItem, items } = useCartStore();
  const { toast } = useToast();

  const galleryArtworks = artworks?.filter((a) => a.isInGallery) || [];
  const currentArtwork = galleryArtworks[currentIndex];
  const isInCart = currentArtwork
    ? items.some((item) => item.artwork.id === currentArtwork.id)
    : false;

  const handlePrevious = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? galleryArtworks.length - 1 : prev - 1
    );
    setZoom(1);
    setShowInfo(false);
  };

  const handleNext = () => {
    setCurrentIndex((prev) =>
      prev === galleryArtworks.length - 1 ? 0 : prev + 1
    );
    setZoom(1);
    setShowInfo(false);
  };

  const handleAddToCart = () => {
    if (currentArtwork && !isInCart && currentArtwork.isForSale) {
      addItem(currentArtwork);
      toast({
        title: "Added to cart",
        description: `"${currentArtwork.title}" has been added to your cart.`,
      });
    }
  };

  // Swipe tracking for mobile classic view
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== "classic") return;
      if (e.key === "ArrowLeft") handlePrevious();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "i") setShowInfo((prev) => !prev);
      if (e.key === "Escape") setShowInfo(false);
    };
    const handleTouchStart = (e: TouchEvent) => {
      if (viewMode !== "classic") return;
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (viewMode !== "classic" || !touchStartRef.current) return;
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      touchStartRef.current = null;
      // Only horizontal swipes (minimum 50px, not too vertical)
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) handleNext();
        else handlePrevious();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [galleryArtworks.length, viewMode]);

  const isLoading = artworksLoading || hallwayLoading;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="w-96 h-80 mx-auto rounded-lg" />
          <Skeleton className="w-48 h-6 mx-auto" />
          <Skeleton className="w-32 h-4 mx-auto" />
        </div>
      </div>
    );
  }

  if (!galleryArtworks.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto">
            <ZoomIn className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="font-serif text-2xl font-bold">Gallery Coming Soon</h2>
          <p className="text-muted-foreground">
            Our virtual gallery is being curated. Check back soon!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden" ref={galleryRef}>
      <div className="relative z-20 flex items-center justify-between p-4 border-b bg-background">
        <div>
          <h1 className="font-serif text-2xl font-bold">Virtual Gallery</h1>
          <p className="text-sm text-muted-foreground">
            {viewMode === "3d"
              ? `Museum hallway with ${hallwayData?.length || 0} artist rooms${curatedData?.length ? ` + ${curatedData.length} curated` : ""}`
              : `Artwork ${currentIndex + 1} of ${galleryArtworks.length}`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="3d" className="gap-2" data-testid="tab-3d-view">
                <Box className="h-4 w-4" />
                <span className="hidden sm:inline">3D Museum</span>
              </TabsTrigger>
              <TabsTrigger value="classic" className="gap-2" data-testid="tab-classic-view">
                <Frame className="h-4 w-4" />
                <span className="hidden sm:inline">Classic</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {viewMode === "classic" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowInfo((prev) => !prev)}
              data-testid="button-toggle-info"
            >
              <Info className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {viewMode === "3d" && (
        <div className="flex-1 relative">
          {hallwayData && hallwayData.length > 0 ? (
            <HallwayGallery3D artistRooms={hallwayData} curatorRooms={curatedData} />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Box className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="font-serif text-2xl font-bold">No Exhibition Rooms Yet</h2>
                <p className="text-muted-foreground">
                  Artists are preparing their exhibitions. Switch to Classic view to browse all artworks.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === "classic" && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-stone-100 to-stone-200 dark:from-stone-900 dark:to-stone-950">
            <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-amber-900/20 to-transparent" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-32 bg-gradient-to-b from-yellow-100/30 to-transparent dark:from-yellow-100/10 blur-xl" />
          </div>

          <div className="relative flex-1 flex items-center justify-center gap-2 sm:gap-4 p-4 sm:p-8">
            <Button
              variant="secondary"
              size="icon"
              className="flex-shrink-0 z-20 h-12 w-12 rounded-full shadow-lg"
              onClick={handlePrevious}
              data-testid="button-prev-artwork"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            <div
              className="relative transition-transform duration-500 ease-out"
              style={{ transform: `scale(${zoom})` }}
            >
              <img
                src={currentArtwork.imageUrl}
                alt={currentArtwork.title}
                className="max-w-[70vw] sm:max-w-lg max-h-[50vh] sm:max-h-[60vh] object-contain shadow-2xl rounded-sm"
                data-testid="img-current-artwork"
              />
              <div className="absolute -bottom-12 left-0 right-0 sm:bottom-0 sm:left-full sm:right-auto sm:ml-2 z-20 w-auto sm:w-48 p-2 bg-white/90 dark:bg-stone-800/90 backdrop-blur-sm shadow-lg rounded-sm text-left">
                <h3 className="font-serif font-bold text-sm truncate" data-testid="text-artwork-title">
                  {currentArtwork.title}
                </h3>
                <p className="text-xs text-muted-foreground" data-testid="text-artwork-artist">
                  {currentArtwork.artist.name}
                  {currentArtwork.year && `, ${currentArtwork.year}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1 hidden sm:block">{currentArtwork.medium}</p>
              </div>
            </div>

            <Button
              variant="secondary"
              size="icon"
              className="flex-shrink-0 z-20 h-12 w-12 rounded-full shadow-lg"
              onClick={handleNext}
              data-testid="button-next-artwork"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>

          </div>

          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full p-1 shadow-lg">
            <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} disabled={zoom <= 0.5} data-testid="button-zoom-out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.min(2, z + 0.25))} disabled={zoom >= 2} data-testid="button-zoom-in">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setZoom(1)} data-testid="button-zoom-reset">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative z-10 p-4 border-t bg-background/80 backdrop-blur-sm">
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {galleryArtworks.map((artwork, index) => (
                  <button
                    key={artwork.id}
                    onClick={() => { setCurrentIndex(index); setZoom(1); setShowInfo(false); }}
                    className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${
                      index === currentIndex
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                    data-testid={`button-thumbnail-${artwork.id}`}
                  >
                    <img src={artwork.imageUrl} alt={artwork.title} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {showInfo && currentArtwork && (
            <div className="absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-background border-l shadow-2xl z-30 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-serif text-lg font-bold">Artwork Details</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowInfo(false)} data-testid="button-close-info">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                  <div className="aspect-[4/3] rounded-lg overflow-hidden">
                    <img src={currentArtwork.imageUrl} alt={currentArtwork.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-serif text-xl font-bold">{currentArtwork.title}</h3>
                      <p className="text-muted-foreground">{currentArtwork.artist.name}</p>
                    </div>
                    <p className="text-sm leading-relaxed">{currentArtwork.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Medium</span>
                        <p className="font-medium">{currentArtwork.medium}</p>
                      </div>
                      {currentArtwork.dimensions && (
                        <div>
                          <span className="text-muted-foreground">Dimensions</span>
                          <p className="font-medium">{currentArtwork.dimensions}</p>
                        </div>
                      )}
                      {currentArtwork.year && (
                        <div>
                          <span className="text-muted-foreground">Year</span>
                          <p className="font-medium">{currentArtwork.year}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Category</span>
                        <p className="font-medium">{currentArtwork.category}</p>
                      </div>
                    </div>
                    <Card>
                      <CardContent className="p-4">
                        {currentArtwork.isForSale && (
                          <div className="flex items-center justify-between gap-2 mb-4">
                            <span className="text-sm text-muted-foreground">Price</span>
                            <span className="text-2xl font-bold text-primary">
                              {formatPrice(currentArtwork.price)}
                            </span>
                          </div>
                        )}
                        {currentArtwork.isForSale ? (
                          <Button className="w-full" onClick={handleAddToCart} disabled={isInCart} data-testid="button-gallery-add-cart">
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            {isInCart ? "Already in Cart" : "Add to Cart"}
                          </Button>
                        ) : (
                          <Button className="w-full" disabled>Sold Out</Button>
                        )}
                      </CardContent>
                    </Card>
                    {currentArtwork.artist.bio && (
                      <div className="pt-4 border-t">
                        <h4 className="font-serif font-semibold mb-2">About the Artist</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{currentArtwork.artist.bio}</p>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </>
      )}
    </div>
  );
}
