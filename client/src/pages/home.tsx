import { useState, useEffect, useCallback } from "react";
import { ArtworkDetailDialog } from "@/components/artwork-detail-dialog";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArtworkCard } from "@/components/artwork-card";
import { ArtworkShelf, ShelfItem } from "@/components/artwork-shelf";
import {
  ArrowRight,
  Image,
  Palette,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type {
  ArtworkWithArtist,
  Artist,
  ExhibitionWithArtworks,
  BlogPostWithArtist,
} from "@shared/schema";

// ---------------------------------------------------------------------------
// Hero Carousel
// ---------------------------------------------------------------------------

function HeroCarousel({ artworks }: { artworks: ArtworkWithArtist[] }) {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const slides = artworks.slice(0, 5);

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setCurrent(index);
      setTimeout(() => setIsTransitioning(false), 800);
    },
    [isTransitioning],
  );

  // Auto-advance every 6s
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      goTo((current + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [current, slides.length, goTo]);

  if (slides.length === 0) return <HeroFallback />;

  const slide = slides[current];

  return (
    <section className="relative h-[70vh] min-h-[480px] max-h-[720px] overflow-hidden bg-black">
      {/* Slides */}
      {slides.map((s, i) => (
        <div
          key={s.id}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          <img
            src={s.imageUrl}
            alt={s.title}
            className="w-full h-full object-cover animate-ken-burns"
            style={{
              animationDelay: `${i * -3}s`,
            }}
          />
        </div>
      ))}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

      {/* Content */}
      <div className="absolute inset-0 flex items-end">
        <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20">
          <div className="max-w-xl space-y-4">
            <p className="text-white/70 text-sm font-medium tracking-wider uppercase">
              {slide.artist.name}
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
              {slide.title}
            </h1>
            {slide.medium && (
              <p className="text-white/60 text-sm">
                {slide.medium}
                {slide.year ? ` · ${slide.year}` : ""}
              </p>
            )}
            <div className="flex gap-3 pt-2">
              <Link href="/gallery">
                <Button
                  size="lg"
                  className="bg-white text-black hover:bg-white/90"
                >
                  <Image className="h-5 w-5 mr-2" />
                  View in Gallery
                </Button>
              </Link>
              <Link href="/store">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Browse Store
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() =>
              goTo((current - 1 + slides.length) % slides.length)
            }
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors opacity-0 hover:opacity-100 focus:opacity-100"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => goTo((current + 1) % slides.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors opacity-0 hover:opacity-100 focus:opacity-100"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-8 bg-white"
                    : "w-1.5 bg-white/40 hover:bg-white/60"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function HeroFallback() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/20 py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-4 text-center space-y-6">
        <h1 className="font-serif text-4xl md:text-6xl font-bold tracking-tight leading-tight">
          Discover, Collect &<br />
          <span className="text-primary">Experience Art</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Step into our immersive virtual gallery, explore stunning artworks
          from talented artists worldwide, and build your unique collection.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Link href="/gallery">
            <Button size="lg">
              <Image className="h-5 w-5 mr-2" />
              Enter Gallery
            </Button>
          </Link>
          <Link href="/store">
            <Button size="lg" variant="outline">
              Browse Store
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Exhibition Spotlight
// ---------------------------------------------------------------------------

function ExhibitionSpotlight({
  exhibition,
}: {
  exhibition: ExhibitionWithArtworks;
}) {
  // Pick up to 3 artwork images for the mosaic
  const previewImages = exhibition.artworks
    .slice(0, 3)
    .map((ea) => ea.artwork);

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-card border">
          <div className="grid lg:grid-cols-2 gap-0">
            {/* Image mosaic */}
            <div className="relative h-64 sm:h-80 lg:h-auto lg:min-h-[360px]">
              {previewImages.length >= 3 ? (
                <div className="grid grid-cols-2 grid-rows-2 h-full gap-0.5">
                  <div className="row-span-2">
                    <img
                      src={previewImages[0].imageUrl}
                      alt={previewImages[0].title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <img
                      src={previewImages[1].imageUrl}
                      alt={previewImages[1].title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <img
                      src={previewImages[2].imageUrl}
                      alt={previewImages[2].title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ) : previewImages.length > 0 ? (
                <img
                  src={previewImages[0].imageUrl}
                  alt={previewImages[0].title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Palette className="h-12 w-12 text-muted-foreground/40" />
                </div>
              )}
            </div>

            {/* Text */}
            <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
              <p className="text-xs font-medium tracking-wider uppercase text-primary mb-3">
                Now Showing
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                {exhibition.name}
              </h2>
              {exhibition.description && (
                <p className="text-muted-foreground text-sm leading-relaxed mb-6 line-clamp-3">
                  {exhibition.description}
                </p>
              )}
              <div className="flex items-center gap-3">
                <Link href={`/exhibitions/${exhibition.id}`}>
                  <Button>
                    Enter Exhibition
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/exhibitions">
                  <Button variant="ghost">All Exhibitions</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Artist Spotlight
// ---------------------------------------------------------------------------

function ArtistSpotlight({ artists }: { artists: Artist[] }) {
  const featured = artists.slice(0, 4);
  if (featured.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
              Meet Our Artists
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Talented creators shaping the gallery
            </p>
          </div>
          <Link href="/artists">
            <Button variant="ghost" size="sm">
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {featured.map((artist) => (
            <Link key={artist.id} href={`/artists/${artist.id}`}>
              <Card className="group overflow-hidden hover-elevate cursor-pointer h-full">
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {artist.avatarUrl ? (
                    <img
                      src={artist.avatarUrl}
                      alt={artist.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <span className="font-serif text-4xl font-bold text-primary/40">
                        {artist.name[0]}
                      </span>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-serif font-semibold text-sm sm:text-base truncate">
                    {artist.name}
                  </h3>
                  {artist.specialization && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {artist.specialization}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Blog Highlights
// ---------------------------------------------------------------------------

function BlogHighlights({ posts }: { posts: BlogPostWithArtist[] }) {
  const latest = posts.slice(0, 3);
  if (latest.length === 0) return null;

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
              From the Blog
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Stories, insights, and updates from our community
            </p>
          </div>
          <Link href="/blog">
            <Button variant="ghost" size="sm">
              All Posts <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {latest.map((post, i) => (
            <Link key={post.id} href={`/blog/${post.id}`}>
              <Card
                className={`group overflow-hidden hover-elevate cursor-pointer h-full ${
                  i === 0 && latest.length >= 3 ? "md:col-span-1" : ""
                }`}
              >
                {post.coverImageUrl && (
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={post.coverImageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                )}
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground mb-2">
                    {post.artist.name}
                    {post.createdAt &&
                      ` · ${new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                  </p>
                  <h3 className="font-serif font-semibold text-base leading-snug line-clamp-2 mb-2">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {post.excerpt}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// CTA Section
// ---------------------------------------------------------------------------

function CTASection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-primary px-8 py-16 sm:px-16 sm:py-20 text-center">
          {/* Decorative circles */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10" />

          <div className="relative space-y-6 max-w-xl mx-auto">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary-foreground">
              Ready to Start Your Art Journey?
            </h2>
            <p className="text-primary-foreground/80 text-lg">
              Explore our collection, discover emerging artists, and find pieces
              that speak to you.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-2">
              <Link href="/gallery">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90"
                >
                  Enter the Gallery
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link href="/auth">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-primary-foreground hover:bg-white/10"
                >
                  Join as Artist
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function HomeSkeleton() {
  return (
    <div>
      <Skeleton className="h-[70vh] min-h-[480px] max-h-[720px] w-full rounded-none" />
      <div className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-[300px] shrink-0 space-y-3">
              <Skeleton className="aspect-[4/5] w-full rounded-lg" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Home Page
// ---------------------------------------------------------------------------

export default function Home() {
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkWithArtist | null>(null);

  const { data: artworks, isLoading: artworksLoading } = useQuery<
    ArtworkWithArtist[]
  >({
    queryKey: ["/api/artworks"],
  });

  const { data: artists } = useQuery<Artist[]>({
    queryKey: ["/api/artists"],
  });

  const { data: activeExhibition } = useQuery<ExhibitionWithArtworks>({
    queryKey: ["/api/exhibitions/active"],
    queryFn: async () => {
      const res = await fetch("/api/exhibitions/active", {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: blogPosts } = useQuery<BlogPostWithArtist[]>({
    queryKey: ["/api/blog"],
  });

  if (artworksLoading) return <HomeSkeleton />;

  const allArtworks = artworks ?? [];
  // Use gallery artworks for the hero, remaining for the shelf
  const heroArtworks = allArtworks.filter((a) => a.isInGallery).slice(0, 5);
  const heroIds = new Set(heroArtworks.map((a) => a.id));
  const shelfArtworks = allArtworks.slice(0, 12);
  // "New This Week" — artworks not already in the hero, reversed to show newest first
  const newArtworks = allArtworks
    .filter((a) => !heroIds.has(a.id))
    .slice(-8)
    .reverse();

  return (
    <div className="min-h-screen">
      {/* 1. Hero Carousel */}
      <HeroCarousel artworks={heroArtworks.length > 0 ? heroArtworks : allArtworks.slice(0, 5)} />

      {/* 2. Featured Artworks Shelf */}
      {shelfArtworks.length > 0 && (
        <ArtworkShelf
          title="Featured Artworks"
          subtitle="Handpicked masterpieces from our collection"
          action={
            <Link href="/gallery?view=classic">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          }
        >
          {shelfArtworks.map((artwork) => (
            <ShelfItem key={artwork.id}>
              <ArtworkCard
                artwork={artwork}
                onViewDetails={() => setSelectedArtwork(artwork)}
              />
            </ShelfItem>
          ))}
        </ArtworkShelf>
      )}

      {/* 3. New This Week Shelf */}
      {newArtworks.length > 0 && (
        <ArtworkShelf
          title="New This Week"
          subtitle="Recently added to our collection"
          action={
            <Link href="/gallery?view=classic">
              <Button variant="ghost" size="sm">
                Browse All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          }
        >
          {newArtworks.map((artwork) => (
            <ShelfItem key={artwork.id}>
              <ArtworkCard
                artwork={artwork}
                onViewDetails={() => setSelectedArtwork(artwork)}
              />
            </ShelfItem>
          ))}
        </ArtworkShelf>
      )}

      {/* 4. Exhibition Spotlight */}
      {activeExhibition && (
        <ExhibitionSpotlight exhibition={activeExhibition} />
      )}

      {/* 5. Artist Spotlight */}
      {artists && artists.length > 0 && (
        <ArtistSpotlight artists={artists} />
      )}

      {/* 6. Blog Highlights */}
      {blogPosts && blogPosts.length > 0 && (
        <BlogHighlights posts={blogPosts} />
      )}

      {/* 7. CTA */}
      <CTASection />

      <ArtworkDetailDialog
        artwork={selectedArtwork}
        open={!!selectedArtwork}
        onOpenChange={(open) => !open && setSelectedArtwork(null)}
      />
    </div>
  );
}
