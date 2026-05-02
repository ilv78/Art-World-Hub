import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Palette,
  Image as ImageIcon,
  FileText,
  Calendar,
  ArrowLeft,
  ShoppingCart,
  Box,
  Globe,
  ExternalLink,
  X
} from "lucide-react";
import { useImmersiveMode } from "@/hooks/use-immersive-mode";
import { ResponsiveArtworkImage } from "@/components/responsive-artwork-image";
import { ARTWORK_SIZES } from "@/lib/artwork-image";
import { SiInstagram, SiX, SiFacebook, SiYoutube, SiTiktok, SiBehance, SiDribbble, SiDeviantart, SiPinterest } from "react-icons/si";
import { FaLinkedin } from "react-icons/fa6";
import { useCartStore } from "@/lib/cart-store";
import { formatPrice } from "@/lib/utils";
import { MazeGallery3D } from "@/components/maze-gallery-3d";
import { ArtworkDetailDialog } from "@/components/artwork-detail-dialog";
import type { Artist, ArtworkWithArtist, BlogPostWithArtist, MazeLayout } from "@shared/schema";

interface GalleryData {
  layout: MazeLayout;
  artworks: ArtworkWithArtist[];
}

const socialPlatforms: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  website: { label: "Website", icon: Globe },
  instagram: { label: "Instagram", icon: SiInstagram },
  x: { label: "X", icon: SiX },
  facebook: { label: "Facebook", icon: SiFacebook },
  youtube: { label: "YouTube", icon: SiYoutube },
  tiktok: { label: "TikTok", icon: SiTiktok },
  linkedin: { label: "LinkedIn", icon: FaLinkedin },
  behance: { label: "Behance", icon: SiBehance },
  dribbble: { label: "Dribbble", icon: SiDribbble },
  deviantart: { label: "DeviantArt", icon: SiDeviantart },
  pinterest: { label: "Pinterest", icon: SiPinterest },
};

export default function ArtistProfile() {
  const params = useParams<{ slug: string }>();
  const addItem = useCartStore((state) => state.addItem);
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkWithArtist | null>(null);
  const urlTab = new URLSearchParams(window.location.search).get("tab");
  const [activeTab, setActiveTab] = useState(urlTab === "portfolio" || urlTab === "blog" ? urlTab : "gallery");
  const { isImmersive, toggleImmersive } = useImmersiveMode();

  const { data: artistPayload, isLoading: artistLoading } = useQuery<{ artist: Artist }>({
    queryKey: ["/api/public/artists", params.slug],
    enabled: !!params.slug,
  });
  const artist = artistPayload?.artist;
  const artistId = artist?.id;

  const { data: artworks, isLoading: artworksLoading } = useQuery<ArtworkWithArtist[]>({
    queryKey: ["/api/artists", artistId, "artworks"],
    enabled: !!artistId,
  });

  const { data: galleryData, isLoading: galleryLoading } = useQuery<GalleryData>({
    queryKey: ["/api/artists", artistId, "gallery"],
    enabled: !!artistId,
  });

  const { data: blogPosts, isLoading: blogLoading } = useQuery<BlogPostWithArtist[]>({
    queryKey: ["/api/artists", artistId, "blog"],
    enabled: !!artistId,
  });

  const publishedPosts = blogPosts?.filter(post => post.isPublished) || [];
  const publishedArtworks = artworks?.filter(a => a.isPublished) || [];
  const galleryArtworks = galleryData?.artworks || [];
  const galleryLayout = galleryData?.layout;

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (artistLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-48" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="p-6 text-center">
        <h1 className="font-serif text-2xl font-bold mb-4">Artist Not Found</h1>
        <p className="text-muted-foreground mb-4">The artist you're looking for doesn't exist.</p>
        <Link href="/artists">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Artists
          </Button>
        </Link>
      </div>
    );
  }

  if (isImmersive && galleryArtworks.length > 0 && galleryLayout) {
    return (
      <div className="h-screen w-full">
        <Button
          size="icon"
          variant="secondary"
          className="fixed top-4 right-4 z-50 shadow-lg"
          onClick={toggleImmersive}
          data-testid="button-exit-immersive"
        >
          <X className="w-5 h-5" />
        </Button>
        <MazeGallery3D
          artworks={galleryArtworks}
          layout={galleryLayout}
          galleryTemplate={artist.galleryTemplate || "contemporary"}
          artist={artist}
          onExitGallery={() => { toggleImmersive(); setActiveTab("portfolio"); }}
          isImmersive={true}
          onRequestImmersive={toggleImmersive}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Helmet><title>{`${artist.name} — Vernis9`}</title></Helmet>
      <div className="relative h-48 bg-linear-to-br from-primary/20 via-primary/10 to-background">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHoiIHN0cm9rZT0icmdiYSgwLDAsMCwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-24 relative z-10 pb-12">
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <Avatar className="w-32 h-32 ring-4 ring-background shadow-xl">
                <AvatarImage src={artist.avatarUrl || undefined} alt={artist.name} fetchPriority="high" />
                <AvatarFallback className="text-4xl font-serif">
                  {artist.name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center sm:text-left">
                <h1 className="font-serif text-3xl font-bold mb-2" data-testid="text-artist-name">{artist.name}</h1>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-muted-foreground mb-4">
                  {artist.country && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {artist.country}
                    </span>
                  )}
                  {artist.specialization && (
                    <Badge variant="outline">
                      <Palette className="h-3 w-3 mr-1" />
                      {artist.specialization}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{artist.bio}</p>
                {artist.socialLinks && Object.values(artist.socialLinks as Record<string, string>).some(Boolean) && (
                  <div className="flex flex-wrap items-center gap-2 mt-3" data-testid="social-links">
                    {Object.entries(artist.socialLinks as Record<string, string>).map(([key, url]) => {
                      if (!url) return null;
                      const platform = socialPlatforms[key];
                      if (!platform) return null;
                      const Icon = platform.icon;
                      return (
                        <a
                          key={key}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid={`link-social-${key}`}
                        >
                          <Button variant="outline" size="icon">
                            <Icon className="h-4 w-4" />
                          </Button>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>

              <Link href="/artists">
                <Button variant="outline" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="gallery" data-testid="tab-profile-gallery">
              <Box className="h-4 w-4 mr-2" />
              Gallery ({galleryArtworks.length})
            </TabsTrigger>
            <TabsTrigger value="portfolio" data-testid="tab-profile-portfolio">
              <ImageIcon className="h-4 w-4 mr-2" />
              Portfolio ({publishedArtworks.length})
            </TabsTrigger>
            <TabsTrigger value="blog" data-testid="tab-profile-blog">
              <FileText className="h-4 w-4 mr-2" />
              Blog ({publishedPosts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="space-y-4">
            {galleryLoading ? (
              <Skeleton className="h-[500px] rounded-md" />
            ) : galleryArtworks.length > 0 && galleryLayout ? (
              <div data-testid="artist-gallery-3d">
                <MazeGallery3D
                  artworks={galleryArtworks}
                  layout={galleryLayout}
                  galleryTemplate={artist.galleryTemplate || "contemporary"}
                  artist={artist}
                  onExitGallery={() => setActiveTab("portfolio")}
                  isImmersive={isImmersive}
                  onRequestImmersive={toggleImmersive}
                />
              </div>
            ) : (
              <div className="text-center py-16">
                <Box className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No exhibition artworks</h3>
                <p className="text-muted-foreground">
                  This artist hasn't set up their personal gallery exhibition yet.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-4">
            {artworksLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-4/3 rounded-md" />
                ))}
              </div>
            ) : publishedArtworks.length > 0 ? (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {publishedArtworks.map((artwork) => (
                    <Card 
                      key={artwork.id} 
                      className="group cursor-pointer hover-elevate"
                      onClick={() => setSelectedArtwork(artwork)}
                      data-testid={`card-profile-artwork-${artwork.id}`}
                    >
                      <div className="aspect-4/3 relative overflow-visible">
                        <ResponsiveArtworkImage
                          src={artwork.imageUrl}
                          alt={artwork.title}
                          sizes={ARTWORK_SIZES.card}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                          pictureClassName="block w-full h-full"
                        />
                        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                          {!artwork.isForSale && (
                            <Badge variant="secondary">Sold</Badge>
                          )}
                          {artwork.isReadyForExhibition && (
                            <Badge variant="default">In Gallery</Badge>
                          )}
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <Link
                          href={`/artworks/${artwork.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-primary transition-colors"
                        >
                          <h3 className="font-semibold">{artwork.title}</h3>
                        </Link>
                        <div className="flex items-center justify-between mt-2">
                          {artwork.isForSale && (
                            <span className="text-lg font-bold text-primary">{formatPrice(artwork.price)}</span>
                          )}
                          {artwork.year && (
                            <span className="text-sm text-muted-foreground">{artwork.year}</span>
                          )}
                        </div>
                        {artwork.medium && (
                          <p className="text-sm text-muted-foreground mt-1">{artwork.medium}</p>
                        )}
                        {artwork.dimensions && (
                          <p className="text-sm text-muted-foreground">{artwork.dimensions}{!/cm/i.test(artwork.dimensions) ? ' cm' : ''}</p>
                        )}
                        {artwork.isForSale && (
                          <Button 
                            className="w-full mt-4" 
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); addItem(artwork); }}
                            data-testid={`button-add-to-cart-${artwork.id}`}
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Add to Cart
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <ArtworkDetailDialog
                  artwork={selectedArtwork}
                  open={!!selectedArtwork}
                  onOpenChange={(open) => !open && setSelectedArtwork(null)}
                />
              </>
            ) : (
              <div className="text-center py-16">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No artworks available</h3>
                <p className="text-muted-foreground">
                  This artist hasn't added any artworks yet.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="blog" className="space-y-6">
            {blogLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-40" />
                ))}
              </div>
            ) : publishedPosts.length > 0 ? (
              <div className="space-y-6">
                {publishedPosts.map((post) => (
                  <Card 
                    key={post.id} 
                    className="overflow-hidden"
                    data-testid={`card-profile-blog-${post.id}`}
                  >
                    {post.coverImageUrl && (
                      <div className="aspect-3/1 overflow-hidden">
                        <img
                          src={post.coverImageUrl}
                          alt={post.title}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Calendar className="h-4 w-4" />
                        {formatDate(post.createdAt)}
                      </div>
                      <CardTitle className="font-serif text-2xl">{post.title}</CardTitle>
                      {post.excerpt && (
                        <CardDescription className="text-base">
                          {post.excerpt}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p className="whitespace-pre-wrap">{post.content}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No blog posts yet</h3>
                <p className="text-muted-foreground">
                  This artist hasn't published any blog posts.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
