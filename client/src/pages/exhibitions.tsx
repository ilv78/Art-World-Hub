import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Calendar, Clock, Image as ImageIcon } from "lucide-react";
import { PageMeta } from "@/components/page-meta";
import type { CuratorGalleryWithArtworks } from "@shared/schema";

export default function Exhibitions() {
  const { data: exhibitions, isLoading } = useQuery<CuratorGalleryWithArtworks[]>({
    queryKey: ["/api/curated-exhibitions"],
  });

  const now = new Date();

  const isActive = (g: CuratorGalleryWithArtworks) => {
    if (g.startDate && now < new Date(g.startDate)) return false;
    if (g.endDate && now > new Date(g.endDate)) return false;
    return true;
  };

  const active = exhibitions?.filter(isActive) || [];
  const upcoming = exhibitions?.filter(g => !isActive(g)) || [];

  const formatDate = (d: string | Date | null | undefined, tz?: string | null) => {
    if (!d) return "";
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz || "UTC",
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(d));
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-10">
      <PageMeta title="Exhibitions" />
      <div>
        <h1 className="text-3xl font-bold font-serif">Exhibitions</h1>
        <p className="text-muted-foreground mt-1">Curated art experiences — walk through each exhibition in 3D</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : !exhibitions?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Calendar className="w-12 h-12 mb-4" />
            <p>No exhibitions available at the moment. Check back soon!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {active.length > 0 && (
            <section className="space-y-6">
              <h2 className="font-serif text-2xl font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                Now Open
              </h2>
              {/* Hero: first active exhibition */}
              <HeroExhibition exhibition={active[0]} formatDate={formatDate} />
              {/* Remaining active */}
              {active.length > 1 && (
                <div className="grid gap-4 md:grid-cols-2 mt-5">
                  {active.slice(1).map(exhibition => (
                    <ExhibitionCard key={exhibition.id} exhibition={exhibition} status="active" formatDate={formatDate} />
                  ))}
                </div>
              )}
            </section>
          )}

          {upcoming.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                Coming Soon
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {upcoming.map(exhibition => (
                  <ExhibitionCard key={exhibition.id} exhibition={exhibition} status="upcoming" formatDate={formatDate} variant="upcoming" />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function HeroExhibition({ exhibition, formatDate }: {
  exhibition: CuratorGalleryWithArtworks;
  formatDate: (d: string | Date | null | undefined, tz?: string | null) => string;
}) {
  const curatorName = [exhibition.curator.firstName, exhibition.curator.lastName].filter(Boolean).join(" ") || "Curator";
  const heroImage = exhibition.artworks[0]?.imageUrl;

  return (
    <Link href={`/curator-gallery/${exhibition.id}`}>
      <div className="relative rounded-2xl overflow-hidden group cursor-pointer">
        {heroImage ? (
          <img
            src={heroImage}
            alt={exhibition.name}
            className="w-full h-64 sm:h-80 object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-64 sm:h-80 bg-muted flex items-center justify-center">
            <ImageIcon className="w-16 h-16 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <Badge className="bg-green-600 mb-3">Open Now</Badge>
          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-1">{exhibition.name}</h3>
          {exhibition.description && (
            <p className="text-white/70 text-sm mb-2 line-clamp-2">{exhibition.description}</p>
          )}
          <p className="text-white/50 text-xs mb-4">
            Curated by {curatorName} · {exhibition.artworks.length} artworks
          </p>
          <Button className="bg-white text-black hover:bg-white/90">
            Enter Exhibition
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </Link>
  );
}

function ExhibitionCard({ exhibition, status, formatDate, variant }: {
  exhibition: CuratorGalleryWithArtworks;
  status: "active" | "upcoming";
  formatDate: (d: string | Date | null | undefined, tz?: string | null) => string;
  variant?: "upcoming";
}) {
  const curatorName = [exhibition.curator.firstName, exhibition.curator.lastName].filter(Boolean).join(" ") || "Curator";
  const tz = (exhibition as any).timezone || "UTC";
  const tzLabel = tz.split("/").pop()?.replace(/_/g, " ") || "UTC";
  const previewArtworks = exhibition.artworks.slice(0, 4);

  return (
    <Card className={`overflow-hidden hover-elevate ${variant === "upcoming" ? "border-dashed opacity-80" : ""}`}>
      {/* Artwork preview strip */}
      {previewArtworks.length > 0 ? (
        <div className="flex h-48 overflow-hidden">
          {previewArtworks.map(aw => (
            <img key={aw.id} src={aw.imageUrl} alt={aw.title} className="flex-1 object-cover min-w-0" />
          ))}
        </div>
      ) : (
        <div className="h-48 bg-muted flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-muted-foreground" />
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-serif">{exhibition.name}</CardTitle>
          <Badge className={status === "active" ? "bg-green-600" : ""}
            variant={status === "upcoming" ? "outline" : "default"}>
            {status === "active" ? "Open Now" : "Upcoming"}
          </Badge>
        </div>
        {exhibition.description && <CardDescription>{exhibition.description}</CardDescription>}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Curated by {curatorName}</div>
          <div>{exhibition.artworks.length} artworks</div>
          {exhibition.startDate && exhibition.endDate && (
            <div className="text-xs">
              {formatDate(exhibition.startDate, tz)} — {formatDate(exhibition.endDate, tz)} ({tzLabel})
            </div>
          )}
        </div>

        {/* Artists & artworks listing */}
        {exhibition.artworks.length > 0 && (() => {
          const byArtist = new Map<string, { name: string; titles: string[] }>();
          for (const aw of exhibition.artworks) {
            const key = aw.artist.id;
            if (!byArtist.has(key)) byArtist.set(key, { name: aw.artist.name, titles: [] });
            byArtist.get(key)!.titles.push(aw.title);
          }
          return (
            <div className="text-xs text-muted-foreground border-t pt-2 space-y-1">
              {Array.from(byArtist.values()).map(({ name, titles }) => (
                <div key={name}>
                  <span className="font-medium text-foreground">{name}</span>
                  <span className="ml-1">— {titles.join(", ")}</span>
                </div>
              ))}
            </div>
          );
        })()}

        {status === "active" ? (
          <Link href={`/curator-gallery/${exhibition.id}`}>
            <Button className="w-full">
              Enter Exhibition
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        ) : (
          <Button className="w-full" disabled variant="outline">
            <Clock className="w-4 h-4 mr-2" />
            Opens {formatDate(exhibition.startDate, tz)}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
