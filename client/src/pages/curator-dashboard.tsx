import { useState, useEffect } from "react";
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
import { Plus, Trash2, Save, Loader2, Image as ImageIcon, GripVertical, LogIn, Pencil } from "lucide-react";
import type { CuratorGalleryWithArtworks, ArtworkWithArtist } from "@shared/schema";

export default function CuratorDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");

  useEffect(() => {
    if (user) {
      setProfileFirstName(user.firstName || "");
      setProfileLastName(user.lastName || "");
    }
  }, [user]);

  const profileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string }) => {
      const res = await apiRequest("PATCH", "/api/curator/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setEditingProfile(false);
      toast({ title: "Profile updated" });
    },
  });

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
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; isPublished?: boolean; startDate?: string | null; endDate?: string | null }) => {
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg">Profile</CardTitle>
          {!editingProfile && (
            <Button variant="ghost" size="sm" onClick={() => setEditingProfile(true)}>
              <Pencil className="w-4 h-4 mr-1" />Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingProfile ? (
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="profile-first">First name</Label>
                <Input id="profile-first" value={profileFirstName} onChange={e => setProfileFirstName(e.target.value)} className="w-48" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="profile-last">Last name</Label>
                <Input id="profile-last" value={profileLastName} onChange={e => setProfileLastName(e.target.value)} className="w-48" />
              </div>
              <Button
                size="sm"
                onClick={() => profileMutation.mutate({ firstName: profileFirstName, lastName: profileLastName })}
                disabled={profileMutation.isPending}
              >
                {profileMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-1" />Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                setProfileFirstName(user?.firstName || "");
                setProfileLastName(user?.lastName || "");
                setEditingProfile(false);
              }}>Cancel</Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {user?.firstName || user?.lastName
                ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
                : <span className="italic">No name set — click Edit to add your display name</span>}
            </p>
          )}
        </CardContent>
      </Card>

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
  onUpdate: (data: { name?: string; description?: string; isPublished?: boolean; startDate?: string | null; endDate?: string | null }) => void;
  onDelete: () => void;
  updating: boolean;
}) {
  const [editName, setEditName] = useState(gallery.name);
  const [editDesc, setEditDesc] = useState(gallery.description || "");

  const tz = gallery.timezone || "UTC";

  // Convert a UTC Date to a datetime-local string in the gallery's timezone
  const utcToLocal = (d: string | Date | null | undefined) => {
    if (!d) return "";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "";
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(date);
    const get = (t: string) => parts.find(p => p.type === t)?.value || "00";
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  };

  // Convert a datetime-local string in the gallery's timezone to UTC ISO string
  const localToUtc = (naive: string) => {
    if (!naive) return null;
    // Create a formatter that tells us the UTC offset for this timezone at this date
    const probe = new Date(naive + "Z"); // approximate
    const utcStr = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).format(probe);
    const tzStr = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).format(probe);
    const parseMMDDYYYY = (s: string) => {
      const [datePart, timePart] = s.split(", ");
      const [mm, dd, yyyy] = datePart.split("/").map(Number);
      const [hh, min] = timePart.split(":").map(Number);
      return new Date(Date.UTC(yyyy, mm - 1, dd, hh, min));
    };
    const utcMs = parseMMDDYYYY(utcStr).getTime();
    const tzMs = parseMMDDYYYY(tzStr).getTime();
    const offsetMs = utcMs - tzMs;
    // The naive datetime in the target timezone, shifted to UTC
    return new Date(probe.getTime() + offsetMs).toISOString();
  };

  const [localStart, setLocalStart] = useState(utcToLocal(gallery.startDate));
  const [localEnd, setLocalEnd] = useState(utcToLocal(gallery.endDate));

  useEffect(() => { setLocalStart(utcToLocal(gallery.startDate)); }, [gallery.startDate, tz]);
  useEffect(() => { setLocalEnd(utcToLocal(gallery.endDate)); }, [gallery.endDate, tz]);

  const isActive = (() => {
    if (!gallery.isPublished) return false;
    const now = new Date();
    if (gallery.startDate && now < new Date(gallery.startDate)) return false;
    if (gallery.endDate && now > new Date(gallery.endDate)) return false;
    return true;
  })();

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
              <div className="flex items-center gap-2">
                <CardTitle className="cursor-pointer" onClick={onEdit}>{gallery.name}</CardTitle>
                {isActive && <Badge className="bg-green-600">Live</Badge>}
                {gallery.isPublished && !isActive && <Badge variant="outline">Scheduled</Badge>}
              </div>
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
              onCheckedChange={(checked) => {
                if (checked) {
                  const now = new Date();
                  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
                  const startIso = localStart ? localToUtc(localStart)! : now.toISOString();
                  const endIso = localEnd ? localToUtc(localEnd)! : twoWeeks.toISOString();
                  setLocalStart(utcToLocal(startIso));
                  setLocalEnd(utcToLocal(endIso));
                  onUpdate({ isPublished: true, startDate: startIso, endDate: endIso });
                } else {
                  onUpdate({ isPublished: false });
                }
              }}
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
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <Label htmlFor={`tz-${gallery.id}`} className="text-xs text-muted-foreground">Timezone</Label>
            <select
              id={`tz-${gallery.id}`}
              className="flex h-9 w-56 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={tz}
              onChange={e => onUpdate({ timezone: e.target.value } as any)}
            >
              {[
                "UTC", "Europe/London", "Europe/Amsterdam", "Europe/Berlin", "Europe/Paris",
                "Europe/Bucharest", "Europe/Moscow", "America/New_York", "America/Chicago",
                "America/Denver", "America/Los_Angeles", "America/Sao_Paulo",
                "Asia/Tokyo", "Asia/Shanghai", "Asia/Dubai", "Asia/Kolkata",
                "Australia/Sydney", "Pacific/Auckland",
              ].map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor={`start-${gallery.id}`} className="text-xs text-muted-foreground">Start ({tz.split("/").pop()?.replace(/_/g, " ")})</Label>
            <input
              id={`start-${gallery.id}`}
              type="datetime-local"
              className="flex h-9 w-56 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={localStart}
              onChange={e => {
                setLocalStart(e.target.value);
                onUpdate({ startDate: localToUtc(e.target.value) });
              }}
            />
          </div>
          <div>
            <Label htmlFor={`end-${gallery.id}`} className="text-xs text-muted-foreground">End ({tz.split("/").pop()?.replace(/_/g, " ")})</Label>
            <input
              id={`end-${gallery.id}`}
              type="datetime-local"
              className="flex h-9 w-56 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={localEnd}
              onChange={e => {
                setLocalEnd(e.target.value);
                onUpdate({ endDate: localToUtc(e.target.value) });
              }}
            />
          </div>
        </div>
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
