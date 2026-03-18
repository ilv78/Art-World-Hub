import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useAuth } from "@/hooks/use-auth";
import { Plus, Trash2, Save, Loader2, Image as ImageIcon, GripVertical, LogIn } from "lucide-react";
import type { CuratorGalleryWithArtworks, ArtworkWithArtist } from "@shared/schema";

export default function CuratorDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const isCurator = isAuthenticated && (user?.role === "curator" || user?.role === "admin");

  const { data: galleries, isLoading } = useQuery<CuratorGalleryWithArtworks[]>({
    queryKey: ["/api/curator/galleries"],
    enabled: isCurator,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await apiRequest("POST", "/api/curator/galleries", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/curator/galleries"] });
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      toast({ title: "Gallery created" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/curator/galleries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/curator/galleries"] });
      toast({ title: "Gallery deleted" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; isPublished?: boolean }) => {
      const res = await apiRequest("PATCH", `/api/curator/galleries/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/curator/galleries"] });
      toast({ title: "Gallery updated" });
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <LogIn className="w-12 h-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Please log in to access the curator dashboard.</p>
      </div>
    );
  }

  if (!isCurator) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-lg text-muted-foreground">Access Denied — Curator role required.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-serif">Curator Dashboard</h1>
          <p className="text-muted-foreground mt-1">Create and manage your curated galleries</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />New Gallery</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Gallery</DialogTitle>
              <DialogDescription>Give your curated gallery a name and optional description.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="gallery-name">Name</Label>
                <Input id="gallery-name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Modern Romanian Art" />
              </div>
              <div>
                <Label htmlFor="gallery-desc">Description (optional)</Label>
                <Textarea id="gallery-desc" value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="A short description of this collection..." />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => createMutation.mutate({ name: newName, description: newDescription || undefined })}
                disabled={!newName.trim() || createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : !galleries?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ImageIcon className="w-12 h-12 mb-4" />
            <p>No galleries yet. Create your first curated gallery!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {galleries.map(gallery => (
            <GalleryCard
              key={gallery.id}
              gallery={gallery}
              isEditing={editingGalleryId === gallery.id}
              onEdit={() => setEditingGalleryId(editingGalleryId === gallery.id ? null : gallery.id)}
              onUpdate={(data) => updateMutation.mutate({ id: gallery.id, ...data })}
              onDelete={() => deleteMutation.mutate(gallery.id)}
              updating={updateMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryCard({
  gallery,
  isEditing,
  onEdit,
  onUpdate,
  onDelete,
  updating,
}: {
  gallery: CuratorGalleryWithArtworks;
  isEditing: boolean;
  onEdit: () => void;
  onUpdate: (data: { name?: string; description?: string; isPublished?: boolean }) => void;
  onDelete: () => void;
  updating: boolean;
}) {
  const [editName, setEditName] = useState(gallery.name);
  const [editDesc, setEditDesc] = useState(gallery.description || "");

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1 flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
              <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description..." />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { onUpdate({ name: editName, description: editDesc }); onEdit(); }} disabled={updating}>
                  <Save className="w-3 h-3 mr-1" />Save
                </Button>
                <Button size="sm" variant="outline" onClick={onEdit}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <CardTitle className="cursor-pointer" onClick={onEdit}>{gallery.name}</CardTitle>
              {gallery.description && <CardDescription>{gallery.description}</CardDescription>}
            </>
          )}
        </div>
        <div className="flex items-center gap-3 ml-4">
          <div className="flex items-center gap-2">
            <Label htmlFor={`pub-${gallery.id}`} className="text-sm">Published</Label>
            <Switch
              id={`pub-${gallery.id}`}
              checked={gallery.isPublished ?? false}
              onCheckedChange={(checked) => onUpdate({ isPublished: checked })}
            />
          </div>
          <Badge variant="secondary">{gallery.artworks.length} artworks</Badge>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete gallery?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete "{gallery.name}" and remove all artwork selections.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent>
        <ArtworkPicker galleryId={gallery.id} selectedArtworks={gallery.artworks} />
      </CardContent>
    </Card>
  );
}

function ArtworkPicker({ galleryId, selectedArtworks }: { galleryId: string; selectedArtworks: ArtworkWithArtist[] }) {
  const { toast } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(selectedArtworks.map(a => a.id));

  const { data: available } = useQuery<ArtworkWithArtist[]>({
    queryKey: ["/api/curator/artworks/available"],
    enabled: pickerOpen,
  });

  const saveMutation = useMutation({
    mutationFn: async (artworkIds: string[]) => {
      const res = await apiRequest("PUT", `/api/curator/galleries/${galleryId}/artworks`, { artworkIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/curator/galleries"] });
      setPickerOpen(false);
      toast({ title: "Artworks updated" });
    },
  });

  const toggleArtwork = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const moveUp = (id: string) => {
    setSelected(prev => {
      const idx = prev.indexOf(id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (id: string) => {
    setSelected(prev => {
      const idx = prev.indexOf(id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  return (
    <div>
      {selectedArtworks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
          {selectedArtworks.map(artwork => (
            <div key={artwork.id} className="relative group">
              <img
                src={artwork.imageUrl}
                alt={artwork.title}
                className="w-full aspect-square object-cover rounded-lg"
              />
              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs p-1.5 rounded-b-lg">
                <div className="truncate font-medium">{artwork.title}</div>
                <div className="truncate text-white/70">{artwork.artist.name}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-4">No artworks selected yet.</p>
      )}

      <Dialog open={pickerOpen} onOpenChange={(open) => { setPickerOpen(open); if (open) setSelected(selectedArtworks.map(a => a.id)); }}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm"><Plus className="w-3 h-3 mr-1" />Select Artworks</Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Artworks</DialogTitle>
            <DialogDescription>Choose exhibition-ready artworks for this gallery. Click to select/deselect.</DialogDescription>
          </DialogHeader>

          {selected.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Selected order ({selected.length}):</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {selected.map((id, idx) => {
                  const aw = available?.find(a => a.id === id) || selectedArtworks.find(a => a.id === id);
                  return (
                    <div key={id} className="flex items-center gap-2 text-sm bg-muted/50 rounded px-2 py-1">
                      <span className="text-muted-foreground w-5">{idx + 1}.</span>
                      <span className="flex-1 truncate">{aw?.title ?? id}</span>
                      <span className="text-muted-foreground truncate text-xs">{aw?.artist?.name}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveUp(id)} disabled={idx === 0}>
                        <GripVertical className="w-3 h-3 rotate-180" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveDown(id)} disabled={idx === selected.length - 1}>
                        <GripVertical className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {available?.map(artwork => {
              const isSelected = selected.includes(artwork.id);
              return (
                <div
                  key={artwork.id}
                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-colors ${isSelected ? "border-primary" : "border-transparent hover:border-muted-foreground/30"}`}
                  onClick={() => toggleArtwork(artwork.id)}
                >
                  <img src={artwork.imageUrl} alt={artwork.title} className="w-full aspect-square object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs p-1.5">
                    <div className="truncate font-medium">{artwork.title}</div>
                    <div className="truncate text-white/70">{artwork.artist.name}</div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                      {selected.indexOf(artwork.id) + 1}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPickerOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(selected)} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save ({selected.length} artworks)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
