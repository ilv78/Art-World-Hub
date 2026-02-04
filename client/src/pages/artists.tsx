import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MapPin, Palette, Image, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import type { Artist, ArtworkWithArtist } from "@shared/schema";

export default function Artists() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);

  const { data: artists, isLoading } = useQuery<Artist[]>({
    queryKey: ["/api/artists"],
  });

  const { data: artistArtworks, isLoading: artworksLoading } = useQuery<
    ArtworkWithArtist[]
  >({
    queryKey: [`/api/artists/${selectedArtist?.id}/artworks`],
    enabled: !!selectedArtist,
  });

  const filteredArtists =
    artists?.filter(
      (artist) =>
        artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.country?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-serif text-3xl font-bold">Featured Artists</h1>
        <p className="text-muted-foreground">
          Discover talented artists from around the world
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search artists by name, specialty, or country..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-artists"
        />
      </div>

      {/* Artists Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-6 text-center space-y-4">
                <Skeleton className="w-24 h-24 rounded-full mx-auto" />
                <Skeleton className="h-6 w-3/4 mx-auto" />
                <Skeleton className="h-4 w-1/2 mx-auto" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredArtists.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-serif text-xl font-semibold mb-2">No artists found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search to find what you're looking for.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredArtists.map((artist) => (
            <Card
              key={artist.id}
              className="overflow-hidden hover-elevate cursor-pointer group"
              onClick={() => setSelectedArtist(artist)}
              data-testid={`card-artist-${artist.id}`}
            >
              <CardContent className="p-6 text-center space-y-4">
                <Avatar className="w-24 h-24 mx-auto ring-4 ring-background shadow-lg group-hover:ring-primary/20 transition-all">
                  <AvatarImage src={artist.avatarUrl || undefined} />
                  <AvatarFallback className="text-2xl font-serif">
                    {artist.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <h3 className="font-serif font-bold text-lg">{artist.name}</h3>
                  {artist.country && (
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {artist.country}
                    </p>
                  )}
                </div>

                {artist.specialization && (
                  <Badge variant="outline" className="mx-auto">
                    <Palette className="h-3 w-3 mr-1" />
                    {artist.specialization}
                  </Badge>
                )}

                <p className="text-sm text-muted-foreground line-clamp-3">
                  {artist.bio}
                </p>

                <Link href={`/artists/${artist.id}`}>
                  <Button variant="ghost" className="w-full" data-testid={`button-view-artist-${artist.id}`}>
                    View Profile
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Artist Detail Dialog */}
      <Dialog
        open={!!selectedArtist}
        onOpenChange={(open) => !open && setSelectedArtist(null)}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
          {selectedArtist && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16 ring-2 ring-primary/20">
                    <AvatarImage src={selectedArtist.avatarUrl || undefined} />
                    <AvatarFallback className="text-xl font-serif">
                      {selectedArtist.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="font-serif text-2xl">
                      {selectedArtist.name}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-2">
                      {selectedArtist.country && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {selectedArtist.country}
                        </span>
                      )}
                      {selectedArtist.specialization && (
                        <>
                          <span>|</span>
                          <span className="flex items-center gap-1">
                            <Palette className="h-3 w-3" />
                            {selectedArtist.specialization}
                          </span>
                        </>
                      )}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-6 py-4">
                  <div>
                    <h4 className="font-semibold mb-2">About</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedArtist.bio}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold">Artworks</h4>
                      <Link href="/store">
                        <Button variant="ghost" size="sm">
                          View All
                          <ExternalLink className="h-3 w-3 ml-2" />
                        </Button>
                      </Link>
                    </div>

                    {artworksLoading ? (
                      <div className="grid grid-cols-3 gap-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <Skeleton key={i} className="aspect-square rounded-md" />
                        ))}
                      </div>
                    ) : artistArtworks && artistArtworks.length > 0 ? (
                      <div className="grid grid-cols-3 gap-3">
                        {artistArtworks.slice(0, 6).map((artwork) => (
                          <div
                            key={artwork.id}
                            className="aspect-square rounded-md overflow-hidden group/artwork"
                          >
                            <img
                              src={artwork.imageUrl}
                              alt={artwork.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover/artwork:scale-110"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No artworks available yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
