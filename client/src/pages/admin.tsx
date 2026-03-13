import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { Trash2, Shield, Users, Image as ImageIcon, Columns3, Loader2 } from "lucide-react";
import type { Artist, ArtworkWithArtist, Exhibition } from "@shared/schema";
import type { User, UserRole } from "@shared/models/auth";

type SafeUser = Omit<User, "password">;

function RoleBadge({ role }: { role: string }) {
  const variant = role === "admin" ? "destructive" : role === "curator" ? "secondary" : "outline";
  return <Badge variant={variant}>{role}</Badge>;
}

function UsersTab() {
  const { toast } = useToast();
  const { data: users, isLoading } = useQuery<SafeUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Role updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) return <TableSkeleton cols={4} />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead className="w-[140px]">Change Role</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users?.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.email || "—"}</TableCell>
            <TableCell>{[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}</TableCell>
            <TableCell><RoleBadge role={user.role} /></TableCell>
            <TableCell>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</TableCell>
            <TableCell>
              <Select
                value={user.role}
                onValueChange={(role) => updateRoleMutation.mutate({ userId: user.id, role })}
                disabled={updateRoleMutation.isPending}
              >
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">user</SelectItem>
                  <SelectItem value="curator">curator</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ArtistsTab() {
  const { toast } = useToast();
  const { data: artists, isLoading } = useQuery<Artist[]>({
    queryKey: ["/api/admin/artists"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/artists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/artists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/artworks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artworks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      toast({ title: "Artist deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete artist", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) return <TableSkeleton cols={4} />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Country</TableHead>
          <TableHead>Specialization</TableHead>
          <TableHead className="w-[80px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {artists?.map((artist) => (
          <TableRow key={artist.id}>
            <TableCell className="font-medium">{artist.name}</TableCell>
            <TableCell>{artist.email || "—"}</TableCell>
            <TableCell>{artist.country || "—"}</TableCell>
            <TableCell>{artist.specialization || "—"}</TableCell>
            <TableCell>
              <DeleteButton
                title="Delete Artist"
                description={`This will permanently delete "${artist.name}" and all their artworks, auctions, orders, and blog posts. This action cannot be undone.`}
                onConfirm={() => deleteMutation.mutate(artist.id)}
                isPending={deleteMutation.isPending}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ArtworksTab() {
  const { toast } = useToast();
  const { data: artworks, isLoading } = useQuery<ArtworkWithArtist[]>({
    queryKey: ["/api/admin/artworks"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/artworks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/artworks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artworks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      toast({ title: "Artwork deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete artwork", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) return <TableSkeleton cols={5} />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Artist</TableHead>
          <TableHead>Medium</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>For Sale</TableHead>
          <TableHead className="w-[80px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {artworks?.map((artwork) => (
          <TableRow key={artwork.id}>
            <TableCell className="font-medium">{artwork.title}</TableCell>
            <TableCell>{artwork.artist.name}</TableCell>
            <TableCell>{artwork.medium}</TableCell>
            <TableCell>${parseInt(artwork.price).toLocaleString()}</TableCell>
            <TableCell>
              <Badge variant={artwork.isForSale ? "default" : "secondary"}>
                {artwork.isForSale ? "Yes" : "No"}
              </Badge>
            </TableCell>
            <TableCell>
              <DeleteButton
                title="Delete Artwork"
                description={`This will permanently delete "${artwork.title}" and all associated auctions, bids, and orders. This action cannot be undone.`}
                onConfirm={() => deleteMutation.mutate(artwork.id)}
                isPending={deleteMutation.isPending}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ExhibitionsTab() {
  const { toast } = useToast();
  const { data: exhibitions, isLoading } = useQuery<Exhibition[]>({
    queryKey: ["/api/admin/exhibitions"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/exhibitions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/exhibitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exhibitions"] });
      toast({ title: "Exhibition deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete exhibition", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) return <TableSkeleton cols={4} />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Active</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-[80px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {exhibitions?.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
              No exhibitions found
            </TableCell>
          </TableRow>
        )}
        {exhibitions?.map((exhibition) => (
          <TableRow key={exhibition.id}>
            <TableCell className="font-medium">{exhibition.name}</TableCell>
            <TableCell className="max-w-[300px] truncate">{exhibition.description || "—"}</TableCell>
            <TableCell>
              <Badge variant={exhibition.isActive ? "default" : "secondary"}>
                {exhibition.isActive ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell>{new Date(exhibition.createdAt).toLocaleDateString()}</TableCell>
            <TableCell>
              <DeleteButton
                title="Delete Exhibition"
                description={`This will permanently delete "${exhibition.name}" and remove all artwork placements. This action cannot be undone.`}
                onConfirm={() => deleteMutation.mutate(exhibition.id)}
                isPending={deleteMutation.isPending}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DeleteButton({
  title,
  description,
  onConfirm,
  isPending,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
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

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">You don't have permission to access this page. Admin access is required.</p>
            <Button className="mt-4" onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-serif font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage platform content and user roles</p>
        </div>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="mb-6">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="artists" className="gap-2">
            <Users className="h-4 w-4" />
            Artists
          </TabsTrigger>
          <TabsTrigger value="artworks" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            Artworks
          </TabsTrigger>
          <TabsTrigger value="exhibitions" className="gap-2">
            <Columns3 className="h-4 w-4" />
            Exhibitions
          </TabsTrigger>
        </TabsList>

        <Card>
          <CardContent className="p-0">
            <TabsContent value="users" className="m-0">
              <UsersTab />
            </TabsContent>
            <TabsContent value="artists" className="m-0">
              <ArtistsTab />
            </TabsContent>
            <TabsContent value="artworks" className="m-0">
              <ArtworksTab />
            </TabsContent>
            <TabsContent value="exhibitions" className="m-0">
              <ExhibitionsTab />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
