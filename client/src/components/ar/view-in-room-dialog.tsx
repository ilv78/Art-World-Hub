import { Suspense, lazy, useCallback, useRef, useState } from "react";
import { Eye, Upload, ZoomIn, ZoomOut, RotateCcw, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { usePanZoom } from "./use-pan-zoom";

// Lazy-loaded: pulls in three.js + r3f (~600KB), so it only downloads when a
// buyer actually opens the AR view rather than bloating every page load.
const RoomCanvas = lazy(() => import("./room-canvas").then((m) => ({ default: m.RoomCanvas })));

interface ViewInRoomDialogProps {
  artworkImage: string;
  title: string;
  widthCm: number | null;
  heightCm: number | null;
}

const DEFAULT_WALL_WIDTH_CM = 300;

/**
 * "View in my room" — Option A photo composite (#634). The buyer uploads a
 * photo of their wall and the artwork is composited on top at a believable
 * scale (driven by its real cm dimensions vs. an estimated wall width), with
 * drag to position and pinch/scroll to zoom. Fully client-side: the photo never
 * leaves the browser.
 */
export function ViewInRoomDialog({ artworkImage, title, widthCm, heightCm }: ViewInRoomDialogProps) {
  const [open, setOpen] = useState(false);
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [wallWidthCm, setWallWidthCm] = useState(DEFAULT_WALL_WIDTH_CM);
  // Phase 1b: scale auto-detected from a reference object in the room photo.
  const [detecting, setDetecting] = useState(false);
  const [autoRef, setAutoRef] = useState<string | null>(null);
  const { transform, handlers, reset, setZoom } = usePanZoom();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  // Best-effort: detect a known-size object in the photo and back out the wall
  // width from it, replacing the slider default. Fully non-blocking — if the
  // model fails to load or finds nothing recognisable, the manual slider stays.
  const autoDetectScale = useCallback(async (objectUrl: string) => {
    setDetecting(true);
    setAutoRef(null);
    try {
      const [{ detectObjects }, { estimateWallWidthCm }] = await Promise.all([
        import("./detect-objects"),
        import("./wall-estimator"),
      ]);
      const img = new Image();
      img.src = objectUrl;
      await img.decode();
      const detections = await detectObjects(img);
      const estimate = estimateWallWidthCm(detections, img.naturalWidth);
      if (estimate) {
        setWallWidthCm(estimate.wallWidthCm);
        setAutoRef(estimate.reference);
      }
    } catch {
      /* detection is optional — fall back to the manual slider */
    } finally {
      setDetecting(false);
    }
  }, []);

  const onPickFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setRoomImage((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    reset();
    void autoDetectScale(url);
  }, [reset, autoDetectScale]);

  const clearRoom = useCallback(() => {
    setRoomImage((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setAutoRef(null);
    setDetecting(false);
    reset();
  }, [reset]);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) clearRoom();
  }, [clearRoom]);

  const saveComposite = useCallback(() => {
    const canvas = surfaceRef.current?.querySelector("canvas");
    if (!canvas) return;
    try {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-in-my-room.png`;
      a.click();
    } catch {
      /* tainted canvas / unsupported — silently no-op */
    }
  }, [title]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" data-testid="button-view-in-room">
          <Eye className="mr-2 h-5 w-5" />
          View in my room
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>View “{title}” in your room</DialogTitle>
          <DialogDescription>
            Upload a photo of your wall. The artwork is placed at its real size — drag to position,
            pinch or scroll to zoom. Your photo stays on your device.
          </DialogDescription>
        </DialogHeader>

        {!roomImage ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <Button onClick={() => fileInputRef.current?.click()} data-testid="button-upload-room">
              Choose a room photo
            </Button>
            <p className="text-xs text-muted-foreground">JPG or PNG, taken straight-on for best results.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              ref={surfaceRef}
              className="relative aspect-[4/3] w-full touch-none overflow-hidden rounded-lg bg-black"
              {...handlers}
              data-testid="ar-surface"
            >
              <Suspense
                fallback={
                  <div className="flex h-full w-full items-center justify-center text-white">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                }
              >
                <RoomCanvas
                  roomImage={roomImage}
                  artworkImage={artworkImage}
                  widthCm={widthCm}
                  heightCm={heightCm}
                  wallWidthCm={wallWidthCm}
                  transform={transform}
                />
              </Suspense>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setZoom(1.1)} data-testid="button-zoom-in" aria-label="Zoom in">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setZoom(0.9)} data-testid="button-zoom-out" aria-label="Zoom out">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={reset} data-testid="button-reset" aria-label="Reset position">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <div className="flex min-w-[180px] flex-1 items-center gap-2">
                <span className="whitespace-nowrap text-xs text-muted-foreground">Wall width</span>
                <Slider
                  min={100}
                  max={600}
                  step={10}
                  value={[wallWidthCm]}
                  onValueChange={(v) => {
                    setWallWidthCm(v[0]);
                    setAutoRef(null); // manual override — drop the auto-detected hint
                  }}
                  data-testid="slider-wall-width"
                />
                <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{wallWidthCm}cm</span>
              </div>
              <Button variant="outline" size="sm" onClick={saveComposite} data-testid="button-save-composite">
                <Download className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={clearRoom} data-testid="button-change-photo">
                Change photo
              </Button>
            </div>
            {detecting && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="ar-detecting">
                <Loader2 className="h-3 w-3 animate-spin" />
                Measuring your wall from the photo…
              </p>
            )}
            {!detecting && autoRef && (
              <p className="text-xs text-muted-foreground" data-testid="ar-auto-scale">
                Scale auto-detected from the {autoRef} in your photo. Adjust the slider if it looks off.
              </p>
            )}
            {!detecting && !autoRef && (!widthCm || !heightCm) && (
              <p className="text-xs text-muted-foreground">
                This artwork has no exact size set, so scale is approximate. Use the wall-width slider to calibrate.
              </p>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onPickFile}
          data-testid="input-room-photo"
        />
      </DialogContent>
    </Dialog>
  );
}
