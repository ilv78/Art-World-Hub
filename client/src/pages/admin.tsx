import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Shield, Trash2, Users, Palette, Image, Calendar, BookOpen } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type AdminUser = {
  id: string;
  email: string | null;
  role: string;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean | null;
  createdAt: string | null;
};

type AdminArtist = {
  id: string;
  userId: string | null;
  name: string;
  email: string | null;
  specialization: string | null;
  country: string | null;
};

type AdminArtwork = {
  id: string;
  title: string;
  medium: string;
  price: string;
  isForSale: boolean;
  artist: { id: string; name: string };
};

type AdminExhibition = {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  createdAt: string;
};

type AdminBlogPost = {
  id: string;
  title: string;
  isPublished: boolean;
  createdAt: string;
  artist: { id: string; name: string };
};

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || body.message || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: () => apiFetch("/api/admin/users"),
    enabled: user?.role === "admin",
  });

  const { data: adminArtists = [], isLoading: artistsLoading } = useQuery<AdminArtist[]>({
    queryKey: ["/api/admin/artists"],
    queryFn: () => apiFetch("/api/admin/artists"),
    enabled: user?.role === "admin",
  });

  const { data: adminArtworks = [], isLoading: artworksLoading } = useQuery<AdminArtwork[]>({
    queryKey: ["/api/admin/artworks"],
    queryFn: () => apiFetch("/api/admin/artworks"),
    enabled: user?.role === "admin",
  });

  const { data: adminExhibitions = [], isLoading: exhibitionsLoading } = useQuery<AdminExhibition[]>({
    queryKey: ["/api/admin/exhibitions"],
    queryFn: () => apiFetch("/api/admin/exhibitions"),
    enabled: user?.role === "admin",
  });

  const { data: adminBlogPosts = [], isLoading: blogLoading } = useQuery<AdminBlogPost[]>({
    queryKey: ["/api/admin/blog"],
    queryFn: () => apiFetch("/api/admin/blog"),
    enabled: user?.role === "admin",
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiFetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Role updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update role", description: err.message, variant: "destructive" });
    },
  });

  const deleteArtistMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/artists/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/artists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/artworks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artworks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gallery/hallway"] });
      toast({ title: "Artist deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete artist", description: err.message, variant: "destructive" });
    },
  });

  const deleteArtworkMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/artworks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/artworks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artworks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gallery/hallway"] });
      toast({ title: "Artwork deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete artwork", description: err.message, variant: "destructive" });
    },
  });

  const deleteExhibitionMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/exhibitions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/exhibitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exhibitions"] });
      toast({ title: "Exhibition deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete exhibition", description: err.message, variant: "destructive" });
    },
  });

  const deleteBlogPostMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/blog/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artists"] });
      toast({ title: "Blog post deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete blog post", description: err.message, variant: "destructive" });
    },
  });

  if (authLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <h1 className="text-2xl font-serif font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You need admin privileges to access this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-serif font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, artists, artworks, and exhibitions</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Users</CardDescription>
            <CardTitle className="text-2xl">{users.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Artists</CardDescription>
            <CardTitle className="text-2xl">{adminArtists.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Artworks</CardDescription>
            <CardTitle className="text-2xl">{adminArtworks.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Exhibitions</CardDescription>
            <CardTitle className="text-2xl">{adminExhibitions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Blog Posts</CardDescription>
            <CardTitle className="text-2xl">{adminBlogPosts.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />Users</TabsTrigger>
          <TabsTrigger value="artists"><Palette className="w-4 h-4 mr-2" />Artists</TabsTrigger>
          <TabsTrigger value="artworks"><Image className="w-4 h-4 mr-2" />Artworks</TabsTrigger>
          <TabsTrigger value="exhibitions"><Calendar className="w-4 h-4 mr-2" />Exhibitions</TabsTrigger>
          <TabsTrigger value="blog"><BookOpen className="w-4 h-4 mr-2" />Blog</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View and manage user roles</CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <p className="text-muted-foreground">Loading users...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono text-sm">{u.email || "—"}</TableCell>
                        <TableCell>{[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}</TableCell>
                        <TableCell>
                          <Select
                            value={u.role}
                            onValueChange={(role) => updateRoleMutation.mutate({ userId: u.id, role })}
                            disabled={u.id === user.id}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">user</SelectItem>
                              <SelectItem value="curator">curator</SelectItem>
                              <SelectItem value="admin">admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.emailVerified ? "default" : "secondary"}>
                            {u.emailVerified ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="artists">
          <Card>
            <CardHeader>
              <CardTitle>Artist Management</CardTitle>
              <CardDescription>View and manage artist profiles</CardDescription>
            </CardHeader>
            <CardContent>
              {artistsLoading ? (
                <p className="text-muted-foreground">Loading artists...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Specialization</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminArtists.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="text-sm">{a.email || "—"}</TableCell>
                        <TableCell>{a.specialization || "—"}</TableCell>
                        <TableCell>{a.country || "—"}</TableCell>
                        <TableCell>
                          <DeleteButton
                            onConfirm={() => deleteArtistMutation.mutate(a.id)}
                            description={`This will permanently delete "${a.name}" and all their artworks, blog posts, and related data.`}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="artworks">
          <Card>
            <CardHeader>
              <CardTitle>Artwork Management</CardTitle>
              <CardDescription>View and manage all artworks</CardDescription>
            </CardHeader>
            <CardContent>
              {artworksLoading ? (
                <p className="text-muted-foreground">Loading artworks...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Artist</TableHead>
                      <TableHead>Medium</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>For Sale</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminArtworks.map((aw) => (
                      <TableRow key={aw.id}>
                        <TableCell className="font-medium">{aw.title}</TableCell>
                        <TableCell>{aw.artist.name}</TableCell>
                        <TableCell>{aw.medium}</TableCell>
                        <TableCell>${parseInt(aw.price).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={aw.isForSale ? "default" : "secondary"}>
                            {aw.isForSale ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DeleteButton
                            onConfirm={() => deleteArtworkMutation.mutate(aw.id)}
                            description={`This will permanently delete "${aw.title}" and all associated auctions, bids, and orders.`}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exhibitions">
          <Card>
            <CardHeader>
              <CardTitle>Exhibition Management</CardTitle>
              <CardDescription>View and manage exhibitions</CardDescription>
            </CardHeader>
            <CardContent>
              {exhibitionsLoading ? (
                <p className="text-muted-foreground">Loading exhibitions...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminExhibitions.map((ex) => (
                      <TableRow key={ex.id}>
                        <TableCell className="font-medium">{ex.title}</TableCell>
                        <TableCell>
                          <Badge variant={ex.isActive ? "default" : "secondary"}>
                            {ex.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(ex.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DeleteButton
                            onConfirm={() => deleteExhibitionMutation.mutate(ex.id)}
                            description={`This will permanently delete "${ex.title}" and remove all artwork associations.`}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blog">
          <Card>
            <CardHeader>
              <CardTitle>Blog Management</CardTitle>
              <CardDescription>View and manage blog posts</CardDescription>
            </CardHeader>
            <CardContent>
              {blogLoading ? (
                <p className="text-muted-foreground">Loading blog posts...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Published</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminBlogPosts.map((bp) => (
                      <TableRow key={bp.id}>
                        <TableCell className="font-medium">{bp.title}</TableCell>
                        <TableCell>{bp.artist.name}</TableCell>
                        <TableCell>
                          <Badge variant={bp.isPublished ? "default" : "secondary"}>
                            {bp.isPublished ? "Yes" : "Draft"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(bp.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DeleteButton
                            onConfirm={() => deleteBlogPostMutation.mutate(bp.id)}
                            description={`This will permanently delete the blog post "${bp.title}".`}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DeleteButton({ onConfirm, description }: { onConfirm: () => void; description: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
