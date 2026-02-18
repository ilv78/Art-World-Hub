import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, ShoppingCart, Info, Move, Mouse, Keyboard, Maximize2, Minimize2, ZoomIn, ZoomOut, Box, Map as MapIcon } from "lucide-react";
import type { ArtworkWithArtist, Artist, MazeLayout, MazeCell } from "@shared/schema";
import { useCartStore } from "@/lib/cart-store";
import { useToast } from "@/hooks/use-toast";

interface MazeGallery3DProps {
  artworks: ArtworkWithArtist[];
  layout?: MazeLayout;
  whiteRoom?: boolean;
  artist?: Artist;
}

// Default maze layout - a simple gallery with multiple rooms
const defaultLayout: MazeLayout = {
  width: 5,
  height: 5,
  spawnPoint: { x: 2, z: 0 },
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
const PLAYER_HEIGHT = 1.7;
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

export function MazeGallery3D({ artworks, layout = defaultLayout, whiteRoom = false, artist }: MazeGallery3DProps) {
  const CELL_SIZE = whiteRoom ? CELL_SIZE_WHITE : CELL_SIZE_DEFAULT;
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const artworkMeshesRef = useRef<Map<string, { mesh: THREE.Mesh; artwork: ArtworkWithArtist }>>(new Map());
  
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkWithArtist | null>(null);
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
  
  const { addItem, items } = useCartStore();
  const { toast } = useToast();

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

  // Create maze geometry
  const createMaze = useCallback((scene: THREE.Scene) => {
    const floorColor = whiteRoom ? 0xe8e0d8 : 0x2a2a2a;
    const ceilingColor = whiteRoom ? 0xffffff : 0x1a1a1a;
    const wallColor = whiteRoom ? 0xf5f0eb : 0x3d3d3d;

    const floorGeometry = new THREE.PlaneGeometry(layout.width * CELL_SIZE + 4, layout.height * CELL_SIZE + 4);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: floorColor,
      roughness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(layout.width * CELL_SIZE / 2, 0, layout.height * CELL_SIZE / 2);
    floor.receiveShadow = true;
    scene.add(floor);

    // Ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(layout.width * CELL_SIZE + 4, layout.height * CELL_SIZE + 4);
    const ceilingMaterial = new THREE.MeshStandardMaterial({ 
      color: ceilingColor,
      roughness: 0.9,
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(layout.width * CELL_SIZE / 2, WALL_HEIGHT, layout.height * CELL_SIZE / 2);
    scene.add(ceiling);

    // Wall material
    const wallMaterial = new THREE.MeshStandardMaterial({ 
      color: wallColor,
      roughness: 0.7,
    });

    // Create walls for each cell
    layout.cells.forEach((cell) => {
      const baseX = cell.x * CELL_SIZE;
      const baseZ = cell.z * CELL_SIZE;

      // North wall
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

      // South wall
      if (cell.walls.south) {
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(CELL_SIZE, WALL_HEIGHT, WALL_THICKNESS),
          wallMaterial
        );
        wall.position.set(baseX + CELL_SIZE / 2, WALL_HEIGHT / 2, baseZ);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
      }

      // East wall
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

      // West wall
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
  }, [layout, whiteRoom, CELL_SIZE]);

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
    const posterW = 0.8;
    const posterH = 1.1;
    const canvas = document.createElement("canvas");
    const cw = 400;
    const ch = 550;
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, cw, ch);

    ctx.strokeStyle = "#c9a84c";
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, cw - 24, ch - 24);

    const drawText = () => {
      let y = 200;

      ctx.fillStyle = "#f0e6d3";
      ctx.font = "bold 28px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(artist.name, cw / 2, y);
      y += 36;

      if (artist.country) {
        ctx.fillStyle = "#a0a0b0";
        ctx.font = "16px sans-serif";
        ctx.fillText(artist.country, cw / 2, y);
        y += 28;
      }

      if (artist.specialization) {
        ctx.fillStyle = "#c9a84c";
        ctx.font = "italic 16px Georgia, serif";
        ctx.fillText(artist.specialization, cw / 2, y);
        y += 32;
      }

      if (artist.bio) {
        ctx.fillStyle = "#d0d0d8";
        ctx.font = "13px sans-serif";
        ctx.textAlign = "left";
        const maxWidth = cw - 60;
        const words = artist.bio.split(" ");
        let line = "";
        const lines: string[] = [];
        for (const word of words) {
          const test = line + (line ? " " : "") + word;
          if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = word;
          } else {
            line = test;
          }
        }
        if (line) lines.push(line);
        const maxLines = 8;
        const displayLines = lines.slice(0, maxLines);
        if (lines.length > maxLines) {
          displayLines[maxLines - 1] = displayLines[maxLines - 1].replace(/\s*\S*$/, "...");
        }
        for (const l of displayLines) {
          ctx.fillText(l, 30, y);
          y += 18;
        }
      }
    };

    const avatarSize = 100;
    const ax = (cw - avatarSize) / 2;
    const ay = 40;

    const drawFallbackAvatar = () => {
      ctx.fillStyle = "#2a2a4e";
      ctx.beginPath();
      ctx.arc(ax + avatarSize / 2, ay + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f0e6d3";
      ctx.font = "bold 36px Georgia, serif";
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
    posterMesh.position.set(pos.x, PLAYER_HEIGHT + 0.3, pos.z);
    posterMesh.rotation.y = pos.rotY;
    posterMesh.translateZ(0.06);
    scene.add(posterMesh);

    if (artist.avatarUrl) {
      const avatarImg = new Image();
      avatarImg.crossOrigin = "anonymous";
      avatarImg.onload = () => {
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, cw, ch);
        ctx.strokeStyle = "#c9a84c";
        ctx.lineWidth = 3;
        ctx.strokeRect(12, 12, cw - 24, ch - 24);

        ctx.save();
        ctx.beginPath();
        ctx.arc(ax + avatarSize / 2, ay + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatarImg, ax, ay, avatarSize, avatarSize);
        ctx.restore();

        ctx.strokeStyle = "#c9a84c";
        ctx.lineWidth = 2;
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

    const hasPoster = whiteRoom && artist;
    let artworkIndex = 0;

    for (let i = 0; i < allSlots.length; i++) {
      const slot = allSlots[i];

      if (i === 0 && hasPoster) {
        createArtistPoster(scene, slot.wallId);
        continue;
      }

      if (artworkIndex >= artworks.length) continue;
      const artwork = artworks[artworkIndex];
      artworkIndex++;

      const maxArtSize = 1.8;
      const dims = artworkScale(artwork.dimensions, maxArtSize);
      const artworkGeometry = new THREE.PlaneGeometry(dims.w, dims.h);
      const pos = computeSlotPosition(slot.wallId);

      const placeholderMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xcccccc,
        roughness: 0.5,
      });
      const artworkMesh = new THREE.Mesh(artworkGeometry, placeholderMaterial);
      artworkMesh.position.set(pos.x, PLAYER_HEIGHT + 0.3, pos.z);
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
  }, [layout, artworks, CELL_SIZE, whiteRoom, artist, computeSlotPosition, createArtistPoster]);

  // Setup lighting - minimal to avoid shader limits
  const setupLighting = useCallback((scene: THREE.Scene) => {
    if (whiteRoom) {
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(layout.width * CELL_SIZE / 2, WALL_HEIGHT * 2, layout.height * CELL_SIZE / 2);
      scene.add(directionalLight);

      const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe8e0d8, 0.5);
      scene.add(hemiLight);
    } else {
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xfff5e6, 0.5);
      directionalLight.position.set(layout.width * CELL_SIZE / 2, WALL_HEIGHT * 2, layout.height * CELL_SIZE / 2);
      scene.add(directionalLight);

      const hemiLight = new THREE.HemisphereLight(0xfff5e6, 0x444444, 0.3);
      scene.add(hemiLight);
    }
  }, [layout, whiteRoom, CELL_SIZE]);

  // Collision detection
  const checkCollision = useCallback((position: THREE.Vector3): boolean => {
    const margin = 0.3;
    
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

  // Handle artwork click
  const handleClick = useCallback((event: MouseEvent) => {
    if (!cameraRef.current || !sceneRef.current || !isPointerLockedRef.current) return;

    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);
    raycaster.setFromCamera(center, cameraRef.current);

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
    const bgColor = whiteRoom ? 0xf5f0eb : 0x0a0a0a;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.Fog(bgColor, whiteRoom ? 5 : 5, whiteRoom ? 30 : 40);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
    camera.position.set(
      layout.spawnPoint.x * CELL_SIZE + CELL_SIZE / 2,
      PLAYER_HEIGHT,
      layout.spawnPoint.z * CELL_SIZE + CELL_SIZE / 2
    );
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

        // Apply movement based on keys
        if (keysPressed.current.has("KeyW") || keysPressed.current.has("ArrowUp")) {
          direction.add(forward);
        }
        if (keysPressed.current.has("KeyS") || keysPressed.current.has("ArrowDown")) {
          direction.sub(forward);
        }
        if (keysPressed.current.has("KeyA") || keysPressed.current.has("ArrowLeft")) {
          direction.sub(right);
        }
        if (keysPressed.current.has("KeyD") || keysPressed.current.has("ArrowRight")) {
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
  }, [layout, artworks, whiteRoom, CELL_SIZE, createMaze, placeArtworks, setupLighting, checkCollision]);

  // Pointer lock and controls
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

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      document.removeEventListener("click", handleClick);
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
    if (containerRef.current && typeof containerRef.current.requestPointerLock === 'function') {
      containerRef.current.requestPointerLock();
      setShowControls(false);
    } else {
      setShowControls(false);
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
      <div className="relative w-full bg-gradient-to-b from-stone-900 to-black rounded-lg overflow-hidden flex items-center justify-center" style={{ height: "600px" }} data-testid="webgl-fallback">
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
    <div className="relative w-full rounded-lg overflow-hidden" style={{ height: "600px" }}>
      <div ref={containerRef} className="absolute inset-0 cursor-crosshair" style={{ zIndex: 0 }} />

      {/* Controls overlay */}
      {!isPointerLocked && !selectedArtwork && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm" style={{ zIndex: 10 }}>
          <Card className="p-8 max-w-md text-center space-y-6">
            <h2 className="font-serif text-2xl font-bold">Virtual Gallery</h2>
            <p className="text-muted-foreground">
              Walk through a 3D art gallery. Click anywhere to start exploring.
            </p>
            
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

            <Button 
              size="lg" 
              onClick={requestPointerLock}
              className="w-full"
              data-testid="button-enter-gallery"
            >
              <Move className="w-4 h-4 mr-2" />
              Enter Gallery
            </Button>

            <p className="text-xs text-muted-foreground">
              Press ESC to exit walking mode
            </p>
          </Card>
        </div>
      )}

      {/* HUD */}
      {isPointerLocked && (
        <div style={{ zIndex: 5 }}>
          {/* Crosshair */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-4 h-4 border-2 border-white/50 rounded-full" />
          </div>

          {/* Mini instructions */}
          <div className="absolute bottom-4 left-4 text-white/70 text-sm space-y-1">
            <p>WASD to move | Mouse to look</p>
            <p>Click artwork to view | ESC to pause</p>
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
                  fill="#F97316" 
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
                <p className="text-lg font-bold text-primary">
                  ${parseFloat(selectedArtwork.price).toLocaleString()}
                </p>
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
    </div>
  );
}
