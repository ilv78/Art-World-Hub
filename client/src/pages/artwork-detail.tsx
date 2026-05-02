import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Calendar, Ruler, Palette, Box } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { ArtworkWithArtist } from "@shared/schema";
import { ResponsiveImage } from "@/components/responsive-image";
import { ARTWORK_SIZES } from "@/lib/artwork-image";

interface PublicArtworkResponse {
  artwork: ArtworkWithArtist;
  related: ArtworkWithArtist[];
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
}

export default function ArtworkDetail({
  params,
}: {
  params: { slug: string };
}) {
  const { data, isLoading, isError } = useQuery<PublicArtworkResponse>({
    queryKey: [`/api/public/artworks/${params.slug}`],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2">
            <Skeleton className="aspect-[4/5] w-full rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center text-center">
        <h2 className="font-serif text-2xl font-semibold mb-2">
          Artwork not found
        </h2>
        <p className="text-muted-foreground mb-4">
          This artwork doesn't exist or has been removed.
        </p>
        <Button asChild variant="outline">
          <Link href="/store">Browse Store</Link>
        </Button>
      </div>
    );
  }

  const { artwork, related } = data;
  const artistUrl = `/artists/${artwork.artist.slug}`;
  const dimensions = artwork.dimensions
    ? /cm|mm|in|"/i.test(artwork.dimensions)
      ? artwork.dimensions
      : `${artwork.dimensions} cm`
    : null;

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>{`${artwork.title} by ${artwork.artist.name} — Vernis9`}</title>
      </Helmet>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10 lg:px-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href={artistUrl}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {artwork.artist.name}
          </Link>
        </Button>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="relative flex items-start justify-center overflow-hidden rounded-lg bg-muted">
            <ResponsiveImage
              src={artwork.imageUrl}
              alt={`${artwork.title} by ${artwork.artist.name}`}
              sizes={ARTWORK_SIZES.detail}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="w-full h-auto object-contain max-h-[80vh]"
            />
            {!artwork.isForSale && (
              <Badge className="absolute top-3 right-3" variant="secondary">
                Not for sale
              </Badge>
            )}
          </div>

          <div className="flex flex-col space-y-6">
            <header className="space-y-3">
              <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
                {artwork.title}
              </h1>
              <Link
                href={artistUrl}
                className="inline-flex items-center gap-3 group"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={artwork.artist.avatarUrl || undefined}
                    alt={artwork.artist.name}
                  />
                  <AvatarFallback className="text-xs">
                    {initialsOf(artwork.artist.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium group-hover:text-primary transition-colors">
                    {artwork.artist.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    View artist profile
                  </div>
                </div>
              </Link>
            </header>

            {artwork.description && (
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {artwork.description}
              </p>
            )}

            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <Palette className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <dt className="text-muted-foreground text-xs">Medium</dt>
                  <dd className="font-medium">{artwork.medium}</dd>
                </div>
              </div>
              {dimensions && (
                <div className="flex items-start gap-2">
                  <Ruler className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <dt className="text-muted-foreground text-xs">Dimensions</dt>
                    <dd className="font-medium">{dimensions}</dd>
                  </div>
                </div>
              )}
              {artwork.year && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <dt className="text-muted-foreground text-xs">Year</dt>
                    <dd className="font-medium">{artwork.year}</dd>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Box className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <dt className="text-muted-foreground text-xs">Category</dt>
                  <dd className="font-medium">{artwork.category}</dd>
                </div>
              </div>
            </dl>

            {artwork.isForSale && Number(artwork.price) > 0 && (
              <div className="border-t pt-6">
                <div className="text-3xl font-serif font-bold text-primary">
                  {formatPrice(artwork.price)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Contact the artist to arrange purchase and shipping.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="outline">
                <Link href={artistUrl}>
                  View in 3D Gallery
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href={artistUrl}>Contact artist</Link>
              </Button>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-16 border-t pt-12">
            <h2 className="font-serif text-2xl font-bold mb-6">
              More from {artwork.artist.name}
            </h2>
            <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/artworks/${r.slug}`}
                  className="group block"
                >
                  <div className="aspect-square overflow-hidden rounded-md bg-muted">
                    <ResponsiveImage
                      src={r.imageUrl}
                      alt={r.title}
                      sizes={ARTWORK_SIZES.card}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      pictureClassName="block w-full h-full"
                    />
                  </div>
                  <div className="mt-2 text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                    {r.title}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
