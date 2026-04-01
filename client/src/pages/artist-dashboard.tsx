import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";
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
  User,
  Globe,
  Loader2
} from "lucide-react";
import { SiInstagram, SiX, SiFacebook, SiYoutube, SiTiktok, SiBehance, SiDribbble, SiDeviantart, SiPinterest } from "react-icons/si";
import { FaLinkedin } from "react-icons/fa6";
import type { Artist, ArtworkWithArtist, BlogPost, InsertArtwork, InsertBlogPost, OrderWithArtwork } from "@shared/schema";
import { ORDER_STATUSES, ORDER_TRANSITIONS } from "@shared/schema";
import { ShoppingBag, Package, Mail, Search, Filter, ChevronRight, Ban, ArrowRight } from "lucide-react";

function FileUploadField({
  id,
  label,
  uploading,
  imageUrl,
  previewAlt,
  onFileSelect,
  testId,
}: {
  id: string;
  label: string;
  uploading: boolean;
  imageUrl: string;
  previewAlt: string;
  onFileSelect: (file: File) => void;
  testId?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
          }}
          data-testid={testId}
        />
        {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={previewAlt}
          loading="lazy"
          className="mt-2 rounded-md max-h-40 object-contain border"
        />
      )}
    </div>
  );
}

const socialPlatformsList = [
  { key: "website", label: "Website", icon: Globe, placeholder: "https://yourwebsite.com" },
  { key: "instagram", label: "Instagram", icon: SiInstagram, placeholder: "https://instagram.com/username" },
  { key: "x", label: "X (Twitter)", icon: SiX, placeholder: "https://x.com/username" },
  { key: "facebook", label: "Facebook", icon: SiFacebook, placeholder: "https://facebook.com/username" },
  { key: "youtube", label: "YouTube", icon: SiYoutube, placeholder: "https://youtube.com/@channel" },
  { key: "tiktok", label: "TikTok", icon: SiTiktok, placeholder: "https://tiktok.com/@username" },
  { key: "linkedin", label: "LinkedIn", icon: FaLinkedin, placeholder: "https://linkedin.com/in/username" },
  { key: "behance", label: "Behance", icon: SiBehance, placeholder: "https://behance.net/username" },
  { key: "dribbble", label: "Dribbble", icon: SiDribbble, placeholder: "https://dribbble.com/username" },
  { key: "deviantart", label: "DeviantArt", icon: SiDeviantart, placeholder: "https://deviantart.com/username" },
  { key: "pinterest", label: "Pinterest", icon: SiPinterest, placeholder: "https://pinterest.com/username" },
];

export default function ArtistDashboard() {
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [artworkDialogOpen, setArtworkDialogOpen] = useState(false);
  const [blogDialogOpen, setBlogDialogOpen] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<ArtworkWithArtist | null>(null);
  const [editingBlogPost, setEditingBlogPost] = useState<BlogPost | null>(null);

  const [profileForm, setProfileForm] = useState({
    name: "",
    avatarUrl: "",
    bio: "",
    country: "",
    specialization: "",
    email: "",
    galleryTemplate: "contemporary",
    socialLinks: {} as Record<string, string>,
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

  const [artworkUploading, setArtworkUploading] = useState(false);
  const [blogCoverUploading, setBlogCoverUploading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleImageUpload = async (
    file: File,
    endpoint: string,
    onSuccess: (imageUrl: string) => void,
    setUploading: (v: boolean) => void,
  ) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json();
      onSuccess(data.imageUrl);
      toast({ title: "Image uploaded successfully" });
    } catch (error: any) {
      toast({ title: error.message || "Failed to upload image", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // Get logged-in artist's profile
  const { data: myArtist, isLoading: myArtistLoading, error: myArtistError } = useQuery<Artist>({
    queryKey: ["/api/artists/me"],
    enabled: isAuthenticated,
    retry: false,
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

  const { data: artistOrders, isLoading: ordersLoading } = useQuery<OrderWithArtwork[]>({
    queryKey: ["/api/artists", selectedArtistId, "orders"],
    enabled: !!selectedArtistId,
  });

  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderBuyerSearch, setOrderBuyerSearch] = useState("");

  const filteredOrders = (artistOrders || []).filter((order) => {
    const matchesStatus = orderStatusFilter === "all" || order.status === orderStatusFilter;
    const matchesBuyer = !orderBuyerSearch || 
      order.buyerName.toLowerCase().includes(orderBuyerSearch.toLowerCase()) ||
      order.buyerEmail.toLowerCase().includes(orderBuyerSearch.toLowerCase());
    return matchesStatus && matchesBuyer;
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artists", selectedArtistId, "orders"] });
      toast({ title: "Order status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (myArtist && !profileEditing) {
      setProfileForm({
        name: myArtist.name || "",
        avatarUrl: myArtist.avatarUrl || "",
        bio: myArtist.bio || "",
        country: myArtist.country || "",
        specialization: myArtist.specialization || "",
        email: myArtist.email || "",
        galleryTemplate: myArtist.galleryTemplate || "contemporary",
        socialLinks: (myArtist.socialLinks as Record<string, string>) || {},
      });
    }
  }, [myArtist, profileEditing]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; avatarUrl: string; bio: string; country: string; specialization: string; email: string; galleryTemplate: string; socialLinks: Record<string, string> }) => {
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
          Log in to manage your artworks and blog posts. Use your Google or email account.
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

  // Loading artist profile (auto-creates if needed)
  if (!myArtist && !myArtistLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-4">
          <Palette className="h-12 w-12 text-primary mx-auto animate-pulse" />
          <h2 className="font-serif text-xl font-semibold">Setting up your artist profile...</h2>
          <p className="text-muted-foreground text-sm">This will only take a moment</p>
        </div>
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
          <TabsTrigger value="orders" data-testid="tab-orders">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Orders
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
                  <FileUploadField
                    id="imageUpload"
                    label="Image *"
                    uploading={artworkUploading}
                    imageUrl={artworkForm.imageUrl}
                    previewAlt="Preview"
                    testId="input-artwork-image"
                    onFileSelect={(file) =>
                      handleImageUpload(
                        file,
                        "/api/upload/artwork",
                        (url) => setArtworkForm(prev => ({ ...prev, imageUrl: url })),
                        setArtworkUploading,
                      )
                    }
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="price">Price *</Label>
                      <Input
                        id="price"
                        value={artworkForm.price}
                        onChange={(e) => setArtworkForm({ ...artworkForm, price: e.target.value })}
                        placeholder="1000"
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
                      <Label htmlFor="dimensions">Dimensions (cm)</Label>
                      <Input
                        id="dimensions"
                        value={artworkForm.dimensions}
                        onChange={(e) => setArtworkForm({ ...artworkForm, dimensions: e.target.value })}
                        placeholder="60 x 80"
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
                    disabled={!artworkForm.title || !artworkForm.imageUrl || !artworkForm.price || artworkUploading || createArtworkMutation.isPending || updateArtworkMutation.isPending}
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
                <Skeleton key={i} className="aspect-4/3 rounded-md" />
              ))}
            </div>
          ) : artworks && artworks.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {artworks.map((artwork) => (
                <Card key={artwork.id} className="overflow-hidden" data-testid={`card-artwork-${artwork.id}`}>
                  <div className="aspect-4/3 relative">
                    <img
                      src={artwork.imageUrl}
                      alt={artwork.title}
                      loading="lazy"
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
                    {artwork.isForSale && (
                      <p className="text-sm text-muted-foreground">{formatPrice(artwork.price)}</p>
                    )}
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
                  <FileUploadField
                    id="blogCoverUpload"
                    label="Cover Image"
                    uploading={blogCoverUploading}
                    imageUrl={blogForm.coverImageUrl}
                    previewAlt="Cover preview"
                    testId="input-blog-cover"
                    onFileSelect={(file) =>
                      handleImageUpload(
                        file,
                        "/api/upload/blog-cover",
                        (url) => setBlogForm(prev => ({ ...prev, coverImageUrl: url })),
                        setBlogCoverUploading,
                      )
                    }
                  />
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
                    disabled={!blogForm.title || !blogForm.content || blogCoverUploading || createBlogPostMutation.isPending || updateBlogPostMutation.isPending}
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
                        loading="lazy"
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

        <TabsContent value="orders" className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="font-semibold text-lg">Order Register</h2>
            <Badge variant="secondary" data-testid="text-order-count">
              {filteredOrders.length} of {artistOrders?.length || 0} orders
            </Badge>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by buyer name or email..."
                value={orderBuyerSearch}
                onChange={(e) => setOrderBuyerSearch(e.target.value)}
                className="pl-9"
                data-testid="input-order-search"
              />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <Button
                variant={orderStatusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setOrderStatusFilter("all")}
                data-testid="button-filter-all"
              >
                All
              </Button>
              {ORDER_STATUSES.map((s) => (
                <Button
                  key={s}
                  variant={orderStatusFilter === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOrderStatusFilter(s)}
                  className="capitalize"
                  data-testid={`button-filter-${s}`}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

          {ordersLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const transitions = ORDER_TRANSITIONS[order.status] || [];
                const nextStep = transitions.find((t) => t !== "canceled");
                const canCancel = transitions.includes("canceled");

                return (
                  <Card key={order.id} data-testid={`card-order-${order.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-md overflow-hidden shrink-0">
                          <img
                            src={order.artwork.imageUrl}
                            alt={order.artwork.title}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                              <h3 className="font-serif font-semibold" data-testid={`text-order-artwork-${order.id}`}>{order.artwork.title}</h3>
                              <p className="text-sm text-muted-foreground">{order.artwork.medium}</p>
                            </div>
                            <div className="text-right space-y-1">
                              <p className="font-bold text-primary" data-testid={`text-order-price-${order.id}`}>
                                ${parseFloat(order.totalAmount).toLocaleString()}
                              </p>
                              <Badge
                                variant={
                                  order.status === "closed" ? "default" :
                                  order.status === "canceled" ? "destructive" :
                                  order.status === "pending" ? "secondary" : "outline"
                                }
                                className="capitalize"
                                data-testid={`badge-order-status-${order.id}`}
                              >
                                {order.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                            <span data-testid={`text-order-buyer-${order.id}`}>
                              <User className="h-3 w-3 inline mr-1" />
                              {order.buyerName}
                            </span>
                            <span data-testid={`text-order-email-${order.id}`}>
                              <Mail className="h-3 w-3 inline mr-1" />
                              {order.buyerEmail}
                            </span>
                            <span>
                              <Package className="h-3 w-3 inline mr-1" />
                              {order.shippingAddress}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 flex-wrap pt-1">
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            {transitions.length > 0 && (
                              <div className="flex items-center gap-2 flex-wrap">
                                {nextStep && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: nextStep })}
                                    disabled={updateOrderStatusMutation.isPending}
                                    data-testid={`button-order-next-${order.id}`}
                                  >
                                    <ArrowRight className="h-3 w-3 mr-1" />
                                    <span className="capitalize">{nextStep}</span>
                                  </Button>
                                )}
                                {canCancel && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: "canceled" })}
                                    disabled={updateOrderStatusMutation.isPending}
                                    data-testid={`button-order-cancel-${order.id}`}
                                  >
                                    <Ban className="h-3 w-3 mr-1" />
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : artistOrders && artistOrders.length > 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-serif text-lg font-semibold mb-1">No matching orders</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters to see more orders.
                </p>
                <Button variant="outline" className="mt-4" onClick={() => { setOrderStatusFilter("all"); setOrderBuyerSearch(""); }} data-testid="button-clear-filters">
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-serif text-lg font-semibold mb-1">No orders yet</h3>
                <p className="text-sm text-muted-foreground">
                  When someone purchases your artwork, the order details will appear here.
                </p>
              </CardContent>
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
                        email: myArtist.email || "",
                        galleryTemplate: myArtist.galleryTemplate || "contemporary",
                        socialLinks: (myArtist.socialLinks as Record<string, string>) || {},
                      });
                    }
                  }}
                  data-testid="button-cancel-profile"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const cleanedLinks = Object.fromEntries(
                      Object.entries(profileForm.socialLinks).filter(([, v]) => v.trim())
                    );
                    updateProfileMutation.mutate({ ...profileForm, socialLinks: cleanedLinks });
                  }}
                  disabled={updateProfileMutation.isPending || avatarUploading || !profileForm.name.trim()}
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
                    <FileUploadField
                      id="profile-avatar"
                      label=""
                      uploading={avatarUploading}
                      imageUrl=""
                      previewAlt="Profile picture"
                      onFileSelect={(file) =>
                        handleImageUpload(
                          file,
                          "/api/upload/avatar",
                          (imageUrl) => setProfileForm(prev => ({ ...prev, avatarUrl: imageUrl })),
                          setAvatarUploading,
                        )
                      }
                      testId="input-profile-avatar"
                    />
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
                    {profileForm.email && (
                      <p className="text-sm text-muted-foreground" data-testid="text-profile-email">
                        <Mail className="h-3 w-3 inline mr-1" />
                        {profileForm.email}
                      </p>
                    )}
                    {profileForm.bio ? (
                      <p className="text-sm leading-relaxed" data-testid="text-profile-bio">{profileForm.bio}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No bio added yet</p>
                    )}
                    {Object.values(profileForm.socialLinks).some(v => v) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {socialPlatformsList.map((platform) => {
                          const url = profileForm.socialLinks[platform.key];
                          if (!url) return null;
                          const Icon = platform.icon;
                          return (
                            <a key={platform.key} href={url} target="_blank" rel="noopener noreferrer" data-testid={`link-dashboard-social-${platform.key}`}>
                              <Button variant="outline" size="icon">
                                <Icon className="h-4 w-4" />
                              </Button>
                            </a>
                          );
                        })}
                      </div>
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
                      <Label htmlFor="profile-email">Notification Email</Label>
                      <Input
                        id="profile-email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        placeholder="your@email.com"
                        data-testid="input-profile-email"
                      />
                      <p className="text-xs text-muted-foreground">Order notifications will be sent to this email address.</p>
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
                    <div className="grid gap-2">
                      <Label>Social Media Links</Label>
                      <div className="space-y-3">
                        {socialPlatformsList.map((platform) => {
                          const Icon = platform.icon;
                          return (
                            <div key={platform.key} className="flex items-center gap-3">
                              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <Input
                                value={profileForm.socialLinks[platform.key] || ""}
                                onChange={(e) => setProfileForm({
                                  ...profileForm,
                                  socialLinks: { ...profileForm.socialLinks, [platform.key]: e.target.value }
                                })}
                                placeholder={platform.placeholder}
                                data-testid={`input-social-${platform.key}`}
                              />
                            </div>
                          );
                        })}
                      </div>
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
