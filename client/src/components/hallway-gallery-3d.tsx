import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, ShoppingCart, Move, Mouse, Keyboard, Maximize2, Minimize2, ZoomIn, Box, Map as MapIcon } from "lucide-react";
import type { ArtworkWithArtist, MazeLayout, MazeCell } from "@shared/schema";
import { useCartStore } from "@/lib/cart-store";
import { useToast } from "@/hooks/use-toast";

interface ArtistRoom {
  artist: {
    id: string;
    name: string;
    avatarUrl: string | null;
    specialization: string | null;
    bio?: string | null;
    country?: string | null;
    galleryLayout?: MazeLayout | null;
  };
  artworks: ArtworkWithArtist[];
}

interface HallwayGallery3DProps {
  artistRooms: ArtistRoom[];
}

const CELL_SIZE = 2.5;
const WALL_H = 3;
const WALL_T = 0.15;
const PLAYER_H = 1.5;
const MOVE_SPEED = 0.08;
const LOOK_SPEED = 0.002;
const HALLWAY_W = 3;

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

const textureCache = new Map<string, THREE.Texture>();
const loadingTextures = new Map<string, Promise<THREE.Texture>>();

function needsProxy(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host.includes("unsplash.com")) return false;
    if (host === window.location.hostname) return false;
    return true;
  } catch {
    return false;
  }
}

function getImageSrc(url: string, attempt: number): string {
  const retryParam = attempt > 1 ? (url.includes("?") ? `&retry=${attempt}` : `?retry=${attempt}`) : "";
  if (needsProxy(url)) {
    return `/api/image-proxy?url=${encodeURIComponent(url + retryParam)}`;
  }
  return url + retryParam;
}

function loadTextureWithCache(url: string, retries = 3): Promise<THREE.Texture> {
  if (textureCache.has(url)) {
    return Promise.resolve(textureCache.get(url)!.clone());
  }
  if (loadingTextures.has(url)) {
    return loadingTextures.get(url)!.then(t => t.clone());
  }
  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    let attempt = 0;
    const tryLoad = () => {
      attempt++;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const texture = new THREE.Texture(img);
        texture.needsUpdate = true;
        texture.colorSpace = THREE.SRGBColorSpace;
        textureCache.set(url, texture);
        loadingTextures.delete(url);
        resolve(texture.clone());
      };
      img.onerror = () => {
        if (attempt < retries) {
          setTimeout(tryLoad, 1000 * attempt);
        } else {
          loadingTextures.delete(url);
          reject(new Error(`Failed to load image: ${url}`));
        }
      };
      img.src = getImageSrc(url, attempt);
    };
    tryLoad();
  });
  loadingTextures.set(url, promise);
  return promise;
}

function generateDefaultLayout(artworkCount: number): MazeLayout {
  const slotsNeeded = artworkCount + 1;
  const width = Math.max(3, Math.ceil(Math.sqrt(slotsNeeded)));
  const height = Math.max(3, Math.ceil(slotsNeeded / (width * 2)) + 2);
  const cells: MazeCell[] = [];
  const doorCenterX = Math.floor(width / 2);

  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const walls = {
        north: z === height - 1,
        south: z === 0,
        east: x === width - 1,
        west: x === 0,
      };
      const artworkSlots: { wallId: string; position: number }[] = [];
      if (z === height - 1) artworkSlots.push({ wallId: `${x}-${z}-north`, position: artworkSlots.length });
      if (x === width - 1) artworkSlots.push({ wallId: `${x}-${z}-east`, position: artworkSlots.length });
      if (x === 0) artworkSlots.push({ wallId: `${x}-${z}-west`, position: artworkSlots.length });
      cells.push({ x, z, walls, artworkSlots });
    }
  }

  let pos = 0;
  cells.forEach(cell => {
    cell.artworkSlots.forEach(slot => {
      slot.position = pos++;
    });
  });

  return {
    width,
    height,
    spawnPoint: { x: doorCenterX, z: 1 },
    cells,
  };
}

interface RoomPlacement {
  layout: MazeLayout;
  roomWidthWorld: number;
  roomHeightWorld: number;
  corridorZ: number;
  isLeft: boolean;
  artistIndex: number;
}

function computeRoomPlacements(artistRooms: ArtistRoom[]): { placements: RoomPlacement[]; hallwayLen: number } {
  const placements: RoomPlacement[] = [];
  let cursor = 1.5;
  const gap = 1.0;

  const numPairs = Math.ceil(artistRooms.length / 2);
  for (let p = 0; p < numPairs; p++) {
    const leftIdx = p * 2;
    const rightIdx = p * 2 + 1;

    const leftLayout = artistRooms[leftIdx].artist.galleryLayout || generateDefaultLayout(artistRooms[leftIdx].artworks.length);
    const rightLayout = rightIdx < artistRooms.length
      ? (artistRooms[rightIdx].artist.galleryLayout || generateDefaultLayout(artistRooms[rightIdx].artworks.length))
      : null;

    const leftWidthWorld = leftLayout.width * CELL_SIZE;
    const rightWidthWorld = rightLayout ? rightLayout.width * CELL_SIZE : 0;
    const pairWidth = Math.max(leftWidthWorld, rightWidthWorld);

    placements.push({
      layout: leftLayout,
      roomWidthWorld: leftLayout.width * CELL_SIZE,
      roomHeightWorld: leftLayout.height * CELL_SIZE,
      corridorZ: cursor,
      isLeft: true,
      artistIndex: leftIdx,
    });

    if (rightLayout && rightIdx < artistRooms.length) {
      placements.push({
        layout: rightLayout,
        roomWidthWorld: rightLayout.width * CELL_SIZE,
        roomHeightWorld: rightLayout.height * CELL_SIZE,
        corridorZ: cursor,
        isLeft: false,
        artistIndex: rightIdx,
      });
    }

    cursor += pairWidth + gap;
  }

  return { placements, hallwayLen: Math.max(cursor + 0.5, 4) };
}

function transformLeftRoom(localX: number, localZ: number, corridorLeftX: number, roomStartZ: number): { wx: number; wz: number } {
  return {
    wx: corridorLeftX - localZ,
    wz: roomStartZ + localX,
  };
}

function transformRightRoom(localX: number, localZ: number, corridorRightX: number, roomStartZ: number): { wx: number; wz: number } {
  return {
    wx: corridorRightX + localZ,
    wz: roomStartZ + localX,
  };
}

function Minimap({ artistRooms, placements, hallLeft, hallRight, hallwayLen, playerPosition }: {
  artistRooms: ArtistRoom[];
  placements: RoomPlacement[];
  hallLeft: number;
  hallRight: number;
  hallwayLen: number;
  playerPosition: { x: number; z: number; rotation: number };
}) {
  let minX = hallLeft;
  let maxX = hallRight;
  for (const p of placements) {
    if (p.isLeft) {
      minX = Math.min(minX, hallLeft - p.layout.height * CELL_SIZE);
    } else {
      maxX = Math.max(maxX, hallRight + p.layout.height * CELL_SIZE);
    }
  }
  const totalW = maxX - minX + 1;
  const totalD = hallwayLen + 1;
  const mapScale = Math.min(12, 160 / totalW, 180 / totalD);
  const mapW = totalW * mapScale + 8;
  const mapH = totalD * mapScale + 8;
  const ox = -minX * mapScale + 4;
  const oz = 4;

  return (
    <div className="absolute top-16 right-4 bg-black/70 rounded-lg p-2 border border-white/20" style={{ zIndex: 5 }} data-testid="minimap">
      <svg width={Math.min(mapW, 200)} height={Math.min(mapH, 220)} viewBox={`0 0 ${mapW} ${mapH}`} className="block">
        <rect x={0} y={0} width={mapW} height={mapH} fill="rgba(30,30,30,0.8)" rx={4} />
        <rect x={ox + hallLeft * mapScale} y={oz} width={HALLWAY_W * mapScale} height={hallwayLen * mapScale} fill="rgba(200,195,185,0.4)" />
        {placements.map((p, i) => {
          const roomW = p.layout.width * CELL_SIZE;
          const roomH = p.layout.height * CELL_SIZE;
          const rZ = p.corridorZ;
          let rX: number;
          let rW: number;
          let rH: number;
          if (p.isLeft) {
            rX = hallLeft - roomH;
            rW = roomH;
            rH = roomW;
          } else {
            rX = hallRight;
            rW = roomH;
            rH = roomW;
          }
          return (
            <g key={artistRooms[p.artistIndex]?.artist.id ?? i}>
              <rect
                x={ox + rX * mapScale}
                y={oz + rZ * mapScale}
                width={rW * mapScale}
                height={rH * mapScale}
                fill="rgba(249, 115, 22, 0.3)"
                stroke="rgba(249, 115, 22, 0.5)"
                strokeWidth={0.5}
              />
              <text
                x={ox + (rX + rW / 2) * mapScale}
                y={oz + (rZ + rH / 2) * mapScale}
                fill="rgba(255,255,255,0.7)"
                fontSize={6}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {artistRooms[p.artistIndex]?.artist.name.split(" ").pop()}
              </text>
            </g>
          );
        })}
        <g transform={`translate(${ox + playerPosition.x * mapScale}, ${oz + playerPosition.z * mapScale})`}>
          <g transform={`rotate(${-playerPosition.rotation * 180 / Math.PI})`}>
            <polygon points="0,-4 3,3 0,1.5 -3,3" fill="#F97316" stroke="#fff" strokeWidth={0.8} />
          </g>
        </g>
      </svg>
    </div>
  );
}

export function HallwayGallery3D({ artistRooms }: HallwayGallery3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const artworkMeshesRef = useRef<Map<string, { mesh: THREE.Mesh; artwork: ArtworkWithArtist }>>(new Map());
  const wallBoxesRef = useRef<THREE.Box3[]>([]);

  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkWithArtist | null>(null);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [showMinimap, setShowMinimap] = useState(true);
  const [playerPosition, setPlayerPosition] = useState({ x: 0, z: 0, rotation: 0 });

  const keysPressed = useRef<Set<string>>(new Set());
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
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
      toast({ title: "Added to cart", description: `${selectedArtwork.title} has been added to your cart.` });
    }
  }, [selectedArtwork, isInCart, addItem, toast]);

  const { placements, hallwayLen } = useMemo(() => computeRoomPlacements(artistRooms), [artistRooms]);
  const hallLeft = -HALLWAY_W / 2;
  const hallRight = HALLWAY_W / 2;

  const createParquetTexture = useCallback((): THREE.CanvasTexture => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#c8a882";
    ctx.fillRect(0, 0, 512, 512);
    const plankColors = ["#c8a882", "#bfa078", "#d4b896", "#b8956e", "#cbb08a", "#c2a07a", "#d0b090", "#c5a47e"];
    const plankHeight = 24;
    for (let row = 0; row < Math.ceil(512 / plankHeight); row++) {
      const py = row * plankHeight;
      ctx.fillStyle = plankColors[row % plankColors.length];
      ctx.fillRect(0, py, 512, plankHeight - 1);
      ctx.strokeStyle = "rgba(120, 80, 40, 0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, py + plankHeight - 1);
      ctx.lineTo(512, py + plankHeight - 1);
      ctx.stroke();
      ctx.strokeStyle = "rgba(90, 60, 30, 0.08)";
      ctx.lineWidth = 0.5;
      for (let g = 0; g < 6; g++) {
        const gy = py + 3 + g * (plankHeight / 7);
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(128, gy + (g % 2 === 0 ? 1 : -1), 384, gy + (g % 2 === 0 ? -0.5 : 0.5), 512, gy);
        ctx.stroke();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);

  const buildScene = useCallback((scene: THREE.Scene) => {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf5f0eb, roughness: 0.7 });
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const corridorFloorMat = new THREE.MeshStandardMaterial({ color: 0xd4cdc0, roughness: 0.9 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.6, metalness: 0.2 });
    const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.6 });
    const doorPanelMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.5 });

    const addCollisionWall = (mesh: THREE.Mesh) => {
      wallBoxesRef.current.push(new THREE.Box3().setFromObject(mesh));
    };

    const addWallMesh = (w: number, h: number, d: number, x: number, y: number, z: number, mat?: THREE.Material, collision = true) => {
      if (w < 0.01 || d < 0.01) return null;
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, mat || wallMat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      if (collision) addCollisionWall(mesh);
      return mesh;
    };

    const hallEnd = hallwayLen;

    const corridorFloorGeo = new THREE.PlaneGeometry(HALLWAY_W, hallEnd);
    const corridorFloor = new THREE.Mesh(corridorFloorGeo, corridorFloorMat);
    corridorFloor.rotation.x = -Math.PI / 2;
    corridorFloor.position.set(0, 0, hallEnd / 2);
    corridorFloor.receiveShadow = true;
    scene.add(corridorFloor);

    const corridorCeilGeo = new THREE.PlaneGeometry(HALLWAY_W, hallEnd);
    const corridorCeil = new THREE.Mesh(corridorCeilGeo, ceilingMat);
    corridorCeil.rotation.x = Math.PI / 2;
    corridorCeil.position.set(0, WALL_H, hallEnd / 2);
    scene.add(corridorCeil);

    addWallMesh(HALLWAY_W + 2, WALL_H, WALL_T, 0, WALL_H / 2, 0);
    addWallMesh(HALLWAY_W + 2, WALL_H, WALL_T, 0, WALL_H / 2, hallEnd);

    type DoorInfo = { centerZ: number; halfWidth: number };
    const leftDoors: DoorInfo[] = [];
    const rightDoors: DoorInfo[] = [];

    for (const p of placements) {
      const doorCenterX = Math.floor(p.layout.width / 2);
      const doorCenterInRoom = doorCenterX * CELL_SIZE + CELL_SIZE / 2;
      const doorWorldZ = p.corridorZ + doorCenterInRoom;
      const halfW = CELL_SIZE * 0.25;
      (p.isLeft ? leftDoors : rightDoors).push({ centerZ: doorWorldZ, halfWidth: halfW });
    }

    const buildCorridorSideWall = (wallX: number, doors: DoorInfo[]) => {
      const sorted = [...doors].sort((a, b) => a.centerZ - b.centerZ);
      let cursor = 0;
      for (const door of sorted) {
        const doorStart = door.centerZ - door.halfWidth;
        const doorEnd = door.centerZ + door.halfWidth;
        const segLen = doorStart - cursor;
        if (segLen > 0.05) {
          addWallMesh(WALL_T, WALL_H, segLen, wallX, WALL_H / 2, cursor + segLen / 2);
        }
        const lintelH = WALL_H * 0.15;
        const doorH = WALL_H * 0.85;
        const lintelMesh = new THREE.Mesh(
          new THREE.BoxGeometry(WALL_T + 0.02, lintelH, door.halfWidth * 2),
          wallMat
        );
        lintelMesh.position.set(wallX, doorH + lintelH / 2, door.centerZ);
        scene.add(lintelMesh);
        addCollisionWall(lintelMesh);

        const postGeo = new THREE.BoxGeometry(0.08, doorH, 0.08);
        const leftPost = new THREE.Mesh(postGeo, doorFrameMat);
        leftPost.position.set(wallX, doorH / 2, doorStart);
        scene.add(leftPost);
        const rightPost = new THREE.Mesh(postGeo, doorFrameMat);
        rightPost.position.set(wallX, doorH / 2, doorEnd);
        scene.add(rightPost);

        const lintelFrame = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.08, door.halfWidth * 2 + 0.16),
          doorFrameMat
        );
        lintelFrame.position.set(wallX, doorH, door.centerZ);
        scene.add(lintelFrame);

        cursor = doorEnd;
      }
      const remaining = hallEnd - cursor;
      if (remaining > 0.05) {
        addWallMesh(WALL_T, WALL_H, remaining, wallX, WALL_H / 2, cursor + remaining / 2);
      }
    };

    buildCorridorSideWall(hallLeft, leftDoors);
    buildCorridorSideWall(hallRight, rightDoors);

    const parquetTexture = createParquetTexture();

    for (const p of placements) {
      const layout = p.layout;
      const room = artistRooms[p.artistIndex];
      const corridorEdgeX = p.isLeft ? hallLeft : hallRight;
      const roomStartZ = p.corridorZ;
      const transform = p.isLeft ? transformLeftRoom : transformRightRoom;

      const roomFloorW = layout.height * CELL_SIZE + 0.5;
      const roomFloorD = layout.width * CELL_SIZE;
      const floorTex = parquetTexture.clone();
      floorTex.repeat.set(layout.height, layout.width);
      floorTex.needsUpdate = true;
      const roomFloorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7 });
      const floorGeo = new THREE.PlaneGeometry(roomFloorW, roomFloorD);
      const floorMesh = new THREE.Mesh(floorGeo, roomFloorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      const floorCenter = transform(
        layout.width * CELL_SIZE / 2,
        layout.height * CELL_SIZE / 2,
        corridorEdgeX,
        roomStartZ
      );
      floorMesh.position.set(floorCenter.wx, 0.005, floorCenter.wz);
      floorMesh.receiveShadow = true;
      scene.add(floorMesh);

      const ceilGeo = new THREE.PlaneGeometry(roomFloorW, roomFloorD);
      const ceilMesh = new THREE.Mesh(ceilGeo, ceilingMat);
      ceilMesh.rotation.x = Math.PI / 2;
      ceilMesh.position.set(floorCenter.wx, WALL_H, floorCenter.wz);
      scene.add(ceilMesh);

      const doorCenterX = Math.floor(layout.width / 2);

      for (const cell of layout.cells) {
        const localBaseX = cell.x * CELL_SIZE;
        const localBaseZ = cell.z * CELL_SIZE;

        if (cell.walls.north) {
          const c1 = transform(localBaseX, localBaseZ + CELL_SIZE, corridorEdgeX, roomStartZ);
          const c2 = transform(localBaseX + CELL_SIZE, localBaseZ + CELL_SIZE, corridorEdgeX, roomStartZ);
          const cx = (c1.wx + c2.wx) / 2;
          const cz = (c1.wz + c2.wz) / 2;
          const dx = c2.wx - c1.wx;
          const dz = c2.wz - c1.wz;
          const wallLen = Math.sqrt(dx * dx + dz * dz);
          addWallMesh(WALL_T, WALL_H, wallLen, cx, WALL_H / 2, cz);
        }

        if (cell.walls.south) {
          const isDoorCell = cell.z === 0 && cell.x === doorCenterX;
          if (!isDoorCell) {
            const c1 = transform(localBaseX, localBaseZ, corridorEdgeX, roomStartZ);
            const c2 = transform(localBaseX + CELL_SIZE, localBaseZ, corridorEdgeX, roomStartZ);
            const cx = (c1.wx + c2.wx) / 2;
            const cz = (c1.wz + c2.wz) / 2;
            const dx = c2.wx - c1.wx;
            const dz = c2.wz - c1.wz;
            const wallLen = Math.sqrt(dx * dx + dz * dz);
            addWallMesh(WALL_T, WALL_H, wallLen, cx, WALL_H / 2, cz);
          }
        }

        if (cell.walls.east) {
          const c1 = transform(localBaseX + CELL_SIZE, localBaseZ, corridorEdgeX, roomStartZ);
          const c2 = transform(localBaseX + CELL_SIZE, localBaseZ + CELL_SIZE, corridorEdgeX, roomStartZ);
          const cx = (c1.wx + c2.wx) / 2;
          const cz = (c1.wz + c2.wz) / 2;
          const dx = c2.wx - c1.wx;
          const dz = c2.wz - c1.wz;
          const wallLen = Math.sqrt(dx * dx + dz * dz);
          addWallMesh(wallLen, WALL_H, WALL_T, cx, WALL_H / 2, cz);
        }

        if (cell.walls.west) {
          const c1 = transform(localBaseX, localBaseZ, corridorEdgeX, roomStartZ);
          const c2 = transform(localBaseX, localBaseZ + CELL_SIZE, corridorEdgeX, roomStartZ);
          const cx = (c1.wx + c2.wx) / 2;
          const cz = (c1.wz + c2.wz) / 2;
          const dx = c2.wx - c1.wx;
          const dz = c2.wz - c1.wz;
          const wallLen = Math.sqrt(dx * dx + dz * dz);
          addWallMesh(wallLen, WALL_H, WALL_T, cx, WALL_H / 2, cz);
        }
      }

      const allSlots: { wallId: string; position: number }[] = [];
      layout.cells.forEach(cell => {
        cell.artworkSlots.forEach(slot => {
          allSlots.push(slot);
        });
      });
      allSlots.sort((a, b) => a.position - b.position);

      const hasPoster = !!room.artist;
      let artworkIndex = 0;

      for (let si = 0; si < allSlots.length; si++) {
        const slot = allSlots[si];
        const [cellXStr, cellZStr, direction] = slot.wallId.split("-");
        const cellX = parseInt(cellXStr);
        const cellZ = parseInt(cellZStr);
        const baseX = cellX * CELL_SIZE;
        const baseZ = cellZ * CELL_SIZE;

        let localX = baseX + CELL_SIZE / 2;
        let localZ = baseZ + CELL_SIZE / 2;
        let localRotY = 0;
        const wallOffset = 0.3;

        switch (direction) {
          case "north":
            localZ = baseZ + CELL_SIZE - wallOffset;
            localRotY = Math.PI;
            break;
          case "south":
            localZ = baseZ + wallOffset;
            localRotY = 0;
            break;
          case "east":
            localX = baseX + CELL_SIZE - wallOffset;
            localRotY = -Math.PI / 2;
            break;
          case "west":
            localX = baseX + wallOffset;
            localRotY = Math.PI / 2;
            break;
        }

        const worldPos = transform(localX, localZ, corridorEdgeX, roomStartZ);
        let worldRotY: number;
        if (p.isLeft) {
          worldRotY = localRotY - Math.PI / 2;
        } else {
          worldRotY = localRotY + Math.PI / 2;
        }

        if (si === 0 && hasPoster) {
          createArtistPoster(scene, room.artist, worldPos.wx, worldPos.wz, worldRotY);
          continue;
        }

        if (artworkIndex >= room.artworks.length) continue;
        const artwork = room.artworks[artworkIndex];
        artworkIndex++;

        const maxArtSize = 1.8;
        const dims = artworkScale(artwork.dimensions, maxArtSize);
        const artGeo = new THREE.PlaneGeometry(dims.w, dims.h);
        const placeholderMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5 });
        const artMesh = new THREE.Mesh(artGeo, placeholderMat);
        artMesh.position.set(worldPos.wx, WALL_H / 2, worldPos.wz);
        artMesh.rotation.y = worldRotY;
        artMesh.translateZ(0.06);
        scene.add(artMesh);
        artworkMeshesRef.current.set(artwork.id, { mesh: artMesh, artwork });

        loadTextureWithCache(artwork.imageUrl).then(texture => {
          artMesh.material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.3 });
        }).catch(() => {
          artMesh.material = new THREE.MeshStandardMaterial({ color: 0xc0b8a8, roughness: 0.5 });
        });
      }

      addNamePlaque(scene, room.artist.name, p.isLeft ? hallLeft + 0.2 : hallRight - 0.2,
        roomStartZ + layout.width * CELL_SIZE / 2, p.isLeft);

      const roomLight = new THREE.PointLight(0xffffff, 1.0, 15);
      roomLight.position.set(floorCenter.wx, WALL_H - 0.3, floorCenter.wz);
      scene.add(roomLight);
    }

    const ambientLight = new THREE.AmbientLight(0xfff8f0, 1.0);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(0, WALL_H * 2, hallEnd / 2);
    scene.add(dirLight);
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe8e0d8, 0.4);
    scene.add(hemiLight);

    for (let z = 2; z < hallEnd; z += 3) {
      const pl = new THREE.PointLight(0xfff5e6, 0.8, 12);
      pl.position.set(0, WALL_H - 0.2, z);
      scene.add(pl);
    }
  }, [artistRooms, placements, hallwayLen, createParquetTexture]);

  function createArtistPoster(
    scene: THREE.Scene,
    artist: ArtistRoom["artist"],
    wx: number,
    wz: number,
    rotY: number
  ) {
    const posterW = CELL_SIZE - 0.1;
    const posterH = WALL_H * 0.75;
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
        const maxLines = 10;
        const displayLines = lines.slice(0, maxLines);
        if (lines.length > maxLines) {
          displayLines[maxLines - 1] = displayLines[maxLines - 1].replace(/\s*\S*$/, "...");
        }
        for (const l of displayLines) {
          ctx.fillText(l, 50, y);
          y += 30;
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
    posterMesh.position.set(wx, WALL_H / 2, wz);
    posterMesh.rotation.y = rotY;
    posterMesh.translateZ(0.06);
    scene.add(posterMesh);

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
  }

  function addNamePlaque(scene: THREE.Scene, name: string, x: number, z: number, isLeft: boolean) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#2c2418";
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = "#f0ece4";
    ctx.font = "bold 36px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(1.6, 0.4);
    const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.4 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, WALL_H - 0.6, z);
    mesh.rotation.y = isLeft ? -Math.PI / 2 : Math.PI / 2;
    scene.add(mesh);
  }

  const checkCollision = useCallback((pos: THREE.Vector3): boolean => {
    const margin = 0.35;
    const playerBox = new THREE.Box3(
      new THREE.Vector3(pos.x - margin, 0, pos.z - margin),
      new THREE.Vector3(pos.x + margin, PLAYER_H, pos.z + margin)
    );
    for (const wallBox of wallBoxesRef.current) {
      if (playerBox.intersectsBox(wallBox)) return true;
    }
    return false;
  }, []);

  const handleClick = useCallback((event: MouseEvent) => {
    if (!cameraRef.current || !sceneRef.current || !isPointerLockedRef.current) return;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), cameraRef.current);
    const meshes = Array.from(artworkMeshesRef.current.values()).map(v => v.mesh);
    const intersects = raycaster.intersectObjects(meshes);
    if (intersects.length > 0 && intersects[0].distance < 6) {
      const mesh = intersects[0].object as THREE.Mesh;
      const entries = Array.from(artworkMeshesRef.current.entries());
      for (const [, data] of entries) {
        if (data.mesh === mesh) {
          setSelectedArtwork(data.artwork);
          document.exitPointerLock();
          break;
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const testCanvas = document.createElement("canvas");
    const gl = testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl");
    if (!gl) { setWebglError("WebGL is not supported."); return; }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f0eb);
    scene.fog = new THREE.Fog(0xf5f0eb, 8, 40);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
    camera.position.set(0, PLAYER_H, 0.8);
    euler.current.y = Math.PI;
    camera.quaternion.setFromEuler(euler.current);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, failIfMajorPerformanceCaveat: false });
    } catch {
      setWebglError("Failed to create WebGL context.");
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    wallBoxesRef.current = [];
    artworkMeshesRef.current.clear();
    buildScene(scene);

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      const cam = cameraRef.current;
      if (!cam) { renderer.render(scene, camera); return; }

      if (isPointerLockedRef.current) {
        const dir = new THREE.Vector3();
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
        forward.y = 0; forward.normalize();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
        right.y = 0; right.normalize();

        if (keysPressed.current.has("KeyW") || keysPressed.current.has("ArrowUp")) dir.add(forward);
        if (keysPressed.current.has("KeyS") || keysPressed.current.has("ArrowDown")) dir.sub(forward);
        if (keysPressed.current.has("KeyA") || keysPressed.current.has("ArrowLeft")) dir.sub(right);
        if (keysPressed.current.has("KeyD") || keysPressed.current.has("ArrowRight")) dir.add(right);

        if (dir.length() > 0) {
          dir.normalize().multiplyScalar(MOVE_SPEED);
          const newPos = cam.position.clone().add(dir);
          if (!checkCollision(newPos)) cam.position.copy(newPos);
          else {
            const xOnly = cam.position.clone();
            xOnly.x += dir.x;
            if (!checkCollision(xOnly)) cam.position.x = xOnly.x;
            const zOnly = cam.position.clone();
            zOnly.z += dir.z;
            if (!checkCollision(zOnly)) cam.position.z = zOnly.z;
          }
        }
        playerPosRef.current = { x: cam.position.x, z: cam.position.z, rotation: euler.current.y };
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [artistRooms, buildScene, checkCollision, hallwayLen]);

  useEffect(() => {
    const movementKeys = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedArtworkRef.current) return;
      if (movementKeys.has(e.code) && isPointerLockedRef.current) e.preventDefault();
      keysPressed.current.add(e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (movementKeys.has(e.code)) e.preventDefault();
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
    }, 100);
    return () => clearInterval(interval);
  }, [isPointerLocked]);

  const requestPointerLock = () => {
    if (containerRef.current && typeof containerRef.current.requestPointerLock === "function") {
      containerRef.current.requestPointerLock();
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

  if (webglError) {
    return (
      <div className="relative w-full bg-gradient-to-b from-stone-900 to-black rounded-lg overflow-hidden flex items-center justify-center" style={{ height: "600px" }} data-testid="webgl-fallback">
        <Card className="p-8 max-w-md text-center space-y-4">
          <Box className="w-16 h-16 mx-auto text-muted-foreground" />
          <h2 className="font-serif text-2xl font-bold">3D Gallery Unavailable</h2>
          <p className="text-muted-foreground">{webglError}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-lg overflow-hidden" style={{ height: "600px" }}>
      <div ref={containerRef} className="absolute inset-0 cursor-crosshair" style={{ zIndex: 0 }} />

      {!isPointerLocked && !selectedArtwork && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm" style={{ zIndex: 10 }}>
          <Card className="p-8 max-w-md text-center space-y-6">
            <h2 className="font-serif text-2xl font-bold">Museum Hallway</h2>
            <p className="text-muted-foreground">
              Walk through a hallway with individual artist rooms on each side.
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
            <Button size="lg" onClick={() => { requestPointerLock(); }} className="w-full" data-testid="button-enter-gallery">
              <Move className="w-4 h-4 mr-2" />
              Enter Museum
            </Button>
            <p className="text-xs text-muted-foreground">Press Escape to release cursor</p>
          </Card>
        </div>
      )}

      {isPointerLocked && !selectedArtwork && (
        <div style={{ zIndex: 5 }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-4 h-4 border-2 border-white/50 rounded-full" />
          </div>
          <div className="absolute bottom-4 left-4 text-white/70 text-sm space-y-1">
            <p>WASD to move | Mouse to look</p>
            <p>Click artwork to view | ESC to exit</p>
          </div>
        </div>
      )}

      <Button size="icon" variant="ghost" className="absolute top-4 right-4 text-white/70" onClick={toggleFullscreen} data-testid="button-fullscreen" style={{ zIndex: 5 }}>
        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
      </Button>

      {isPointerLocked && (
        <Button size="icon" variant="ghost" className="absolute top-4 right-16 text-white/70" onClick={() => setShowMinimap(!showMinimap)} data-testid="button-toggle-minimap" style={{ zIndex: 5 }}>
          <MapIcon className="w-5 h-5" />
        </Button>
      )}

      {showMinimap && isPointerLocked && (
        <Minimap
          artistRooms={artistRooms}
          placements={placements}
          hallLeft={hallLeft}
          hallRight={hallRight}
          hallwayLen={hallwayLen}
          playerPosition={playerPosition}
        />
      )}

      {selectedArtwork && (
        <div className="absolute inset-0 flex bg-black/80 backdrop-blur-sm" style={{ zIndex: 50 }} data-testid="artwork-detail-panel">
          <div className="flex-1 relative min-w-0">
            <img src={selectedArtwork.imageUrl} alt={selectedArtwork.title} className="w-full h-full object-contain bg-black/40" />
          </div>
          <div className="w-64 flex flex-col bg-card p-4 gap-3 relative">
            <Button size="icon" variant="ghost" className="absolute top-2 right-2" onClick={() => { setSelectedArtwork(null); requestPointerLock(); }} data-testid="button-close-artwork">
              <X className="w-5 h-5" />
            </Button>
            <div>
              <h3 className="font-serif text-base font-bold leading-tight">{selectedArtwork.title}</h3>
              <p className="text-sm text-muted-foreground">by {selectedArtwork.artist.name}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary">{selectedArtwork.category}</Badge>
              <Badge variant="outline">{selectedArtwork.medium}</Badge>
              {selectedArtwork.year && <Badge variant="outline">{selectedArtwork.year}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground flex-1">{selectedArtwork.description}</p>
            <div className="pt-2 border-t space-y-2">
              <div>
                <p className="text-lg font-bold text-primary">{parseInt(selectedArtwork.price).toLocaleString()}</p>
                {selectedArtwork.dimensions && <p className="text-xs text-muted-foreground">{selectedArtwork.dimensions}</p>}
              </div>
              {selectedArtwork.isForSale && (
                <Button className="w-full" onClick={handleAddToCart} disabled={isInCart} data-testid="button-add-to-cart-3d">
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
