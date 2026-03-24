import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, ShoppingCart, Info, Move, Mouse, Keyboard, Maximize2, Minimize2, ZoomIn, ZoomOut, Box, Map as MapIcon, MapPin, Palette, Image as ImageIcon, ExternalLink, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Hand } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { ArtworkWithArtist, Artist, MazeLayout, MazeCell } from "@shared/schema";
import { useCartStore } from "@/lib/cart-store";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getTemplate, type GalleryTemplate, type TextureSet } from "@/lib/gallery-templates";

interface MazeGallery3DProps {
  artworks: ArtworkWithArtist[];
  layout?: MazeLayout;
  whiteRoom?: boolean;
  galleryTemplate?: string;
  artist?: Artist;
  onExitGallery?: () => void;
}

// Default maze layout - a simple gallery with multiple rooms
const defaultLayout: MazeLayout = {
  width: 5,
  height: 5,
  spawnPoint: { x: 2, z: 2 },
  cells: [
    // Row 0 (entrance)
    { x: 0, z: 0, walls: { north: true, south: true, east: false, west: true }, artworkSlots: [{ wallId: "0-0-north", position: 0 }] },
    { x: 1, z: 0, walls: { north: true, south: true, east: false, west: false }, artworkSlots: [{ wallId: "1-0-north", position: 0 }] },
    { x: 2, z: 0, walls: { north: false, south: false, east: false, west: false }, artworkSlots: [] },
    { x: 3, z: 0, walls: { north: true, south: true, east: false, west: false }, artworkSlots: [{ wallId: "3-0-north", position: 0 }] },
    { x: 4, z: 0, walls: { north: true, south: true, east: true, west: false }, artworkSlots: [{ wallId: "4-0-north", position: 0 }] },
    // Row 1
    { x: 0, z: 1, walls: { north: false, south: true, east: false, west: true }, artworkSlots: [{ wallId: "0-1-west", position: 0 }] },
    { x: 1, z: 1, walls: { north: false, south: true, east: false, west: false }, artworkSlots: [] },
    { x: 2, z: 1, walls: { north: false, south: false, east: false, west: false }, artworkSlots: [] },
    { x: 3, z: 1, walls: { north: false, south: true, east: false, west: false }, artworkSlots: [] },
    { x: 4, z: 1, walls: { north: false, south: true, east: true, west: false }, artworkSlots: [{ wallId: "4-1-east", position: 0 }] },
    // Row 2
    { x: 0, z: 2, walls: { north: false, south: false, east: true, west: true }, artworkSlots: [{ wallId: "0-2-west", position: 0 }] },
    { x: 1, z: 2, walls: { north: true, south: false, east: false, west: true }, artworkSlots: [{ wallId: "1-2-north", position: 0 }] },
    { x: 2, z: 2, walls: { north: true, south: false, east: false, west: false }, artworkSlots: [{ wallId: "2-2-north", position: 0 }] },
    { x: 3, z: 2, walls: { north: true, south: false, east: true, west: false }, artworkSlots: [{ wallId: "3-2-north", position: 0 }] },
    { x: 4, z: 2, walls: { north: false, south: false, east: true, west: true }, artworkSlots: [{ wallId: "4-2-east", position: 0 }] },
    // Row 3
    { x: 0, z: 3, walls: { north: false, south: false, east: false, west: true }, artworkSlots: [{ wallId: "0-3-west", position: 0 }] },
    { x: 1, z: 3, walls: { north: false, south: true, east: false, west: false }, artworkSlots: [] },
    { x: 2, z: 3, walls: { north: false, south: true, east: false, west: false }, artworkSlots: [] },
    { x: 3, z: 3, walls: { north: false, south: true, east: false, west: false }, artworkSlots: [] },
    { x: 4, z: 3, walls: { north: false, south: false, east: true, west: false }, artworkSlots: [{ wallId: "4-3-east", position: 0 }] },
    // Row 4 (back)
    { x: 0, z: 4, walls: { north: true, south: false, east: false, west: true }, artworkSlots: [{ wallId: "0-4-south", position: 0 }] },
    { x: 1, z: 4, walls: { north: true, south: false, east: false, west: false }, artworkSlots: [{ wallId: "1-4-south", position: 0 }] },
    { x: 2, z: 4, walls: { north: true, south: false, east: false, west: false }, artworkSlots: [{ wallId: "2-4-south", position: 0 }] },
    { x: 3, z: 4, walls: { north: true, south: false, east: false, west: false }, artworkSlots: [{ wallId: "3-4-south", position: 0 }] },
    { x: 4, z: 4, walls: { north: true, south: false, east: true, west: false }, artworkSlots: [{ wallId: "4-4-south", position: 0 }] },
  ],
};

const CELL_SIZE_DEFAULT = 2.5;
const CELL_SIZE_WHITE = 2.5;
const WALL_HEIGHT = 3;
const WALL_THICKNESS = 0.15;
const PLAYER_HEIGHT = 1.5;
const MOVE_SPEED = 0.08;
const LOOK_SPEED = 0.002;

function parseDimensionsCm(dimensions: string | null | undefined): { w: number; h: number } | null {
  if (!dimensions) return null;
  const match = dimensions.match(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const w = parseFloat(match[1]);
  const h = parseFloat(match[2]);
  if (w > 0 && h > 0) return { w, h };
  return null;
}

function artworkScale(dimensions: string | null | undefined, maxSize: number): { w: number; h: number } {
  const parsed = parseDimensionsCm(dimensions);
  if (!parsed) return { w: maxSize, h: maxSize };
  const cmW = parsed.w / 100;
  const cmH = parsed.h / 100;
  const scale = Math.min(maxSize / cmW, maxSize / cmH, 1);
  const finalW = Math.max(0.3, cmW * scale);
  const finalH = Math.max(0.3, cmH * scale);
  return { w: finalW, h: finalH };
}

export function MazeGallery3D({ artworks, layout = defaultLayout, whiteRoom = false, galleryTemplate: templateId, artist, onExitGallery }: MazeGallery3DProps) {
  // Resolve template: explicit galleryTemplate prop takes priority, then whiteRoom legacy fallback
  const tmpl: GalleryTemplate = getTemplate(templateId || (whiteRoom ? "contemporary" : undefined));
  const isLightTheme = tmpl.ambientIntensity >= 0.8;
  const CELL_SIZE = CELL_SIZE_WHITE;
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const artworkMeshesRef = useRef<Map<string, { mesh: THREE.Mesh; artwork: ArtworkWithArtist }>>(new Map());
  const posterMeshRef = useRef<THREE.Mesh | null>(null);
  const doorMeshRef = useRef<THREE.Mesh | null>(null);
  
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkWithArtist | null>(null);
  const [showArtistDialog, setShowArtistDialog] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [showMinimap, setShowMinimap] = useState(true);
  const [playerPosition, setPlayerPosition] = useState({ x: 0, z: 0, rotation: 0 });
  
  const keysPressed = useRef<Set<string>>(new Set());
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  const velocity = useRef(new THREE.Vector3());
  const playerPosRef = useRef({ x: 0, z: 0, rotation: 0 });
  const isPointerLockedRef = useRef(false);
  const selectedArtworkRef = useRef<ArtworkWithArtist | null>(null);
  const artworkCollisionZones = useRef<{ x: number; z: number; normalX: number; normalZ: number }[]>([]);

  // Mobile support
  const isMobile = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  const touchLookRef = useRef<{ lastX: number; lastY: number } | null>(null);
  const mobileMoveRef = useRef<{ forward: boolean; backward: boolean; left: boolean; right: boolean }>({ forward: false, backward: false, left: false, right: false });
  
  const { addItem, items } = useCartStore();
  const { toast } = useToast();

  const { data: artistArtworks, isLoading: artworksLoading } = useQuery<ArtworkWithArtist[]>({
    queryKey: [`/api/artists/${artist?.id}/artworks`],
    enabled: !!artist && showArtistDialog,
  });

  const isInCart = selectedArtwork ? items.some(item => item.artwork.id === selectedArtwork.id) : false;

  selectedArtworkRef.current = selectedArtwork;

  const handleAddToCart = useCallback(() => {
    if (selectedArtwork && !isInCart) {
      addItem(selectedArtwork);
      toast({
        title: "Added to cart",
        description: `${selectedArtwork.title} has been added to your cart.`,
      });
    }
  }, [selectedArtwork, isInCart, addItem, toast]);

  // Load a texture set (color + normal + roughness) with tiling
  const loadTexturedMaterial = useCallback((
    texSet: TextureSet | null,
    fallbackColor: number,
    roughness: number,
    repeat: number,
    opts?: { metalness?: number },
  ): THREE.MeshStandardMaterial => {
    const loader = new THREE.TextureLoader();
    const setupTile = (tex: THREE.Texture) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat, repeat);
      return tex;
    };

    if (!texSet) {
      return new THREE.MeshStandardMaterial({ color: fallbackColor, roughness, metalness: opts?.metalness || 0 });
    }

    const mat = new THREE.MeshStandardMaterial({ color: fallbackColor, roughness });

    loader.load(texSet.color, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      setupTile(tex);
      mat.map = tex;
      mat.needsUpdate = true;
    });
    loader.load(texSet.normal, (tex) => {
      setupTile(tex);
      mat.normalMap = tex;
      mat.normalScale = new THREE.Vector2(0.8, 0.8);
      mat.needsUpdate = true;
    });
    loader.load(texSet.roughness, (tex) => {
      setupTile(tex);
      mat.roughnessMap = tex;
      mat.needsUpdate = true;
    });

    return mat;
  }, []);

  const createMaze = useCallback((scene: THREE.Scene) => {
    const floorW = layout.width * CELL_SIZE + 4;
    const floorH = layout.height * CELL_SIZE + 4;

    // Floor
    const floorMat = loadTexturedMaterial(
      tmpl.floorTexture, tmpl.floorColor, tmpl.floorRoughness, tmpl.floorRepeat,
      { metalness: tmpl.floorType === "glossy" ? 0.1 : 0 },
    );
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(floorW, floorH), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(layout.width * CELL_SIZE / 2, 0, layout.height * CELL_SIZE / 2);
    floor.receiveShadow = true;
    scene.add(floor);

    // Ceiling
    const ceilMat = new THREE.MeshStandardMaterial({ color: tmpl.ceilingColor, roughness: tmpl.ceilingRoughness });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(floorW, floorH), ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(layout.width * CELL_SIZE / 2, WALL_HEIGHT, layout.height * CELL_SIZE / 2);
    scene.add(ceiling);

    // Walls
    const wallMaterial = loadTexturedMaterial(
      tmpl.wallTexture, tmpl.wallColor, tmpl.wallRoughness, tmpl.wallRepeat,
    );

    const doorFrameMaterial = new THREE.MeshStandardMaterial({ color: tmpl.doorFrameColor, roughness: 0.6 });
    const doorCenterX = Math.floor(layout.width / 2);

    layout.cells.forEach((cell) => {
      const baseX = cell.x * CELL_SIZE;
      const baseZ = cell.z * CELL_SIZE;

      if (cell.walls.north) {
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(CELL_SIZE, WALL_HEIGHT, WALL_THICKNESS),
          wallMaterial
        );
        wall.position.set(baseX + CELL_SIZE / 2, WALL_HEIGHT / 2, baseZ + CELL_SIZE);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
      }

      if (cell.walls.south) {
        const isDoorCell = tmpl.hasDoor && cell.z === 0 && cell.x === doorCenterX;
        if (isDoorCell) {
          const doorWidth = CELL_SIZE * 0.5;
          const sideWidth = (CELL_SIZE - doorWidth) / 2;
          const doorHeight = WALL_HEIGHT * 0.85;

          if (sideWidth > 0.01) {
            const leftWall = new THREE.Mesh(
              new THREE.BoxGeometry(sideWidth, WALL_HEIGHT, WALL_THICKNESS),
              wallMaterial
            );
            leftWall.position.set(baseX + sideWidth / 2, WALL_HEIGHT / 2, baseZ);
            leftWall.castShadow = true;
            scene.add(leftWall);

            const rightWall = new THREE.Mesh(
              new THREE.BoxGeometry(sideWidth, WALL_HEIGHT, WALL_THICKNESS),
              wallMaterial
            );
            rightWall.position.set(baseX + CELL_SIZE - sideWidth / 2, WALL_HEIGHT / 2, baseZ);
            rightWall.castShadow = true;
            scene.add(rightWall);
          }

          const lintel = new THREE.Mesh(
            new THREE.BoxGeometry(doorWidth + 0.1, WALL_HEIGHT - doorHeight, WALL_THICKNESS + 0.02),
            wallMaterial
          );
          lintel.position.set(baseX + CELL_SIZE / 2, doorHeight + (WALL_HEIGHT - doorHeight) / 2, baseZ);
          scene.add(lintel);

          const postGeo = new THREE.BoxGeometry(0.08, doorHeight, 0.08);
          const leftPost = new THREE.Mesh(postGeo, doorFrameMaterial);
          leftPost.position.set(baseX + sideWidth, doorHeight / 2, baseZ);
          scene.add(leftPost);

          const rightPost = new THREE.Mesh(postGeo, doorFrameMaterial);
          rightPost.position.set(baseX + CELL_SIZE - sideWidth, doorHeight / 2, baseZ);
          scene.add(rightPost);

          const lintelFrame = new THREE.Mesh(
            new THREE.BoxGeometry(doorWidth + 0.16, 0.08, 0.08),
            doorFrameMaterial
          );
          lintelFrame.position.set(baseX + CELL_SIZE / 2, doorHeight, baseZ);
          scene.add(lintelFrame);

          const doorPanelMat = new THREE.MeshStandardMaterial({ color: tmpl.doorPanelColor, roughness: 0.5 });
          const doorPanel = new THREE.Mesh(
            new THREE.BoxGeometry(doorWidth - 0.04, doorHeight - 0.04, 0.06),
            doorPanelMat
          );
          doorPanel.position.set(baseX + CELL_SIZE / 2, (doorHeight - 0.04) / 2, baseZ);
          scene.add(doorPanel);
          doorMeshRef.current = doorPanel;
        } else {
          const wall = new THREE.Mesh(
            new THREE.BoxGeometry(CELL_SIZE, WALL_HEIGHT, WALL_THICKNESS),
            wallMaterial
          );
          wall.position.set(baseX + CELL_SIZE / 2, WALL_HEIGHT / 2, baseZ);
          wall.castShadow = true;
          wall.receiveShadow = true;
          scene.add(wall);
        }
      }

      if (cell.walls.east) {
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, CELL_SIZE),
          wallMaterial
        );
        wall.position.set(baseX + CELL_SIZE, WALL_HEIGHT / 2, baseZ + CELL_SIZE / 2);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
      }

      if (cell.walls.west) {
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, CELL_SIZE),
          wallMaterial
        );
        wall.position.set(baseX, WALL_HEIGHT / 2, baseZ + CELL_SIZE / 2);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
      }
    });

  }, [layout, tmpl, CELL_SIZE, loadTexturedMaterial]);

  const computeSlotPosition = useCallback((wallId: string) => {
    const [cellX, cellZ, direction] = wallId.split("-");
    const baseX = parseInt(cellX) * CELL_SIZE;
    const baseZ = parseInt(cellZ) * CELL_SIZE;
    let x = baseX + CELL_SIZE / 2;
    let z = baseZ + CELL_SIZE / 2;
    let rotY = 0;
    switch (direction) {
      case "north":
        z = baseZ + CELL_SIZE - 0.3;
        rotY = Math.PI;
        break;
      case "south":
        z = baseZ + 0.3;
        rotY = 0;
        break;
      case "east":
        x = baseX + CELL_SIZE - 0.3;
        rotY = -Math.PI / 2;
        break;
      case "west":
        x = baseX + 0.3;
        rotY = Math.PI / 2;
        break;
    }
    return { x, z, rotY };
  }, [CELL_SIZE]);

  const createArtistPoster = useCallback((scene: THREE.Scene, wallId: string) => {
    if (!artist) return;
    const posterW = CELL_SIZE - 0.1;
    const posterH = WALL_HEIGHT * 0.75;
    const canvas = document.createElement("canvas");
    const cw = 1024;
    const ch = Math.round(1024 * (posterH / posterW));
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#faf8f5";
    ctx.fillRect(0, 0, cw, ch);

    ctx.strokeStyle = "#d4a854";
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, cw - 32, ch - 32);

    const drawText = () => {
      let y = 320;

      ctx.fillStyle = "#000000";
      ctx.font = "bold 72px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(artist.name, cw / 2, y);
      y += 70;

      if (artist.country) {
        ctx.fillStyle = "#111111";
        ctx.font = "bold 34px sans-serif";
        ctx.fillText(artist.country, cw / 2, y);
        y += 50;
      }

      if (artist.specialization) {
        ctx.fillStyle = "#222222";
        ctx.font = "bold italic 32px Georgia, serif";
        ctx.fillText(artist.specialization, cw / 2, y);
        y += 54;
      }

      if (artist.bio) {
        ctx.fillStyle = "#111111";
        ctx.font = "bold 26px sans-serif";
        ctx.textAlign = "left";
        const maxWidth = cw - 100;
        const maxY = ch - 40;
        const paragraphs = artist.bio.split("\n");
        for (const para of paragraphs) {
          if (y > maxY) break;
          if (para.trim() === "") {
            y += 16;
            continue;
          }
          const words = para.split(" ");
          let line = "";
          for (const word of words) {
            const test = line + (line ? " " : "") + word;
            if (ctx.measureText(test).width > maxWidth && line) {
              if (y > maxY) { ctx.fillText(line.replace(/\s*\S*$/, "..."), 50, y); y += 30; break; }
              ctx.fillText(line, 50, y);
              y += 30;
              line = word;
            } else {
              line = test;
            }
          }
          if (line && y <= maxY) {
            ctx.fillText(line, 50, y);
            y += 30;
          }
        }
      }
    };

    const avatarSize = 180;
    const ax = (cw - avatarSize) / 2;
    const ay = 50;

    const drawFallbackAvatar = () => {
      ctx.fillStyle = "#e8e0d8";
      ctx.beginPath();
      ctx.arc(ax + avatarSize / 2, ay + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1a2e";
      ctx.font = "bold 64px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const initials = (artist.name || "?").split(" ").map(n => n[0]).join("");
      ctx.fillText(initials, ax + avatarSize / 2, ay + avatarSize / 2);
      ctx.textBaseline = "alphabetic";
    };

    drawFallbackAvatar();
    drawText();

    const posterTexture = new THREE.CanvasTexture(canvas);
    posterTexture.colorSpace = THREE.SRGBColorSpace;
    const posterGeo = new THREE.PlaneGeometry(posterW, posterH);
    const posterMat = new THREE.MeshStandardMaterial({ map: posterTexture, roughness: 0.4 });
    const posterMesh = new THREE.Mesh(posterGeo, posterMat);
    const pos = computeSlotPosition(wallId);
    posterMesh.position.set(pos.x, WALL_HEIGHT / 2, pos.z);
    posterMesh.rotation.y = pos.rotY;
    posterMesh.translateZ(0.06);
    scene.add(posterMesh);

    posterMeshRef.current = posterMesh;

    if (artist.avatarUrl) {
      const avatarImg = new Image();
      avatarImg.crossOrigin = "anonymous";
      avatarImg.onload = () => {
        ctx.fillStyle = "#faf8f5";
        ctx.fillRect(0, 0, cw, ch);
        ctx.strokeStyle = "#d4a854";
        ctx.lineWidth = 6;
        ctx.strokeRect(16, 16, cw - 32, ch - 32);

        ctx.save();
        ctx.beginPath();
        ctx.arc(ax + avatarSize / 2, ay + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatarImg, ax, ay, avatarSize, avatarSize);
        ctx.restore();

        ctx.strokeStyle = "#d4a854";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ax + avatarSize / 2, ay + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.stroke();

        drawText();
        posterTexture.needsUpdate = true;
      };
      try {
        const u = new URL(artist.avatarUrl);
        const host = u.hostname.toLowerCase();
        const isCorsOk = host.includes("unsplash.com") || host === window.location.hostname;
        avatarImg.src = isCorsOk ? artist.avatarUrl : `/api/image-proxy?url=${encodeURIComponent(artist.avatarUrl)}`;
      } catch {
        avatarImg.src = artist.avatarUrl;
      }
    }
  }, [artist, computeSlotPosition]);

  // Place artworks on walls
  const placeArtworks = useCallback((scene: THREE.Scene) => {
    const allSlots: { wallId: string; position: number }[] = [];
    layout.cells.forEach((cell) => {
      cell.artworkSlots.forEach((slot) => {
        allSlots.push(slot);
      });
    });
    allSlots.sort((a, b) => a.position - b.position);

    const hasPoster = isLightTheme && artist;
    let artworkIndex = 0;
    const zones: { x: number; z: number; normalX: number; normalZ: number }[] = [];

    for (let i = 0; i < allSlots.length; i++) {
      const slot = allSlots[i];

      if (i === 0 && hasPoster) {
        createArtistPoster(scene, slot.wallId);
        const posterPos = computeSlotPosition(slot.wallId);
        const dir = slot.wallId.split("-")[2];
        zones.push({
          x: posterPos.x, z: posterPos.z,
          normalX: dir === "east" ? -1 : dir === "west" ? 1 : 0,
          normalZ: dir === "north" ? -1 : dir === "south" ? 1 : 0,
        });
        continue;
      }

      if (artworkIndex >= artworks.length) continue;
      const artwork = artworks[artworkIndex];
      artworkIndex++;

      const maxArtSize = 1.8;
      const dims = artworkScale(artwork.dimensions, maxArtSize);
      const artworkGeometry = new THREE.PlaneGeometry(dims.w, dims.h);
      const pos = computeSlotPosition(slot.wallId);
      const dir = slot.wallId.split("-")[2];
      zones.push({
        x: pos.x, z: pos.z,
        normalX: dir === "east" ? -1 : dir === "west" ? 1 : 0,
        normalZ: dir === "north" ? -1 : dir === "south" ? 1 : 0,
      });

      const placeholderMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xcccccc,
        roughness: 0.5,
      });
      const artworkMesh = new THREE.Mesh(artworkGeometry, placeholderMaterial);
      artworkMesh.position.set(pos.x, WALL_HEIGHT / 2, pos.z);
      artworkMesh.rotation.y = pos.rotY;
      artworkMesh.translateZ(0.06);
      scene.add(artworkMesh);
      artworkMeshesRef.current.set(artwork.id, { mesh: artworkMesh, artwork });

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const texture = new THREE.Texture(img);
        texture.needsUpdate = true;
        texture.colorSpace = THREE.SRGBColorSpace;
        artworkMesh.material = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.3,
        });
      };
      const imgUrl = artwork.imageUrl;
      try {
        const u = new URL(imgUrl);
        const host = u.hostname.toLowerCase();
        const isCorsOk = host.includes("unsplash.com") || host === window.location.hostname;
        img.src = isCorsOk ? imgUrl : `/api/image-proxy?url=${encodeURIComponent(imgUrl)}`;
      } catch {
        img.src = imgUrl;
      }
    }
    artworkCollisionZones.current = zones;
  }, [layout, artworks, CELL_SIZE, isLightTheme, artist, computeSlotPosition, createArtistPoster]);

  // Setup lighting - minimal to avoid shader limits
  const setupLighting = useCallback((scene: THREE.Scene) => {
    const ambientLight = new THREE.AmbientLight(tmpl.ambientColor, tmpl.ambientIntensity);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(tmpl.directionalColor, tmpl.directionalIntensity);
    directionalLight.position.set(layout.width * CELL_SIZE / 2, WALL_HEIGHT * 2, layout.height * CELL_SIZE / 2);
    scene.add(directionalLight);

    const hemiLight = new THREE.HemisphereLight(tmpl.hemisphereColor, tmpl.hemisphereGroundColor, tmpl.hemisphereIntensity);
    scene.add(hemiLight);

    // Artwork spotlights — track-light fixtures with point lights
    const allSlots: { wallId: string; position: number }[] = [];
    layout.cells.forEach((cell) => cell.artworkSlots.forEach((s) => allSlots.push(s)));
    allSlots.sort((a, b) => a.position - b.position);

    const spotColor = isLightTheme ? 0xfff8f0 : 0xfff5e6;
    const spotIntensity = isLightTheme ? 2.0 : 3.0;
    const maxSpots = 20;

    for (let i = 0; i < Math.min(allSlots.length, maxSpots); i++) {
      const pos = computeSlotPosition(allSlots[i].wallId);
      const dir = allSlots[i].wallId.split("-")[2];
      // Offset light from wall towards room center
      const offsetDist = 0.5;
      let lx = pos.x, lz = pos.z;
      if (dir === "north") lz -= offsetDist;
      else if (dir === "south") lz += offsetDist;
      else if (dir === "east") lx -= offsetDist;
      else if (dir === "west") lx += offsetDist;

      // Track-light fixture (small cylinder on ceiling)
      const fixtureGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.08, 8);
      const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 });
      const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
      fixture.position.set(lx, WALL_HEIGHT - 0.04, lz);
      scene.add(fixture);

      // SpotLight aimed at artwork
      const spot = new THREE.SpotLight(spotColor, spotIntensity, 5, Math.PI / 6, 0.5, 1);
      spot.position.set(lx, WALL_HEIGHT - 0.1, lz);
      spot.target.position.set(pos.x, WALL_HEIGHT / 2, pos.z);
      scene.add(spot);
      scene.add(spot.target);
    }
  }, [layout, tmpl, CELL_SIZE, isLightTheme, computeSlotPosition]);

  // Template-specific decorative elements
  const addDecorations = useCallback((scene: THREE.Scene) => {
    const roomW = layout.width * CELL_SIZE;
    const roomH = layout.height * CELL_SIZE;
    const cx = roomW / 2;
    const cz = roomH / 2;

    // --- Shared helpers ---
    const addPottedPlant = (px: number, pz: number, scale = 1) => {
      // Terracotta pot
      const potMat = new THREE.MeshStandardMaterial({ color: 0xb5704f, roughness: 0.8 });
      const potR = 0.08 * scale, potH = 0.12 * scale;
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(potR, potR * 0.75, potH, 10), potMat);
      pot.position.set(px, potH / 2, pz);
      scene.add(pot);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(potR, 0.01 * scale, 6, 10), potMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(px, potH, pz);
      scene.add(rim);
      // Soil
      const soilMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 1.0 });
      const soil = new THREE.Mesh(new THREE.CylinderGeometry(potR * 0.9, potR * 0.9, 0.02, 10), soilMat);
      soil.position.set(px, potH - 0.01, pz);
      scene.add(soil);
      // Foliage — layered spheres
      const leafMats = [
        new THREE.MeshStandardMaterial({ color: 0x3a7a2a, roughness: 0.85 }),
        new THREE.MeshStandardMaterial({ color: 0x4a8a38, roughness: 0.85 }),
        new THREE.MeshStandardMaterial({ color: 0x2e6e22, roughness: 0.85 }),
      ];
      const leafR = 0.1 * scale;
      const baseY = potH + leafR * 0.6;
      for (let li = 0; li < 5; li++) {
        const r = leafR * (0.6 + Math.random() * 0.5);
        const ang = (li / 5) * Math.PI * 2;
        const ox = Math.cos(ang) * leafR * 0.4;
        const oz = Math.sin(ang) * leafR * 0.4;
        const oy = Math.random() * leafR * 0.5;
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), leafMats[li % 3]);
        leaf.scale.set(1, 0.7 + Math.random() * 0.3, 1);
        leaf.position.set(px + ox, baseY + oy, pz + oz);
        scene.add(leaf);
      }
    };

    // --- Baseboards (all templates except outdoor) ---
    if (tmpl.id !== "outdoor") {
      const baseH = tmpl.id === "classical" || tmpl.id === "luxury" ? 0.12 : 0.08;
      const baseD = 0.025;
      const baseColor = tmpl.id === "luxury" ? 0x8b7340 :
                         tmpl.id === "classical" ? 0x6b5030 :
                         tmpl.id === "industrial" || tmpl.id === "industrial-new" ? 0x3a3a3a :
                         tmpl.id === "futuristic" ? 0xd0d8e8 :
                         tmpl.wallColor;
      const baseMat = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: tmpl.id === "luxury" ? 0.3 : 0.7,
        metalness: tmpl.id === "luxury" || tmpl.id === "industrial" || tmpl.id === "industrial-new" ? 0.4 : 0,
      });
      const addBaseboard = (w: number, d: number, x: number, z: number) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, baseH, d), baseMat);
        mesh.position.set(x, baseH / 2, z);
        scene.add(mesh);
      };
      addBaseboard(roomW, baseD, cx, 0);
      addBaseboard(roomW, baseD, cx, roomH);
      addBaseboard(baseD, roomH, 0, cz);
      addBaseboard(baseD, roomH, roomW, cz);

      // Top trim strip on baseboard for classical/luxury
      if (tmpl.id === "classical" || tmpl.id === "luxury") {
        const trimMat = new THREE.MeshStandardMaterial({
          color: tmpl.id === "luxury" ? 0xd4a854 : 0xc4a878,
          metalness: tmpl.id === "luxury" ? 0.5 : 0.1,
          roughness: 0.35,
        });
        const trimH = 0.015;
        const addTrim = (w: number, d: number, x: number, z: number) => {
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, trimH, d + 0.005), trimMat);
          mesh.position.set(x, baseH + trimH / 2, z);
          scene.add(mesh);
        };
        addTrim(roomW, baseD, cx, 0);
        addTrim(roomW, baseD, cx, roomH);
        addTrim(baseD, roomH, 0, cz);
        addTrim(baseD, roomH, roomW, cz);
      }
    }

    // =================================================================
    // CONTEMPORARY — minimalist bench, potted plant, thin picture rail
    // =================================================================
    if (tmpl.id === "contemporary") {
      // Bench — wooden seat on black steel frame
      const seatMat = new THREE.MeshStandardMaterial({ color: 0xb89070, roughness: 0.5 });
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.42), seatMat);
      seat.position.set(cx, 0.44, cz);
      scene.add(seat);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.3 });
      // U-shaped steel legs
      for (const dx of [-0.55, 0.55]) {
        for (const dz of [-0.18, 0.18]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.03), frameMat);
          leg.position.set(cx + dx, 0.21, cz + dz);
          scene.add(leg);
        }
        const crossBar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.36), frameMat);
        crossBar.position.set(cx + dx, 0.015, cz);
        scene.add(crossBar);
      }
      // Potted plant near entrance
      addPottedPlant(CELL_SIZE * 0.5, CELL_SIZE * 0.5, 1.1);
      // Picture rail (thin horizontal line near ceiling)
      const railMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.3, roughness: 0.4 });
      for (const [w, d, x, z] of [[roomW, 0.005, cx, 0.01], [roomW, 0.005, cx, roomH - 0.01], [0.005, roomH, 0.01, cz], [0.005, roomH, roomW - 0.01, cz]] as [number, number, number, number][]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.015, d), railMat);
        rail.position.set(x, WALL_HEIGHT - 0.25, z);
        scene.add(rail);
      }
    }

    // =================================================================
    // CLASSICAL — fluted columns, crown molding, wall panels, chandelier
    // =================================================================
    if (tmpl.id === "classical") {
      // Crown molding — two-layer profile
      const moldMat = new THREE.MeshStandardMaterial({ color: 0xd4b896, roughness: 0.45, metalness: 0.05 });
      const addMolding = (w: number, d: number, x: number, z: number) => {
        const m1 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), moldMat);
        m1.position.set(x, WALL_HEIGHT - 0.025, z);
        scene.add(m1);
        const m2 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d + 0.02), moldMat);
        m2.position.set(x, WALL_HEIGHT - 0.065, z);
        scene.add(m2);
      };
      addMolding(roomW, 0.06, cx, 0);
      addMolding(roomW, 0.06, cx, roomH);
      addMolding(0.06, roomH, 0, cz);
      addMolding(0.06, roomH, roomW, cz);

      // Fluted columns in corners
      const colMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.35 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xc8a855, metalness: 0.5, roughness: 0.3 });
      const colR = 0.09;
      const corners = [
        [CELL_SIZE * 0.55, CELL_SIZE * 0.55],
        [roomW - CELL_SIZE * 0.55, CELL_SIZE * 0.55],
        [CELL_SIZE * 0.55, roomH - CELL_SIZE * 0.55],
        [roomW - CELL_SIZE * 0.55, roomH - CELL_SIZE * 0.55],
      ];
      for (const [px, pz] of corners) {
        // Column shaft
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(colR, colR * 1.05, WALL_HEIGHT - 0.4, 16), colMat);
        shaft.position.set(px, WALL_HEIGHT / 2, pz);
        scene.add(shaft);
        // Fluting — 8 thin indentations
        for (let fi = 0; fi < 8; fi++) {
          const ang = (fi / 8) * Math.PI * 2;
          const fx = px + Math.cos(ang) * (colR + 0.003);
          const fz = pz + Math.sin(ang) * (colR + 0.003);
          const flute = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, WALL_HEIGHT - 0.5, 4), colMat);
          flute.position.set(fx, WALL_HEIGHT / 2, fz);
          scene.add(flute);
        }
        // Ionic-style capital
        const capBase = new THREE.Mesh(new THREE.CylinderGeometry(colR * 1.5, colR, 0.08, 16), colMat);
        capBase.position.set(px, WALL_HEIGHT - 0.24, pz);
        scene.add(capBase);
        const capTop = new THREE.Mesh(new THREE.BoxGeometry(colR * 3.2, 0.04, colR * 3.2), colMat);
        capTop.position.set(px, WALL_HEIGHT - 0.18, pz);
        scene.add(capTop);
        // Gold ring accent
        const ring = new THREE.Mesh(new THREE.TorusGeometry(colR * 1.05, 0.01, 8, 16), goldMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(px, WALL_HEIGHT - 0.28, pz);
        scene.add(ring);
        // Base — stepped plinth
        const base1 = new THREE.Mesh(new THREE.BoxGeometry(colR * 3.2, 0.06, colR * 3.2), colMat);
        base1.position.set(px, 0.03, pz);
        scene.add(base1);
        const base2 = new THREE.Mesh(new THREE.CylinderGeometry(colR * 1.3, colR * 1.5, 0.08, 16), colMat);
        base2.position.set(px, 0.1, pz);
        scene.add(base2);
      }

      // Simple chandelier in center
      const chanMat = new THREE.MeshStandardMaterial({ color: 0xc8a855, metalness: 0.6, roughness: 0.25 });
      // Central rod
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 8), chanMat);
      rod.position.set(cx, WALL_HEIGHT - 0.2, cz);
      scene.add(rod);
      // Ring
      const chanRing = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.015, 8, 24), chanMat);
      chanRing.rotation.x = Math.PI / 2;
      chanRing.position.set(cx, WALL_HEIGHT - 0.4, cz);
      scene.add(chanRing);
      // Candle holders
      for (let ci = 0; ci < 6; ci++) {
        const ang = (ci / 6) * Math.PI * 2;
        const candleX = cx + Math.cos(ang) * 0.25;
        const candleZ = cz + Math.sin(ang) * 0.25;
        const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.06, 6), chanMat);
        holder.position.set(candleX, WALL_HEIGHT - 0.43, candleZ);
        scene.add(holder);
        // Candle glow
        const glowMat = new THREE.MeshStandardMaterial({ color: 0xffeedd, emissive: 0xffcc88, emissiveIntensity: 0.6 });
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), glowMat);
        glow.position.set(candleX, WALL_HEIGHT - 0.39, candleZ);
        scene.add(glow);
      }
    }

    // =================================================================
    // INDUSTRIAL — pipes, ducts, junction boxes, concrete pillar, crate
    // =================================================================
    if (tmpl.id === "industrial") {
      const pipeMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.85, roughness: 0.3 });
      const rustMat = new THREE.MeshStandardMaterial({ color: 0x7a5533, metalness: 0.5, roughness: 0.7 });
      const pipeR = 0.04;
      // Main pipes along ceiling
      for (const xOff of [roomW * 0.25, roomW * 0.75]) {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(pipeR, pipeR, roomH, 10), pipeMat);
        pipe.rotation.x = Math.PI / 2;
        pipe.position.set(xOff, WALL_HEIGHT - 0.12, cz);
        scene.add(pipe);
        // Elbow joints at ends
        for (const endZ of [0.1, roomH - 0.1]) {
          const elbow = new THREE.Mesh(new THREE.SphereGeometry(pipeR * 1.3, 8, 8), pipeMat);
          elbow.position.set(xOff, WALL_HEIGHT - 0.12, endZ);
          scene.add(elbow);
          // Vertical drop
          const drop = new THREE.Mesh(new THREE.CylinderGeometry(pipeR * 0.9, pipeR * 0.9, 0.3, 8), pipeMat);
          drop.position.set(xOff, WALL_HEIGHT - 0.27, endZ);
          scene.add(drop);
        }
        // Brackets with bolts
        for (let z = CELL_SIZE; z < roomH; z += CELL_SIZE * 1.5) {
          const bracket = new THREE.Mesh(new THREE.TorusGeometry(pipeR + 0.02, 0.012, 6, 12, Math.PI), rustMat);
          bracket.rotation.y = Math.PI / 2;
          bracket.position.set(xOff, WALL_HEIGHT - 0.12, z);
          scene.add(bracket);
          // Bolt on bracket
          const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 6), pipeMat);
          bolt.position.set(xOff, WALL_HEIGHT - 0.06, z);
          scene.add(bolt);
        }
      }
      // Rectangular duct across ceiling
      const ductMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.7, roughness: 0.4 });
      const duct = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, roomH * 0.6), ductMat);
      duct.position.set(cx, WALL_HEIGHT - 0.08, cz);
      scene.add(duct);
      // Duct seam rivets
      for (let z = cz - roomH * 0.25; z < cz + roomH * 0.25; z += 0.3) {
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.008, 4, 4), pipeMat);
        rivet.position.set(cx - 0.126, WALL_HEIGHT - 0.08, z);
        scene.add(rivet);
      }
      // Junction box on wall
      const boxMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.6, roughness: 0.5 });
      const jbox = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.08), boxMat);
      jbox.position.set(roomW - 0.05, 1.8, CELL_SIZE);
      scene.add(jbox);
      // Conduit from junction box
      const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 6), pipeMat);
      conduit.position.set(roomW - 0.05, 2.3, CELL_SIZE);
      scene.add(conduit);
      // Wooden shipping crate
      const crateMat = new THREE.MeshStandardMaterial({ color: 0x9a8060, roughness: 0.85 });
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.35), crateMat);
      crate.position.set(CELL_SIZE * 0.5, 0.175, roomH - CELL_SIZE * 0.5);
      scene.add(crate);
      // Crate slats
      const slatMat = new THREE.MeshStandardMaterial({ color: 0x8a7050, roughness: 0.9 });
      for (const dx of [-0.15, 0, 0.15]) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.36, 0.005), slatMat);
        slat.position.set(CELL_SIZE * 0.5 + dx, 0.175, roomH - CELL_SIZE * 0.5 + 0.178);
        scene.add(slat);
      }
    }

    // =================================================================
    // INDUSTRIAL-NEW — skylight ceiling panels, strip lights, wood bench
    // Inspired by modern concrete museum galleries (Tadao Ando style)
    // =================================================================
    if (tmpl.id === "industrial-new") {
      const steelMat = new THREE.MeshStandardMaterial({ color: 0x808080, metalness: 0.85, roughness: 0.25 });
      const skylightMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: 0xeeeeff, emissiveIntensity: 0.6,
        transparent: true, opacity: 0.85, roughness: 0.1,
      });

      // Skylight panels — angled glass panels along ceiling edges
      const panelCount = Math.max(3, Math.floor(roomW / 1.2));
      const panelW = (roomW - 0.3) / panelCount;
      for (let i = 0; i < panelCount; i++) {
        const px = 0.15 + panelW * i + panelW / 2;
        // Glass panel
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(panelW - 0.06, 0.8), skylightMat);
        glass.rotation.x = Math.PI / 2 + 0.2; // slight angle
        glass.position.set(px, WALL_HEIGHT - 0.05, 0.5);
        scene.add(glass);
        // Matching panel on opposite side
        const glass2 = new THREE.Mesh(new THREE.PlaneGeometry(panelW - 0.06, 0.8), skylightMat);
        glass2.rotation.x = Math.PI / 2 - 0.2;
        glass2.position.set(px, WALL_HEIGHT - 0.05, roomH - 0.5);
        scene.add(glass2);
        // Steel frame dividers
        if (i > 0) {
          const divider = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.85), steelMat);
          divider.position.set(0.15 + panelW * i, WALL_HEIGHT - 0.02, 0.5);
          scene.add(divider);
          const divider2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.85), steelMat);
          divider2.position.set(0.15 + panelW * i, WALL_HEIGHT - 0.02, roomH - 0.5);
          scene.add(divider2);
        }
      }
      // Steel frame rails along skylight edges
      for (const z of [0.1, 0.9, roomH - 0.9, roomH - 0.1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(roomW - 0.2, 0.03, 0.03), steelMat);
        rail.position.set(cx, WALL_HEIGHT - 0.015, z);
        scene.add(rail);
      }

      // Industrial strip lights — long tube fixtures near ceiling
      const stripMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.4,
      });
      const stripHousingMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.4 });
      for (const xOff of [roomW * 0.3, roomW * 0.7]) {
        // Housing
        const housing = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, roomH * 0.7), stripHousingMat);
        housing.position.set(xOff, WALL_HEIGHT - 0.05, cz);
        scene.add(housing);
        // Light tube
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, roomH * 0.65, 6), stripMat);
        tube.rotation.x = Math.PI / 2;
        tube.position.set(xOff, WALL_HEIGHT - 0.08, cz);
        scene.add(tube);
        // Point light for actual illumination from strip
        const stripLight = new THREE.PointLight(0xffffff, 0.5, roomW);
        stripLight.position.set(xOff, WALL_HEIGHT - 0.15, cz);
        scene.add(stripLight);
      }

      // Light wood bench — centered, matching the reference image
      const benchWoodMat = new THREE.MeshStandardMaterial({ color: 0xc8aa78, roughness: 0.45 });
      const benchLegMat = new THREE.MeshStandardMaterial({ color: 0xb89a68, roughness: 0.5 });
      const benchW = 1.8, benchD = 0.45, benchH = 0.42, seatThick = 0.04;
      // Seat — planked appearance (3 planks)
      for (let pi = 0; pi < 3; pi++) {
        const plankD = benchD / 3 - 0.01;
        const plank = new THREE.Mesh(new THREE.BoxGeometry(benchW, seatThick, plankD), benchWoodMat);
        plank.position.set(cx, benchH, cz + (pi - 1) * (benchD / 3));
        scene.add(plank);
      }
      // Legs — simple rectangular, inset
      const legW = 0.06, legD = benchD - 0.06;
      for (const dx of [-benchW / 2 + 0.12, benchW / 2 - 0.12]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(legW, benchH - seatThick, legD), benchLegMat);
        leg.position.set(cx + dx, (benchH - seatThick) / 2, cz);
        scene.add(leg);
      }

    }

    // =================================================================
    // LUXURY — gold accents, pedestal with vase, velvet rope, plant
    // =================================================================
    if (tmpl.id === "luxury") {
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a854, metalness: 0.65, roughness: 0.2 });
      // Double gold accent strips
      for (const y of [WALL_HEIGHT * 0.36, WALL_HEIGHT * 0.40]) {
        for (const [w, d, x, z] of [[roomW, 0.015, cx, 0.008], [roomW, 0.015, cx, roomH - 0.008], [0.015, roomH, 0.008, cz], [0.015, roomH, roomW - 0.008, cz]] as [number, number, number, number][]) {
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), goldMat);
          mesh.position.set(x, y, z);
          scene.add(mesh);
        }
      }
      // Marble pedestal with vase
      const pedMat = new THREE.MeshStandardMaterial({ color: 0xf0e8d8, roughness: 0.25 });
      // Stepped pedestal
      const pedSteps = [
        { r1: 0.28, r2: 0.3, h: 0.06, y: 0.03 },
        { r1: 0.22, r2: 0.28, h: 0.06, y: 0.09 },
        { r1: 0.18, r2: 0.18, h: 0.65, y: 0.445 },
        { r1: 0.24, r2: 0.18, h: 0.04, y: 0.795 },
      ];
      for (const s of pedSteps) {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(s.r1, s.r2, s.h, 16), pedMat);
        mesh.position.set(cx, s.y, cz);
        scene.add(mesh);
      }
      // Gold ring on pedestal top
      const pedRing = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.01, 8, 20), goldMat);
      pedRing.rotation.x = Math.PI / 2;
      pedRing.position.set(cx, 0.815, cz);
      scene.add(pedRing);
      // Decorative vase on pedestal
      const vaseMat = new THREE.MeshStandardMaterial({ color: 0xf8f4ee, roughness: 0.15, metalness: 0.05 });
      // Vase body — LatheGeometry for realistic profile
      const vasePoints = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.06, 0),
        new THREE.Vector2(0.08, 0.02),
        new THREE.Vector2(0.09, 0.08),
        new THREE.Vector2(0.07, 0.18),
        new THREE.Vector2(0.05, 0.22),
        new THREE.Vector2(0.04, 0.24),
        new THREE.Vector2(0.05, 0.26),
        new THREE.Vector2(0.055, 0.27),
        new THREE.Vector2(0.05, 0.28),
      ];
      const vaseGeo = new THREE.LatheGeometry(vasePoints, 16);
      const vase = new THREE.Mesh(vaseGeo, vaseMat);
      vase.position.set(cx, 0.82, cz);
      scene.add(vase);
      // Gold band on vase
      const vBand = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.005, 6, 16), goldMat);
      vBand.rotation.x = Math.PI / 2;
      vBand.position.set(cx, 0.92, cz);
      scene.add(vBand);
      // Potted plants by entrance
      addPottedPlant(CELL_SIZE * 0.4, CELL_SIZE * 0.4, 1.3);
      addPottedPlant(roomW - CELL_SIZE * 0.4, CELL_SIZE * 0.4, 1.3);
    }

    // =================================================================
    // FUTURISTIC — LED strips, ceiling panels, floating bench, holo ring
    // =================================================================
    if (tmpl.id === "futuristic") {
      const ledMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x4488ff, emissiveIntensity: 0.8 });
      const ledH = 0.02, ledD = 0.01;
      // Floor LED strips
      for (const [w, d, x, z] of [[roomW, ledD, cx, 0.005], [roomW, ledD, cx, roomH - 0.005], [ledD, roomH, 0.005, cz], [ledD, roomH, roomW - 0.005, cz]] as [number, number, number, number][]) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, ledH, d), ledMat);
        mesh.position.set(x, ledH / 2, z);
        scene.add(mesh);
      }
      // Ceiling LED strips (secondary color)
      const ledMat2 = new THREE.MeshStandardMaterial({ color: 0x88aaff, emissive: 0x6688dd, emissiveIntensity: 0.4 });
      for (const [w, d, x, z] of [[roomW, ledD, cx, 0.005], [roomW, ledD, cx, roomH - 0.005], [ledD, roomH, 0.005, cz], [ledD, roomH, roomW - 0.005, cz]] as [number, number, number, number][]) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, ledH, d), ledMat2);
        mesh.position.set(x, WALL_HEIGHT - ledH / 2, z);
        scene.add(mesh);
      }
      // Ceiling light panels with frame
      const panelMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xddeeff, emissiveIntensity: 0.5 });
      const frameMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, metalness: 0.5, roughness: 0.2 });
      for (let x = CELL_SIZE; x < roomW - CELL_SIZE / 2; x += CELL_SIZE * 2) {
        const pw = CELL_SIZE * 0.8;
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(pw, pw), panelMat);
        panel.rotation.x = Math.PI / 2;
        panel.position.set(x, WALL_HEIGHT - 0.01, cz);
        scene.add(panel);
        // Frame around panel
        for (const [fw, fd, fx, fz] of [[pw + 0.04, 0.02, 0, -pw / 2], [pw + 0.04, 0.02, 0, pw / 2], [0.02, pw, -pw / 2, 0], [0.02, pw, pw / 2, 0]] as [number, number, number, number][]) {
          const fr = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.02, fd), frameMat);
          fr.position.set(x + fx, WALL_HEIGHT - 0.02, cz + fz);
          scene.add(fr);
        }
      }
      // Floating bench — glossy white slab on chrome supports
      const benchMat = new THREE.MeshStandardMaterial({ color: 0xf0f3ff, roughness: 0.05, metalness: 0.1 });
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.4), benchMat);
      bench.position.set(cx, 0.44, cz);
      scene.add(bench);
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xddddee, metalness: 0.9, roughness: 0.1 });
      for (const dx of [-0.45, 0.45]) {
        const sup = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.35), chromeMat);
        sup.position.set(cx + dx, 0.21, cz);
        scene.add(sup);
      }
    }

    // =================================================================
    // JAPANESE — zen garden, bonsai, bamboo, low wooden table, shoji
    // =================================================================
    if (tmpl.id === "japanese") {
      // Zen rock garden in corner — sand base with raked circles
      const sandMat = new THREE.MeshStandardMaterial({ color: 0xd8cdb8, roughness: 0.95 });
      const gardenX = CELL_SIZE * 0.6, gardenZ = CELL_SIZE * 0.6;
      const sandBase = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.02, 20), sandMat);
      sandBase.position.set(gardenX, 0.01, gardenZ);
      scene.add(sandBase);
      // Raked circle lines in sand
      const rakeMat = new THREE.MeshStandardMaterial({ color: 0xccc0a8, roughness: 1 });
      for (const r of [0.15, 0.25, 0.35]) {
        const rake = new THREE.Mesh(new THREE.TorusGeometry(r, 0.004, 4, 24), rakeMat);
        rake.rotation.x = Math.PI / 2;
        rake.position.set(gardenX, 0.025, gardenZ);
        scene.add(rake);
      }
      // Zen stones — varied shapes
      const stoneMats = [
        new THREE.MeshStandardMaterial({ color: 0x6a6458, roughness: 0.92 }),
        new THREE.MeshStandardMaterial({ color: 0x7a7268, roughness: 0.88 }),
        new THREE.MeshStandardMaterial({ color: 0x5a5850, roughness: 0.95 }),
      ];
      const stones = [
        { x: 0, z: 0, r: 0.07, sy: 0.8, sz: 0.7 },
        { x: 0.1, z: 0.08, r: 0.05, sy: 0.6, sz: 0.9 },
        { x: -0.06, z: 0.1, r: 0.04, sy: 0.5, sz: 1.1 },
      ];
      for (let si = 0; si < stones.length; si++) {
        const s = stones[si];
        const stone = new THREE.Mesh(new THREE.SphereGeometry(s.r, 8, 6), stoneMats[si]);
        stone.scale.set(1, s.sy, s.sz);
        stone.position.set(gardenX + s.x, s.r * s.sy * 0.9 + 0.02, gardenZ + s.z);
        scene.add(stone);
      }
      // Bonsai tree on opposite corner
      const bonsaiX = roomW - CELL_SIZE * 0.6, bonsaiZ = roomH - CELL_SIZE * 0.6;
      // Pot
      const bonsaiPotMat = new THREE.MeshStandardMaterial({ color: 0x3a5a4a, roughness: 0.7 });
      const bonsaiPot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.06, 12), bonsaiPotMat);
      bonsaiPot.position.set(bonsaiX, 0.03, bonsaiZ);
      scene.add(bonsaiPot);
      // Trunk — curved
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.85 });
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.2, 6), trunkMat);
      trunk.position.set(bonsaiX, 0.16, bonsaiZ);
      trunk.rotation.z = 0.15;
      scene.add(trunk);
      // Canopy layers
      const canopyMat = new THREE.MeshStandardMaterial({ color: 0x2a6a2a, roughness: 0.9 });
      for (const [dx, dy, dz, r] of [[0.03, 0.26, 0, 0.08], [-0.02, 0.3, 0.03, 0.06], [0.05, 0.28, -0.02, 0.05]] as [number, number, number, number][]) {
        const canopy = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), canopyMat);
        canopy.scale.set(1.3, 0.6, 1.2);
        canopy.position.set(bonsaiX + dx, dy, bonsaiZ + dz);
        scene.add(canopy);
      }
      // Bamboo cluster near wall
      const bambooMats = [
        new THREE.MeshStandardMaterial({ color: 0x6b8e4e, roughness: 0.65 }),
        new THREE.MeshStandardMaterial({ color: 0x5d7e42, roughness: 0.7 }),
      ];
      for (const wallX of [CELL_SIZE * 0.25, roomW - CELL_SIZE * 0.25]) {
        for (let bi = 0; bi < 5; bi++) {
          const bx = wallX + (bi - 2) * 0.06;
          const bz = cz + (bi % 2 - 0.5) * 0.08;
          const bh = WALL_HEIGHT * (0.7 + Math.random() * 0.2);
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, bh, 8), bambooMats[bi % 2]);
          pole.position.set(bx, bh / 2, bz);
          scene.add(pole);
          // Bamboo nodes
          const nodeMat = new THREE.MeshStandardMaterial({ color: 0x5a7a3e, roughness: 0.6 });
          for (let ny = 0.3; ny < bh - 0.2; ny += 0.35 + Math.random() * 0.1) {
            const node = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.004, 4, 8), nodeMat);
            node.rotation.x = Math.PI / 2;
            node.position.set(bx, ny, bz);
            scene.add(node);
          }
        }
      }
      // Low wooden table/platform in center
      const tableMat = new THREE.MeshStandardMaterial({ color: 0xa08060, roughness: 0.6 });
      const tableTop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.35), tableMat);
      tableTop.position.set(cx, 0.22, cz);
      scene.add(tableTop);
      for (const [dx, dz] of [[-0.25, -0.13], [0.25, -0.13], [-0.25, 0.13], [0.25, 0.13]]) {
        const tleg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.03), tableMat);
        tleg.position.set(cx + dx, 0.1, cz + dz);
        scene.add(tleg);
      }
    }

  }, [layout, tmpl, CELL_SIZE, WALL_HEIGHT]);

  // Collision detection
  const checkCollision = useCallback((position: THREE.Vector3): boolean => {
    const margin = 0.3;
    const artworkMinDist = 0.2;
    
    for (const zone of artworkCollisionZones.current) {
      const dx = position.x - zone.x;
      const dz = position.z - zone.z;
      const dotNormal = dx * zone.normalX + dz * zone.normalZ;
      const keepOut = 0.06 + artworkMinDist;
      if (dotNormal > 0 && dotNormal < keepOut) {
        const tangentDist = Math.abs(dx * zone.normalZ - dz * zone.normalX);
        if (tangentDist < CELL_SIZE / 2) return true;
      }
    }
    
    for (const cell of layout.cells) {
      const baseX = cell.x * CELL_SIZE;
      const baseZ = cell.z * CELL_SIZE;
      
      // Check if player is in this cell's area
      if (position.x >= baseX - margin && position.x <= baseX + CELL_SIZE + margin &&
          position.z >= baseZ - margin && position.z <= baseZ + CELL_SIZE + margin) {
        
        // Check wall collisions
        if (cell.walls.north && position.z > baseZ + CELL_SIZE - margin) {
          if (position.x > baseX && position.x < baseX + CELL_SIZE) return true;
        }
        if (cell.walls.south && position.z < baseZ + margin) {
          if (position.x > baseX && position.x < baseX + CELL_SIZE) return true;
        }
        if (cell.walls.east && position.x > baseX + CELL_SIZE - margin) {
          if (position.z > baseZ && position.z < baseZ + CELL_SIZE) return true;
        }
        if (cell.walls.west && position.x < baseX + margin) {
          if (position.z > baseZ && position.z < baseZ + CELL_SIZE) return true;
        }
      }
    }
    
    // Boundary collision
    if (position.x < 0.3 || position.x > layout.width * CELL_SIZE - 0.3 ||
        position.z < 0.3 || position.z > layout.height * CELL_SIZE - 0.3) {
      return true;
    }
    
    return false;
  }, [layout, CELL_SIZE]);

  const showArtistDialogRef = useRef(false);
  showArtistDialogRef.current = showArtistDialog;
  const onExitGalleryRef = useRef(onExitGallery);
  onExitGalleryRef.current = onExitGallery;

  const handleClick = useCallback((event: MouseEvent) => {
    if (!cameraRef.current || !sceneRef.current || !isPointerLockedRef.current) return;

    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);
    raycaster.setFromCamera(center, cameraRef.current);

    if (doorMeshRef.current) {
      const doorIntersects = raycaster.intersectObject(doorMeshRef.current);
      if (doorIntersects.length > 0 && doorIntersects[0].distance < 3) {
        document.exitPointerLock();
        if (onExitGalleryRef.current) {
          onExitGalleryRef.current();
        }
        return;
      }
    }

    if (posterMeshRef.current) {
      const posterIntersects = raycaster.intersectObject(posterMeshRef.current);
      if (posterIntersects.length > 0) {
        setShowArtistDialog(true);
        document.exitPointerLock();
        return;
      }
    }

    const meshes = Array.from(artworkMeshesRef.current.values()).map(v => v.mesh);
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const entries = Array.from(artworkMeshesRef.current.entries());
      for (const [id, data] of entries) {
        if (data.mesh === mesh) {
          setSelectedArtwork(data.artwork);
          document.exitPointerLock();
          break;
        }
      }
    }
  }, []);

  // Initialize Three.js
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Check for WebGL support
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
      setWebglError("WebGL is not supported in your browser. Please use the Classic view mode.");
      return;
    }

    // Scene
    const scene = new THREE.Scene();
    const bgColor = tmpl.backgroundColor;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.Fog(bgColor, tmpl.fogNear, tmpl.fogFar);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
    camera.position.set(
      layout.spawnPoint.x * CELL_SIZE + CELL_SIZE / 2,
      PLAYER_HEIGHT,
      layout.spawnPoint.z * CELL_SIZE + CELL_SIZE / 2
    );
    if (isLightTheme) {
      euler.current.y = Math.PI;
      camera.rotation.set(euler.current.x, euler.current.y, 0);
    }
    cameraRef.current = camera;

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, failIfMajorPerformanceCaveat: false });
    } catch (e) {
      setWebglError("Failed to create WebGL context. Please use the Classic view mode.");
      return;
    }
    
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create the maze
    createMaze(scene);
    placeArtworks(scene);
    setupLighting(scene);
    addDecorations(scene);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      if (isPointerLockedRef.current && cameraRef.current) {
        const camera = cameraRef.current;
        const direction = new THREE.Vector3();

        // Get forward/right vectors
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        right.y = 0;
        right.normalize();

        // Apply movement based on keys + mobile D-pad
        const mm = mobileMoveRef.current;
        if (keysPressed.current.has("KeyW") || keysPressed.current.has("ArrowUp") || mm.forward) {
          direction.add(forward);
        }
        if (keysPressed.current.has("KeyS") || keysPressed.current.has("ArrowDown") || mm.backward) {
          direction.sub(forward);
        }
        if (keysPressed.current.has("KeyA") || keysPressed.current.has("ArrowLeft") || mm.left) {
          direction.sub(right);
        }
        if (keysPressed.current.has("KeyD") || keysPressed.current.has("ArrowRight") || mm.right) {
          direction.add(right);
        }

        if (direction.length() > 0) {
          direction.normalize().multiplyScalar(MOVE_SPEED);
          
          const newPosition = camera.position.clone().add(direction);
          if (!checkCollision(newPosition)) {
            camera.position.copy(newPosition);
          }
        }
        
        // Update player position ref for minimap (no state update in loop)
        playerPosRef.current = {
          x: camera.position.x / CELL_SIZE,
          z: camera.position.z / CELL_SIZE,
          rotation: euler.current.y
        };
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [layout, artworks, tmpl, isLightTheme, CELL_SIZE, createMaze, placeArtworks, setupLighting, addDecorations, checkCollision]);

  // Pointer lock and controls (desktop + mobile touch)
  useEffect(() => {
    const movementKeys = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedArtworkRef.current) return;
      if (movementKeys.has(e.code) && isPointerLockedRef.current) {
        e.preventDefault();
      }
      keysPressed.current.add(e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (movementKeys.has(e.code)) {
        e.preventDefault();
      }
      keysPressed.current.delete(e.code);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPointerLockedRef.current || !cameraRef.current) return;

      euler.current.setFromQuaternion(cameraRef.current.quaternion);
      euler.current.y -= e.movementX * LOOK_SPEED;
      euler.current.x -= e.movementY * LOOK_SPEED;
      euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x));
      cameraRef.current.quaternion.setFromEuler(euler.current);
    };

    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === containerRef.current;
      isPointerLockedRef.current = locked;
      setIsPointerLocked(locked);
    };

    // Touch controls for mobile
    const handleTouchStart = (e: TouchEvent) => {
      if (!isPointerLockedRef.current || selectedArtworkRef.current) return;
      if (e.touches.length === 1) {
        touchLookRef.current = { lastX: e.touches[0].clientX, lastY: e.touches[0].clientY };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPointerLockedRef.current || !cameraRef.current || !touchLookRef.current) return;
      if (e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        const dx = touch.clientX - touchLookRef.current.lastX;
        const dy = touch.clientY - touchLookRef.current.lastY;
        touchLookRef.current = { lastX: touch.clientX, lastY: touch.clientY };

        euler.current.setFromQuaternion(cameraRef.current.quaternion);
        euler.current.y -= dx * LOOK_SPEED * 1.5;
        euler.current.x -= dy * LOOK_SPEED * 1.5;
        euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x));
        cameraRef.current.quaternion.setFromEuler(euler.current);
      }
    };

    const handleTouchEnd = () => {
      touchLookRef.current = null;
    };

    // Tap on artwork — raycast from touch position
    const handleTouchTap = (e: TouchEvent) => {
      if (!isPointerLockedRef.current || !cameraRef.current || !rendererRef.current) return;
      if (e.changedTouches.length !== 1) return;
      const touch = e.changedTouches[0];
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
      const meshes = Array.from(artworkMeshesRef.current.values()).map(d => d.mesh);
      const intersects = raycaster.intersectObjects(meshes);
      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const entries = Array.from(artworkMeshesRef.current.entries());
        for (const [, data] of entries) {
          if (data.mesh === hit) {
            setSelectedArtwork(data.artwork);
            break;
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    document.addEventListener("click", handleClick);

    const container = containerRef.current;
    if (container) {
      container.addEventListener("touchstart", handleTouchStart, { passive: false });
      container.addEventListener("touchmove", handleTouchMove, { passive: false });
      container.addEventListener("touchend", handleTouchEnd);
      container.addEventListener("touchend", handleTouchTap);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      document.removeEventListener("click", handleClick);
      if (container) {
        container.removeEventListener("touchstart", handleTouchStart);
        container.removeEventListener("touchmove", handleTouchMove);
        container.removeEventListener("touchend", handleTouchEnd);
        container.removeEventListener("touchend", handleTouchTap);
      }
    };
  }, [handleClick]);

  // Sync player position from ref to state at fixed interval (for minimap)
  useEffect(() => {
    if (!isPointerLocked) return;
    
    const interval = setInterval(() => {
      setPlayerPosition(prev => {
        const ref = playerPosRef.current;
        if (Math.abs(prev.x - ref.x) > 0.05 || 
            Math.abs(prev.z - ref.z) > 0.05 || 
            Math.abs(prev.rotation - ref.rotation) > 0.05) {
          return { ...ref };
        }
        return prev;
      });
    }, 100); // Update 10 times per second
    
    return () => clearInterval(interval);
  }, [isPointerLocked]);

  const requestPointerLock = () => {
    if (isMobile) {
      // Mobile: skip pointer lock, just enter gallery mode
      isPointerLockedRef.current = true;
      setIsPointerLocked(true);
      setShowControls(false);
    } else if (containerRef.current && typeof containerRef.current.requestPointerLock === 'function') {
      containerRef.current.requestPointerLock();
      setShowControls(false);
    } else {
      setShowControls(false);
      isPointerLockedRef.current = true;
      setIsPointerLocked(true);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Fallback UI when WebGL is not available
  if (webglError) {
    return (
      <div className="relative w-full bg-linear-to-b from-stone-900 to-black rounded-lg overflow-hidden flex items-center justify-center h-[60vh] min-h-[300px] max-h-[600px]" data-testid="webgl-fallback">
        <Card className="p-8 max-w-md text-center space-y-4">
          <Box className="w-16 h-16 mx-auto text-muted-foreground" />
          <h2 className="font-serif text-2xl font-bold">3D Gallery Unavailable</h2>
          <p className="text-muted-foreground">{webglError}</p>
          <p className="text-sm text-muted-foreground">
            Switch to Classic view to browse the gallery.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-lg overflow-hidden h-[60vh] min-h-[300px] max-h-[600px]">
      <div ref={containerRef} className="absolute inset-0 cursor-crosshair" style={{ zIndex: 0 }} />

      {/* Controls overlay */}
      {!isPointerLocked && !selectedArtwork && !showArtistDialog && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm" style={{ zIndex: 10 }}>
          <Card className="p-6 sm:p-8 max-w-md text-center space-y-4 sm:space-y-6 mx-4">
            <h2 className="font-serif text-xl sm:text-2xl font-bold">Virtual Gallery</h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              {isMobile
                ? "Explore a 3D art gallery. Drag to look around, use buttons to move."
                : "Walk through a 3D art gallery. Click anywhere to start exploring."}
            </p>

            {!isMobile && (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex flex-col items-center gap-2">
                  <Keyboard className="w-8 h-8 text-primary" />
                  <span>WASD / Arrows</span>
                  <span className="text-muted-foreground text-xs">Move</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Mouse className="w-8 h-8 text-primary" />
                  <span>Mouse</span>
                  <span className="text-muted-foreground text-xs">Look around</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <ZoomIn className="w-8 h-8 text-primary" />
                  <span>Click</span>
                  <span className="text-muted-foreground text-xs">View artwork</span>
                </div>
              </div>
            )}

            {isMobile && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex flex-col items-center gap-2">
                  <Hand className="w-8 h-8 text-primary" />
                  <span>Drag</span>
                  <span className="text-muted-foreground text-xs">Look around</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <ZoomIn className="w-8 h-8 text-primary" />
                  <span>Tap</span>
                  <span className="text-muted-foreground text-xs">View artwork</span>
                </div>
              </div>
            )}

            <Button
              size="lg"
              onClick={requestPointerLock}
              className="w-full"
              data-testid="button-enter-gallery"
            >
              <Move className="w-4 h-4 mr-2" />
              Enter Gallery
            </Button>

            {!isMobile && (
              <p className="text-xs text-muted-foreground">
                Press ESC to exit walking mode
              </p>
            )}
          </Card>
        </div>
      )}

      {/* HUD — desktop */}
      {isPointerLocked && !isMobile && (
        <div style={{ zIndex: 5 }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-4 h-4 border-2 border-white/50 rounded-full" />
          </div>
          <div className="absolute bottom-4 left-4 text-white/70 text-sm space-y-1">
            <p>WASD to move | Mouse to look</p>
            <p>Click artwork to view | ESC to pause</p>
          </div>
        </div>
      )}

      {/* Mobile D-pad + exit button */}
      {isPointerLocked && isMobile && (
        <div style={{ zIndex: 10 }}>
          {/* Exit button */}
          <Button
            size="sm"
            variant="secondary"
            className="absolute top-3 left-3 opacity-80"
            onClick={() => { isPointerLockedRef.current = false; setIsPointerLocked(false); mobileMoveRef.current = { forward: false, backward: false, left: false, right: false }; }}
          >
            <X className="w-4 h-4 mr-1" /> Exit
          </Button>

          {/* D-pad */}
          <div className="absolute bottom-6 left-6 select-none touch-none" style={{ zIndex: 15 }}>
            <div className="grid grid-cols-3 gap-1" style={{ width: "132px" }}>
              <div />
              <button
                className="w-11 h-11 rounded-lg bg-white/20 active:bg-white/40 flex items-center justify-center backdrop-blur-sm"
                onTouchStart={() => { mobileMoveRef.current.forward = true; }}
                onTouchEnd={() => { mobileMoveRef.current.forward = false; }}
                onTouchCancel={() => { mobileMoveRef.current.forward = false; }}
              ><ArrowUp className="w-5 h-5 text-white" /></button>
              <div />
              <button
                className="w-11 h-11 rounded-lg bg-white/20 active:bg-white/40 flex items-center justify-center backdrop-blur-sm"
                onTouchStart={() => { mobileMoveRef.current.left = true; }}
                onTouchEnd={() => { mobileMoveRef.current.left = false; }}
                onTouchCancel={() => { mobileMoveRef.current.left = false; }}
              ><ArrowLeft className="w-5 h-5 text-white" /></button>
              <button
                className="w-11 h-11 rounded-lg bg-white/20 active:bg-white/40 flex items-center justify-center backdrop-blur-sm"
                onTouchStart={() => { mobileMoveRef.current.backward = true; }}
                onTouchEnd={() => { mobileMoveRef.current.backward = false; }}
                onTouchCancel={() => { mobileMoveRef.current.backward = false; }}
              ><ArrowDown className="w-5 h-5 text-white" /></button>
              <button
                className="w-11 h-11 rounded-lg bg-white/20 active:bg-white/40 flex items-center justify-center backdrop-blur-sm"
                onTouchStart={() => { mobileMoveRef.current.right = true; }}
                onTouchEnd={() => { mobileMoveRef.current.right = false; }}
                onTouchCancel={() => { mobileMoveRef.current.right = false; }}
              ><ArrowRight className="w-5 h-5 text-white" /></button>
            </div>
          </div>

          {/* Look hint */}
          <div className="absolute bottom-6 right-6 text-white/50 text-xs text-right">
            <p>Drag to look</p>
            <p>Tap artwork to view</p>
          </div>
        </div>
      )}

      {/* Fullscreen button */}
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-4 right-4 text-white/70"
        onClick={toggleFullscreen}
        data-testid="button-fullscreen"
        style={{ zIndex: 5 }}
      >
        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
      </Button>

      {/* Minimap toggle button - only show when pointer locked */}
      {isPointerLocked && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-4 right-16 text-white/70"
          onClick={() => setShowMinimap(!showMinimap)}
          data-testid="button-toggle-minimap"
          style={{ zIndex: 5 }}
        >
          <MapIcon className="w-5 h-5" />
        </Button>
      )}

      {/* Minimap */}
      {showMinimap && isPointerLocked && (() => {
        // Calculate scale to keep minimap within max size
        const baseSize = 20;
        const maxMapSize = 150;
        const naturalWidth = layout.width * baseSize + 4;
        const naturalHeight = layout.height * baseSize + 4;
        const scale = Math.min(1, maxMapSize / Math.max(naturalWidth, naturalHeight));
        const cellSize = baseSize * scale;
        const mapWidth = layout.width * cellSize + 4;
        const mapHeight = layout.height * cellSize + 4;
        
        return (
        <div 
          className="absolute top-16 right-4 bg-black/70 rounded-lg p-2 border border-white/20"
          style={{ zIndex: 5 }}
          data-testid="minimap"
        >
          <svg 
            width={mapWidth} 
            height={mapHeight} 
            className="block"
          >
            {/* Background */}
            <rect 
              x={0} 
              y={0} 
              width={mapWidth} 
              height={mapHeight} 
              fill="rgba(30,30,30,0.8)" 
              rx={4}
            />
            
            {/* Cells and walls */}
            {layout.cells.map((cell) => {
              const cx = cell.x * cellSize + 2;
              const cz = cell.z * cellSize + 2;
              const hasArtwork = cell.artworkSlots && cell.artworkSlots.length > 0;
              
              return (
                <g key={`${cell.x}-${cell.z}`}>
                  {/* Cell floor */}
                  <rect
                    x={cx}
                    y={cz}
                    width={cellSize}
                    height={cellSize}
                    fill={hasArtwork ? "rgba(249, 115, 22, 0.3)" : "rgba(60,60,60,0.5)"}
                  />
                  
                  {/* Walls */}
                  {cell.walls.north && (
                    <line x1={cx} y1={cz} x2={cx + cellSize} y2={cz} stroke="#666" strokeWidth={1.5 * scale} />
                  )}
                  {cell.walls.south && (
                    <line x1={cx} y1={cz + cellSize} x2={cx + cellSize} y2={cz + cellSize} stroke="#666" strokeWidth={1.5 * scale} />
                  )}
                  {cell.walls.west && (
                    <line x1={cx} y1={cz} x2={cx} y2={cz + cellSize} stroke="#666" strokeWidth={1.5 * scale} />
                  )}
                  {cell.walls.east && (
                    <line x1={cx + cellSize} y1={cz} x2={cx + cellSize} y2={cz + cellSize} stroke="#666" strokeWidth={1.5 * scale} />
                  )}
                </g>
              );
            })}
            
            {/* Player position */}
            <g transform={`translate(${playerPosition.x * cellSize + 2 + cellSize/2}, ${playerPosition.z * cellSize + 2 + cellSize/2})`}>
              <g transform={`rotate(${(-playerPosition.rotation * 180 / Math.PI)})`}>
                <polygon 
                  points={`0,${-5*scale} ${3*scale},${3*scale} 0,${1.5*scale} ${-3*scale},${3*scale}`}
                  fill="hsl(var(--primary))"
                  stroke="#fff"
                  strokeWidth={1}
                />
              </g>
            </g>
          </svg>
          
          {/* Legend */}
          <div className="mt-2 text-xs text-white/60 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(249, 115, 22, 0.5)" }} />
              <span>Artwork</span>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Artwork detail panel - fits exactly within gallery */}
      {selectedArtwork && (
        <div className="absolute inset-0 flex bg-black/80 backdrop-blur-sm" style={{ zIndex: 50 }} data-testid="artwork-detail-panel">
          <div className="flex-1 relative min-w-0">
            <img
              src={selectedArtwork.imageUrl}
              alt={selectedArtwork.title}
              className="w-full h-full object-contain bg-black/40"
            />
          </div>
          <div className="w-64 flex flex-col bg-card p-4 gap-3 relative">
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2"
              onClick={() => {
                setSelectedArtwork(null);
                requestPointerLock();
              }}
              data-testid="button-close-artwork"
            >
              <X className="w-5 h-5" />
            </Button>
            <div>
              <h3 className="font-serif text-base font-bold leading-tight">{selectedArtwork.title}</h3>
              <p className="text-sm text-muted-foreground">by {selectedArtwork.artist.name}</p>
            </div>
            
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary">{selectedArtwork.category}</Badge>
              <Badge variant="outline">{selectedArtwork.medium}</Badge>
              {selectedArtwork.year && (
                <Badge variant="outline">{selectedArtwork.year}</Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground flex-1">{selectedArtwork.description}</p>

            <div className="pt-2 border-t space-y-2">
              <div>
                {selectedArtwork.isForSale && (
                  <p className="text-lg font-bold text-primary">
                    {formatPrice(selectedArtwork.price)}
                  </p>
                )}
                {selectedArtwork.dimensions && (
                  <p className="text-xs text-muted-foreground">{selectedArtwork.dimensions}</p>
                )}
              </div>
              
              {selectedArtwork.isForSale && (
                <Button
                  className="w-full"
                  onClick={handleAddToCart}
                  disabled={isInCart}
                  data-testid="button-add-to-cart-3d"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {isInCart ? "In Cart" : "Add to Cart"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {artist && (
        <Dialog
          open={showArtistDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowArtistDialog(false);
              requestPointerLock();
            }
          }}
        >
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 ring-2 ring-primary/20">
                  <AvatarImage src={artist.avatarUrl || undefined} />
                  <AvatarFallback className="text-xl font-serif">
                    {artist.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="font-serif text-2xl">
                    {artist.name}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-2">
                    {artist.country && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {artist.country}
                      </span>
                    )}
                    {artist.specialization && (
                      <>
                        <span>|</span>
                        <span className="flex items-center gap-1">
                          <Palette className="h-3 w-3" />
                          {artist.specialization}
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
                    {artist.bio}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                    <h4 className="font-semibold">Artworks</h4>
                    <Link href={`/artists/${artist.id}`}>
                      <Button variant="ghost" size="sm">
                        View Profile
                        <ExternalLink className="h-3 w-3 ml-2" />
                      </Button>
                    </Link>
                  </div>

                  {artworksLoading ? (
                    <div className="grid grid-cols-3 gap-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="aspect-square rounded-md bg-muted animate-pulse" />
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
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No artworks available yet</p>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
