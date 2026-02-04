import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Image, ShoppingBag, Gavel, Sparkles } from "lucide-react";
import type { ArtworkWithArtist, AuctionWithArtwork } from "@shared/schema";

export default function Home() {
  const { data: featuredArtworks, isLoading: artworksLoading } = useQuery<ArtworkWithArtist[]>({
    queryKey: ["/api/artworks"],
  });

  const { data: activeAuctions, isLoading: auctionsLoading } = useQuery<AuctionWithArtwork[]>({
    queryKey: ["/api/auctions"],
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/20 py-20 px-6">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1920&q=80')] bg-cover bg-center opacity-5" />
        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <Badge variant="outline" className="px-4 py-1">
            <Sparkles className="h-3 w-3 mr-2" />
            Experience Art Like Never Before
          </Badge>
          <h1 className="font-serif text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Discover, Collect &<br />
            <span className="text-primary">Experience Art</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Step into our immersive virtual gallery, explore stunning artworks from talented
            artists worldwide, and build your unique collection through our store and auctions.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link href="/gallery">
              <Button size="lg" data-testid="button-hero-gallery">
                <Image className="h-5 w-5 mr-2" />
                Enter Gallery
              </Button>
            </Link>
            <Link href="/store">
              <Button size="lg" variant="outline" data-testid="button-hero-store">
                <ShoppingBag className="h-5 w-5 mr-2" />
                Browse Store
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="hover-elevate">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Image className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold">Virtual Gallery</h3>
                <p className="text-sm text-muted-foreground">
                  Immerse yourself in our 3D virtual gallery. Walk through curated exhibitions
                  and experience art in a whole new dimension.
                </p>
                <Link href="/gallery">
                  <Button variant="ghost" className="mt-2" data-testid="button-feature-gallery">
                    Explore Gallery
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <ShoppingBag className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold">Art Store</h3>
                <p className="text-sm text-muted-foreground">
                  Discover and purchase original artworks directly from artists. Each piece is
                  authenticated and delivered with care.
                </p>
                <Link href="/store">
                  <Button variant="ghost" className="mt-2" data-testid="button-feature-store">
                    Visit Store
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Gavel className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold">Live Auctions</h3>
                <p className="text-sm text-muted-foreground">
                  Participate in exciting live auctions for exclusive artworks. Bid on rare
                  pieces and add them to your collection.
                </p>
                <Link href="/auctions">
                  <Button variant="ghost" className="mt-2" data-testid="button-feature-auctions">
                    Join Auctions
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Artworks */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-3xl font-bold">Featured Artworks</h2>
              <p className="text-muted-foreground mt-1">Handpicked masterpieces for you</p>
            </div>
            <Link href="/store">
              <Button variant="ghost" data-testid="button-view-all-artworks">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {artworksLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-[4/5]" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </CardContent>
                </Card>
              ))
            ) : featuredArtworks && featuredArtworks.length > 0 ? (
              featuredArtworks.slice(0, 4).map((artwork) => (
                <Link href="/store" key={artwork.id}>
                  <Card className="overflow-hidden hover-elevate cursor-pointer group" data-testid={`card-featured-${artwork.id}`}>
                    <div className="aspect-[4/5] overflow-hidden">
                      <img
                        src={artwork.imageUrl}
                        alt={artwork.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <CardContent className="p-4 space-y-1">
                      <h3 className="font-serif font-semibold truncate">{artwork.title}</h3>
                      <p className="text-sm text-muted-foreground">{artwork.artist.name}</p>
                      <p className="font-semibold text-primary">
                        ${parseFloat(artwork.price).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No featured artworks available yet
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Active Auctions */}
      <section className="py-16 px-6 bg-card/50">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-3xl font-bold">Live Auctions</h2>
              <p className="text-muted-foreground mt-1">Don't miss these exciting opportunities</p>
            </div>
            <Link href="/auctions">
              <Button variant="ghost" data-testid="button-view-all-auctions">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctionsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-[4/3]" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-8 w-full mt-4" />
                  </CardContent>
                </Card>
              ))
            ) : activeAuctions && activeAuctions.length > 0 ? (
              activeAuctions.slice(0, 3).map((auction) => (
                <Link href="/auctions" key={auction.id}>
                  <Card className="overflow-hidden hover-elevate cursor-pointer group" data-testid={`card-auction-${auction.id}`}>
                    <div className="aspect-[4/3] overflow-hidden relative">
                      <img
                        src={auction.artwork.imageUrl}
                        alt={auction.artwork.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <Badge className="absolute top-3 right-3 bg-green-500">
                        Live
                      </Badge>
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-serif font-semibold truncate">{auction.artwork.title}</h3>
                      <p className="text-sm text-muted-foreground">{auction.artwork.artist.name}</p>
                      <div className="flex justify-between items-center pt-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Current Bid</p>
                          <p className="font-bold text-primary">
                            ${parseFloat(auction.currentBid || auction.startingPrice).toLocaleString()}
                          </p>
                        </div>
                        <Button size="sm">
                          <Gavel className="h-4 w-4 mr-2" />
                          Bid Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No active auctions at the moment
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="font-serif text-3xl md:text-4xl font-bold">
            Ready to Start Your Art Journey?
          </h2>
          <p className="text-lg text-muted-foreground">
            Explore our collection, discover emerging artists, and find pieces that speak to you.
          </p>
          <Link href="/gallery">
            <Button size="lg" data-testid="button-cta-enter">
              Enter the Gallery
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
