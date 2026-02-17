import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Plus, 
  Image as ImageIcon, 
  FileText, 
  Edit, 
  Trash2, 
  Eye,
  EyeOff,
  Save,
  Palette,
  X,
  LogIn,
  Link as LinkIcon,
  User
} from "lucide-react";
import type { Artist, ArtworkWithArtist, BlogPost, InsertArtwork, InsertBlogPost } from "@shared/schema";

export default function ArtistDashboard() {
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [artworkDialogOpen, setArtworkDialogOpen] = useState(false);
  const [blogDialogOpen, setBlogDialogOpen] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<ArtworkWithArtist | null>(null);
  const [editingBlogPost, setEditingBlogPost] = useState<BlogPost | null>(null);
  const [linkingArtist, setLinkingArtist] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: "",
    avatarUrl: "",
    bio: "",
    country: "",
    specialization: "",
  });
  const [profileEditing, setProfileEditing] = useState(false);

  const [artworkForm, setArtworkForm] = useState({
    title: "",
    description: "",
    imageUrl: "",
    price: "",
    medium: "",
    dimensions: "",
    year: new Date().getFullYear().toString(),
    category: "painting",
    isForSale: true,
    isReadyForExhibition: false,
    exhibitionOrder: "",
  });

  const [blogForm, setBlogForm] = useState({
    title: "",
    content: "",
    excerpt: "",
    coverImageUrl: "",
    isPublished: false,
  });

  // Get logged-in artist's profile
  const { data: myArtist, isLoading: myArtistLoading, error: myArtistError } = useQuery<Artist>({
    queryKey: ["/api/artists/me"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Get all artists for linking (when no artist is linked yet)
  const { data: artists, isLoading: artistsLoading } = useQuery<Artist[]>({
    queryKey: ["/api/artists"],
    enabled: isAuthenticated && !myArtist && !myArtistLoading,
  });

  const selectedArtist = myArtist;
  const selectedArtistId = myArtist?.id;

  const { data: artworks, isLoading: artworksLoading } = useQuery<ArtworkWithArtist[]>({
    queryKey: ["/api/artists", selectedArtistId, "artworks"],
    enabled: !!selectedArtistId,
  });

  const { data: blogPosts, isLoading: blogLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/artists", selectedArtistId, "blog"],
    enabled: !!selectedArtistId,
  });

  useEffect(() => {
    if (myArtist && !profileEditing) {
      setProfileForm({
        name: myArtist.name || "",
        avatarUrl: myArtist.avatarUrl || "",
        bio: myArtist.bio || "",
        country: myArtist.country || "",
        specialization: myArtist.specialization || "",
      });
    }
  }, [myArtist, profileEditing]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; avatarUrl: string; bio: string; country: string; specialization: string }) => {
      return apiRequest("PATCH", `/api/artists/${selectedArtistId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artists/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artists", selectedArtistId] });
      setProfileEditing(false);
      toast({ title: "Profile updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update profile", variant: "destructive" });
    },
  });

  // Link artist to user account
  const linkArtistMutation = useMutation({
    mutationFn: async (artistId: string) => {
      return apiRequest("POST", `/api/artists/link/${artistId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artists/me"] });
      setLinkingArtist(false);
      toast({ title: "Artist profile linked successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to link artist profile", variant: "destructive" });
    },
  });

  const createArtworkMutation = useMutation({
    mutationFn: async (data: InsertArtwork) => {
      return apiRequest("POST", "/api/artworks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artists", selectedArtistId, "artworks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artists", selectedArtistId, "gallery"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artworks"] });
      setArtworkDialogOpen(false);
      resetArtworkForm();
      toast({ title: "Artwork created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create artwork", variant: "destructive" });
    },
  });

  const updateArtworkMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertArtwork> }) => {
      return apiRequest("PATCH", `/api/artworks/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artists", selectedArtistId, "artworks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artists", selectedArtistId, "gallery"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artworks"] });
      setArtworkDialogOpen(false);
      setEditingArtwork(null);
      resetArtworkForm();
      toast({ title: "Artwork updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update artwork", variant: "destructive" });
    },
  });

  const deleteArtworkMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/artworks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artists", selectedArtistId, "artworks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artists", selectedArtistId, "gallery"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artworks"] });
      toast({ title: "Artwork deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete artwork", variant: "destructive" });
    },
  });

  const createBlogPostMutation = useMutation({
    mutationFn: async (data: InsertBlogPost) => {
      return apiRequest("POST", "/api/blog", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artists", selectedArtistId, "blog"] });
      setBlogDialogOpen(false);
      resetBlogForm();
      toast({ title: "Blog post created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create blog post", variant: "destructive" });
    },
  });

  const updateBlogPostMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertBlogPost> }) => {
      return apiRequest("PATCH", `/api/blog/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artists", selectedArtistId, "blog"] });
      setBlogDialogOpen(false);
      setEditingBlogPost(null);
      resetBlogForm();
      toast({ title: "Blog post updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update blog post", variant: "destructive" });
    },
  });

  const deleteBlogPostMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/blog/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artists", selectedArtistId, "blog"] });
      toast({ title: "Blog post deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete blog post", variant: "destructive" });
    },
  });

  const resetArtworkForm = () => {
    setArtworkForm({
      title: "",
      description: "",
      imageUrl: "",
      price: "",
      medium: "",
      dimensions: "",
      year: new Date().getFullYear().toString(),
      category: "painting",
      isForSale: true,
      isReadyForExhibition: false,
      exhibitionOrder: "",
    });
  };

  const resetBlogForm = () => {
    setBlogForm({
      title: "",
      content: "",
      excerpt: "",
      coverImageUrl: "",
      isPublished: false,
    });
  };

  const handleArtworkSubmit = () => {
    if (!selectedArtistId) return;
    
    const data: InsertArtwork = {
      artistId: selectedArtistId,
      title: artworkForm.title,
      description: artworkForm.description || "",
      imageUrl: artworkForm.imageUrl,
      price: artworkForm.price,
      medium: artworkForm.medium || "",
      dimensions: artworkForm.dimensions || null,
      year: artworkForm.year ? parseInt(artworkForm.year) : null,
      category: artworkForm.category || "painting",
      isForSale: artworkForm.isForSale,
      isReadyForExhibition: artworkForm.isReadyForExhibition,
      exhibitionOrder: artworkForm.exhibitionOrder ? parseInt(artworkForm.exhibitionOrder) : null,
    };

    if (editingArtwork) {
      updateArtworkMutation.mutate({ id: editingArtwork.id, data });
    } else {
      createArtworkMutation.mutate(data);
    }
  };

  const handleBlogSubmit = () => {
    if (!selectedArtistId) return;

    const data: InsertBlogPost = {
      artistId: selectedArtistId,
      title: blogForm.title,
      content: blogForm.content,
      excerpt: blogForm.excerpt || null,
      coverImageUrl: blogForm.coverImageUrl || null,
      isPublished: blogForm.isPublished,
    };

    if (editingBlogPost) {
      updateBlogPostMutation.mutate({ id: editingBlogPost.id, data });
    } else {
      createBlogPostMutation.mutate(data);
    }
  };

  const openEditArtwork = (artwork: ArtworkWithArtist) => {
    setEditingArtwork(artwork);
    setArtworkForm({
      title: artwork.title,
      description: artwork.description || "",
      imageUrl: artwork.imageUrl,
      price: artwork.price,
      medium: artwork.medium || "",
      dimensions: artwork.dimensions || "",
      year: artwork.year?.toString() || "",
      category: artwork.category || "painting",
      isForSale: artwork.isForSale ?? true,
      isReadyForExhibition: artwork.isReadyForExhibition ?? false,
      exhibitionOrder: artwork.exhibitionOrder?.toString() || "",
    });
    setArtworkDialogOpen(true);
  };

  const openEditBlogPost = (post: BlogPost) => {
    setEditingBlogPost(post);
    setBlogForm({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt || "",
      coverImageUrl: post.coverImageUrl || "",
      isPublished: post.isPublished ?? false,
    });
    setBlogDialogOpen(true);
  };

  // Loading state
  if (authLoading || myArtistLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  // Not logged in
  if (!isAuthenticated) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Palette className="h-16 w-16 text-muted-foreground mb-6" />
        <h1 className="font-serif text-3xl font-bold mb-2">Artist Dashboard</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          Log in to manage your artworks and blog posts. Use your Google, GitHub, or email account.
        </p>
        <Button asChild size="lg" data-testid="button-login">
          <a href="/api/login">
            <LogIn className="h-4 w-4 mr-2" />
            Log In to Continue
          </a>
        </Button>
      </div>
    );
  }

  // Logged in but no artist profile linked
  if (!myArtist && !myArtistLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-1">
          <h1 className="font-serif text-3xl font-bold">Welcome, {user?.firstName || 'Artist'}!</h1>
          <p className="text-muted-foreground">
            Link your account to an artist profile to start managing your portfolio
          </p>
        </div>

        {artistsLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : artists?.filter(a => !a.userId).length === 0 ? (
          <Card className="p-8 text-center">
            <Palette className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Available Artist Profiles</h3>
            <p className="text-muted-foreground text-sm mb-4">
              All artist profiles are already linked to accounts. Contact the gallery to create a new artist profile.
            </p>
            <Button variant="outline" asChild>
              <a href="/api/logout">Log Out</a>
            </Button>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {artists?.filter(a => !a.userId).map((artist) => (
              <Card 
                key={artist.id} 
                className={`hover-elevate cursor-pointer ${linkArtistMutation.isPending ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => linkArtistMutation.mutate(artist.id)}
                data-testid={`card-link-artist-${artist.id}`}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={artist.avatarUrl || undefined} />
                    <AvatarFallback className="font-serif">
                      {artist.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{artist.name}</h3>
                    {artist.specialization && (
                      <p className="text-sm text-muted-foreground truncate">{artist.specialization}</p>
                    )}
                  </div>
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={selectedArtist?.avatarUrl || undefined} />
            <AvatarFallback className="font-serif">
              {selectedArtist?.name.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-serif text-2xl font-bold">{selectedArtist?.name}</h1>
            <p className="text-sm text-muted-foreground">Your Artist Dashboard</p>
          </div>
        </div>
        <Button variant="outline" asChild data-testid="button-logout">
          <a href="/api/logout">Log Out</a>
        </Button>
      </div>

      <Tabs defaultValue="artworks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="artworks" data-testid="tab-artworks">
            <ImageIcon className="h-4 w-4 mr-2" />
            Artworks
          </TabsTrigger>
          <TabsTrigger value="blog" data-testid="tab-blog">
            <FileText className="h-4 w-4 mr-2" />
            Blog Posts
          </TabsTrigger>
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="artworks" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-semibold text-lg">My Artworks</h2>
            <Dialog open={artworkDialogOpen} onOpenChange={(open) => {
              setArtworkDialogOpen(open);
              if (!open) {
                setEditingArtwork(null);
                resetArtworkForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-artwork">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Artwork
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingArtwork ? "Edit Artwork" : "Add New Artwork"}</DialogTitle>
                  <DialogDescription>
                    {editingArtwork ? "Update your artwork details" : "Add a new piece to your portfolio"}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={artworkForm.title}
                      onChange={(e) => setArtworkForm({ ...artworkForm, title: e.target.value })}
                      placeholder="Artwork title"
                      data-testid="input-artwork-title"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="imageUrl">Image URL *</Label>
                    <Input
                      id="imageUrl"
                      value={artworkForm.imageUrl}
                      onChange={(e) => setArtworkForm({ ...artworkForm, imageUrl: e.target.value })}
                      placeholder="https://..."
                      data-testid="input-artwork-image"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="price">Price *</Label>
                      <Input
                        id="price"
                        value={artworkForm.price}
                        onChange={(e) => setArtworkForm({ ...artworkForm, price: e.target.value })}
                        placeholder="$1,000"
                        data-testid="input-artwork-price"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="year">Year</Label>
                      <Input
                        id="year"
                        value={artworkForm.year}
                        onChange={(e) => setArtworkForm({ ...artworkForm, year: e.target.value })}
                        placeholder="2024"
                        data-testid="input-artwork-year"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="medium">Medium</Label>
                      <Input
                        id="medium"
                        value={artworkForm.medium}
                        onChange={(e) => setArtworkForm({ ...artworkForm, medium: e.target.value })}
                        placeholder="Oil on canvas"
                        data-testid="input-artwork-medium"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="dimensions">Dimensions</Label>
                      <Input
                        id="dimensions"
                        value={artworkForm.dimensions}
                        onChange={(e) => setArtworkForm({ ...artworkForm, dimensions: e.target.value })}
                        placeholder="24 x 36 inches"
                        data-testid="input-artwork-dimensions"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={artworkForm.description}
                      onChange={(e) => setArtworkForm({ ...artworkForm, description: e.target.value })}
                      placeholder="Describe your artwork..."
                      rows={3}
                      data-testid="input-artwork-description"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="isForSale"
                      checked={artworkForm.isForSale}
                      onCheckedChange={(checked) => setArtworkForm({ ...artworkForm, isForSale: checked })}
                      data-testid="switch-artwork-for-sale"
                    />
                    <Label htmlFor="isForSale">Available for sale</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="isReadyForExhibition"
                      checked={artworkForm.isReadyForExhibition}
                      onCheckedChange={(checked) => setArtworkForm({ ...artworkForm, isReadyForExhibition: checked })}
                      data-testid="switch-artwork-exhibition"
                    />
                    <Label htmlFor="isReadyForExhibition">Ready for exhibition</Label>
                  </div>
                  {artworkForm.isReadyForExhibition && (
                    <div className="space-y-1.5">
                      <Label htmlFor="exhibitionOrder">Exhibition order</Label>
                      <Input
                        id="exhibitionOrder"
                        type="number"
                        min="1"
                        value={artworkForm.exhibitionOrder}
                        onChange={(e) => setArtworkForm({ ...artworkForm, exhibitionOrder: e.target.value })}
                        placeholder="Display order in gallery (1, 2, 3...)"
                        data-testid="input-artwork-exhibition-order"
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleArtworkSubmit}
                    disabled={!artworkForm.title || !artworkForm.imageUrl || !artworkForm.price || createArtworkMutation.isPending || updateArtworkMutation.isPending}
                    data-testid="button-save-artwork"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingArtwork ? "Update" : "Create"} Artwork
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {artworksLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3] rounded-md" />
              ))}
            </div>
          ) : artworks && artworks.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {artworks.map((artwork) => (
                <Card key={artwork.id} className="overflow-hidden" data-testid={`card-artwork-${artwork.id}`}>
                  <div className="aspect-[4/3] relative">
                    <img 
                      src={artwork.imageUrl} 
                      alt={artwork.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                      {!artwork.isForSale && (
                        <Badge variant="secondary">Not for sale</Badge>
                      )}
                      {artwork.isReadyForExhibition && (
                        <Badge variant="default">
                          In Gallery{artwork.exhibitionOrder ? ` #${artwork.exhibitionOrder}` : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold truncate">{artwork.title}</h3>
                    <p className="text-sm text-muted-foreground">{artwork.price}</p>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openEditArtwork(artwork)}
                      data-testid={`button-edit-artwork-${artwork.id}`}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteArtworkMutation.mutate(artwork.id)}
                      disabled={deleteArtworkMutation.isPending}
                      data-testid={`button-delete-artwork-${artwork.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No artworks yet</h3>
              <p className="text-muted-foreground mb-4">Start adding your artworks to showcase your portfolio</p>
              <Button onClick={() => setArtworkDialogOpen(true)} data-testid="button-add-first-artwork">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Artwork
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="blog" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-semibold text-lg">My Blog Posts</h2>
            <Dialog open={blogDialogOpen} onOpenChange={(open) => {
              setBlogDialogOpen(open);
              if (!open) {
                setEditingBlogPost(null);
                resetBlogForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-blog">
                  <Plus className="h-4 w-4 mr-2" />
                  New Post
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>{editingBlogPost ? "Edit Blog Post" : "Create New Blog Post"}</DialogTitle>
                  <DialogDescription>
                    Share your thoughts, inspirations, and artistic journey
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="blogTitle">Title *</Label>
                    <Input
                      id="blogTitle"
                      value={blogForm.title}
                      onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                      placeholder="Post title"
                      data-testid="input-blog-title"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="blogExcerpt">Excerpt</Label>
                    <Input
                      id="blogExcerpt"
                      value={blogForm.excerpt}
                      onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                      placeholder="Brief summary of your post"
                      data-testid="input-blog-excerpt"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="blogCover">Cover Image URL</Label>
                    <Input
                      id="blogCover"
                      value={blogForm.coverImageUrl}
                      onChange={(e) => setBlogForm({ ...blogForm, coverImageUrl: e.target.value })}
                      placeholder="https://..."
                      data-testid="input-blog-cover"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="blogContent">Content *</Label>
                    <Textarea
                      id="blogContent"
                      value={blogForm.content}
                      onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                      placeholder="Write your blog post..."
                      rows={8}
                      data-testid="input-blog-content"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="isPublished"
                      checked={blogForm.isPublished}
                      onCheckedChange={(checked) => setBlogForm({ ...blogForm, isPublished: checked })}
                      data-testid="switch-blog-published"
                    />
                    <Label htmlFor="isPublished">Publish immediately</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleBlogSubmit}
                    disabled={!blogForm.title || !blogForm.content || createBlogPostMutation.isPending || updateBlogPostMutation.isPending}
                    data-testid="button-save-blog"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingBlogPost ? "Update" : "Create"} Post
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {blogLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : blogPosts && blogPosts.length > 0 ? (
            <div className="space-y-4">
              {blogPosts.map((post) => (
                <Card key={post.id} data-testid={`card-blog-${post.id}`}>
                  <CardHeader className="flex-row items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="truncate">{post.title}</CardTitle>
                        <Badge variant={post.isPublished ? "default" : "secondary"}>
                          {post.isPublished ? (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              Published
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" />
                              Draft
                            </>
                          )}
                        </Badge>
                      </div>
                      <CardDescription>
                        {post.excerpt || post.content.substring(0, 150) + "..."}
                      </CardDescription>
                    </div>
                    {post.coverImageUrl && (
                      <img 
                        src={post.coverImageUrl} 
                        alt={post.title}
                        className="w-24 h-16 object-cover rounded-md"
                      />
                    )}
                  </CardHeader>
                  <CardFooter className="gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openEditBlogPost(post)}
                      data-testid={`button-edit-blog-${post.id}`}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteBlogPostMutation.mutate(post.id)}
                      disabled={deleteBlogPostMutation.isPending}
                      data-testid={`button-delete-blog-${post.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No blog posts yet</h3>
              <p className="text-muted-foreground mb-4">Share your artistic journey with your audience</p>
              <Button onClick={() => setBlogDialogOpen(true)} data-testid="button-add-first-blog">
                <Plus className="h-4 w-4 mr-2" />
                Write Your First Post
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-semibold text-lg">My Profile</h2>
            {!profileEditing ? (
              <Button onClick={() => setProfileEditing(true)} data-testid="button-edit-profile">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setProfileEditing(false);
                    if (myArtist) {
                      setProfileForm({
                        name: myArtist.name || "",
                        avatarUrl: myArtist.avatarUrl || "",
                        bio: myArtist.bio || "",
                        country: myArtist.country || "",
                        specialization: myArtist.specialization || "",
                      });
                    }
                  }}
                  data-testid="button-cancel-profile"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updateProfileMutation.mutate(profileForm)}
                  disabled={updateProfileMutation.isPending || !profileForm.name.trim()}
                  data-testid="button-save-profile"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </div>

          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-start gap-6">
                <div className="flex flex-col items-center gap-2">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profileForm.avatarUrl || undefined} />
                    <AvatarFallback className="font-serif text-2xl">
                      {profileForm.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  {profileEditing && (
                    <span className="text-xs text-muted-foreground">Update URL below</span>
                  )}
                </div>
                {!profileEditing ? (
                  <div className="flex-1 space-y-2">
                    <h3 className="font-serif text-xl font-bold" data-testid="text-profile-name">{profileForm.name}</h3>
                    {profileForm.specialization && (
                      <Badge variant="secondary" data-testid="text-profile-specialization">{profileForm.specialization}</Badge>
                    )}
                    {profileForm.country && (
                      <p className="text-sm text-muted-foreground" data-testid="text-profile-country">{profileForm.country}</p>
                    )}
                    {profileForm.bio ? (
                      <p className="text-sm leading-relaxed" data-testid="text-profile-bio">{profileForm.bio}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No bio added yet</p>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="profile-name">Name *</Label>
                      <Input
                        id="profile-name"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        placeholder="Your name"
                        data-testid="input-profile-name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="profile-avatar">Profile Picture URL</Label>
                      <Input
                        id="profile-avatar"
                        value={profileForm.avatarUrl}
                        onChange={(e) => setProfileForm({ ...profileForm, avatarUrl: e.target.value })}
                        placeholder="https://..."
                        data-testid="input-profile-avatar"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="profile-specialization">Specialization</Label>
                        <Input
                          id="profile-specialization"
                          value={profileForm.specialization}
                          onChange={(e) => setProfileForm({ ...profileForm, specialization: e.target.value })}
                          placeholder="e.g. Oil Painting"
                          data-testid="input-profile-specialization"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="profile-country">Country</Label>
                        <Input
                          id="profile-country"
                          value={profileForm.country}
                          onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                          placeholder="e.g. Japan"
                          data-testid="input-profile-country"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="profile-bio">Bio / Description</Label>
                      <Textarea
                        id="profile-bio"
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        placeholder="Tell visitors about yourself, your art, and your journey..."
                        className="min-h-[120px]"
                        data-testid="input-profile-bio"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
