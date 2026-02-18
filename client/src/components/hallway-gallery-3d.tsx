import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, ShoppingCart, Move, Mouse, Keyboard, Maximize2, Minimize2, ZoomIn, Box, Map as MapIcon, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RotateCcw, RotateCw } from "lucide-react";
import type { ArtworkWithArtist } from "@shared/schema";
import { useCartStore } from "@/lib/cart-store";
import { useToast } from "@/hooks/use-toast";

interface ArtistRoom {
  artist: { id: string; name: string; avatarUrl: string | null; specialization: string | null };
  artworks: ArtworkWithArtist[];
}

interface HallwayGallery3DProps {
  artistRooms: ArtistRoom[];
}

const WALL_H = 3;
const WALL_T = 0.15;
const PLAYER_H = 1.7;
const MOVE_SPEED = 0.08;
const LOOK_SPEED = 0.002;

const HALLWAY_W = 3;
const DOOR_W = 2.2;

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

interface RoomInfo {
  roomW: number;
  roomD: number;
  centerZ: number;
  centerX: number;
  farX: number;
  isLeft: boolean;
}

const ART_SPACING = 2.8;

function computeRoomSize(artworkCount: number): { roomW: number; roomD: number } {
  if (artworkCount <= 0) return { roomW: 3.5, roomD: 3.5 };
  const farCount = Math.ceil(artworkCount / 3);
  const remaining = artworkCount - farCount;
  const sideCount = Math.ceil(remaining / 2);
  const roomW = Math.max(3.5, farCount * ART_SPACING + 1);
  const roomD = Math.max(3.5, sideCount * ART_SPACING + 1);
  return { roomW, roomD };
}

function computeAllRooms(artistRooms: ArtistRoom[]): { rooms: RoomInfo[]; hallwayLen: number; maxRoomD: number } {
  const hallLeft = -HALLWAY_W / 2;
  const hallRight = HALLWAY_W / 2;
  const roomInfos: RoomInfo[] = [];
  const pairZStarts: number[] = [];
  let cursor = 1;
  const numPairs = Math.ceil(artistRooms.length / 2);

  for (let p = 0; p < numPairs; p++) {
    const leftIdx = p * 2;
    const rightIdx = p * 2 + 1;
    const leftSize = computeRoomSize(artistRooms[leftIdx]?.artworks.length ?? 0);
    const rightSize = rightIdx < artistRooms.length ? computeRoomSize(artistRooms[rightIdx].artworks.length) : { roomW: 0, roomD: 0 };
    const pairW = Math.max(leftSize.roomW, rightSize.roomW);
    pairZStarts.push(cursor);
    cursor += pairW + 0.5;
  }

  let maxRoomD = 3.5;
  for (let i = 0; i < artistRooms.length; i++) {
    const pairIdx = Math.floor(i / 2);
    const isLeft = i % 2 === 0;
    const { roomD: myD } = computeRoomSize(artistRooms[i].artworks.length);
    const pairW = (pairZStarts[pairIdx + 1] ?? cursor) - pairZStarts[pairIdx] - 0.5;
    const roomW = pairW;
    const roomD = myD;
    if (roomD > maxRoomD) maxRoomD = roomD;
    const centerZ = pairZStarts[pairIdx] + roomW / 2;
    const centerX = isLeft ? hallLeft - roomD / 2 : hallRight + roomD / 2;
    const farX = isLeft ? hallLeft - roomD : hallRight + roomD;
    roomInfos.push({ roomW, roomD, centerZ, centerX, farX, isLeft });
  }

  const hallwayLen = Math.max(cursor, 4);
  return { rooms: roomInfos, hallwayLen, maxRoomD };
}

function Minimap({ artistRooms, roomInfos, hallLeft, hallRight, totalW, totalD, mapScale, playerPosition }: {
  artistRooms: ArtistRoom[];
  roomInfos: RoomInfo[];
  hallLeft: number;
  hallRight: number;
  totalW: number;
  totalD: number;
  mapScale: number;
  playerPosition: { x: number; z: number; rotation: number };
}) {
  const mapW = totalW * mapScale + 8;
  const mapH = totalD * mapScale + 8;
  const ox = mapW / 2;
  const oz = 4;

  return (
    <div className="absolute top-16 right-4 bg-black/70 rounded-lg p-2 border border-white/20" style={{ zIndex: 5 }} data-testid="minimap">
      <svg width={Math.min(mapW, 180)} height={Math.min(mapH, 200)} viewBox={`0 0 ${mapW} ${mapH}`} className="block">
        <rect x={0} y={0} width={mapW} height={mapH} fill="rgba(30,30,30,0.8)" rx={4} />
        <rect x={ox + hallLeft * mapScale} y={oz} width={HALLWAY_W * mapScale} height={totalD * mapScale} fill="rgba(200,195,185,0.4)" />
        {roomInfos.map((ri, i) => {
          const rZ = ri.centerZ - ri.roomW / 2;
          const rX = ri.isLeft ? hallLeft - ri.roomD : hallRight;
          return (
            <g key={artistRooms[i]?.artist.id ?? i}>
              <rect
                x={ox + rX * mapScale}
                y={oz + rZ * mapScale}
                width={ri.roomD * mapScale}
                height={ri.roomW * mapScale}
                fill="rgba(249, 115, 22, 0.3)"
                stroke="rgba(249, 115, 22, 0.5)"
                strokeWidth={0.5}
              />
              <text
                x={ox + (rX + ri.roomD / 2) * mapScale}
                y={oz + (rZ + ri.roomW / 2) * mapScale}
                fill="rgba(255,255,255,0.7)"
                fontSize={6}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {artistRooms[i]?.artist.name.split(" ").pop()}
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
  const virtualKeysPressed = useRef<Set<string>>(new Set());
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  const playerPosRef = useRef({ x: 0, z: 0, rotation: 0 });
  const isPointerLockedRef = useRef(false);
  const isFocusedRef = useRef(false);
  const [isFocused, setIsFocused] = useState(false);
  const isDraggingRef = useRef(false);
  const selectedArtworkRef = useRef<ArtworkWithArtist | null>(null);
  const [showArrowControls, setShowArrowControls] = useState(true);

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

  const { rooms: roomInfos, hallwayLen, maxRoomD } = useMemo(() => computeAllRooms(artistRooms), [artistRooms]);
  const totalW = HALLWAY_W + maxRoomD * 2;
  const totalD = hallwayLen;

  const buildScene = useCallback((scene: THREE.Scene) => {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.85 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xd4cdc0, roughness: 0.9 });
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xfaf8f5, roughness: 0.95 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.6, metalness: 0.2 });
    const darkFloorMat = new THREE.MeshStandardMaterial({ color: 0x3a3530, roughness: 0.8 });

    const addWall = (w: number, h: number, d: number, x: number, y: number, z: number) => {
      if (w < 0.05 || d < 0.05) return;
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      const box = new THREE.Box3().setFromObject(mesh);
      wallBoxesRef.current.push(box);
    };

    const hallLeft = -HALLWAY_W / 2;
    const hallRight = HALLWAY_W / 2;
    const hallEnd = hallwayLen;

    // Floor
    const floorGeo = new THREE.PlaneGeometry(totalW + 4, totalD + 4);
    const floor = new THREE.Mesh(floorGeo, darkFloorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, hallEnd / 2);
    floor.receiveShadow = true;
    scene.add(floor);

    // Hallway floor (lighter)
    const hallFloorGeo = new THREE.PlaneGeometry(HALLWAY_W - 0.2, hallEnd);
    const hallFloor = new THREE.Mesh(hallFloorGeo, floorMat);
    hallFloor.rotation.x = -Math.PI / 2;
    hallFloor.position.set(0, 0.005, hallEnd / 2);
    hallFloor.receiveShadow = true;
    scene.add(hallFloor);

    // Ceiling
    const ceilingGeo = new THREE.PlaneGeometry(totalW + 4, totalD + 4);
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, WALL_H, hallEnd / 2);
    scene.add(ceiling);

    // Front and back walls
    addWall(totalW + 2, WALL_H, WALL_T, 0, WALL_H / 2, 0);
    addWall(totalW + 2, WALL_H, WALL_T, 0, WALL_H / 2, hallEnd);

    type DoorInfo = { centerZ: number; halfGap: number };
    const leftDoors: DoorInfo[] = [];
    const rightDoors: DoorInfo[] = [];

    for (let i = 0; i < roomInfos.length; i++) {
      const ri = roomInfos[i];
      (ri.isLeft ? leftDoors : rightDoors).push({ centerZ: ri.centerZ, halfGap: DOOR_W / 2 });
    }

    const buildSideWall = (wallX: number, doors: DoorInfo[]) => {
      const sortedDoors = [...doors].sort((a, b) => a.centerZ - b.centerZ);
      let cursor = 0;
      for (const door of sortedDoors) {
        const doorStart = door.centerZ - door.halfGap;
        const doorEnd = door.centerZ + door.halfGap;
        const segLen = doorStart - cursor;
        if (segLen > 0.1) {
          addWall(WALL_T, WALL_H, segLen, wallX, WALL_H / 2, cursor + segLen / 2);
        }
        const lintelGeo = new THREE.BoxGeometry(WALL_T, WALL_H * 0.2, DOOR_W);
        const lintelMesh = new THREE.Mesh(lintelGeo, accentMat);
        lintelMesh.position.set(wallX, WALL_H * 0.9, door.centerZ);
        scene.add(lintelMesh);
        cursor = doorEnd;
      }
      const remaining = hallEnd - cursor;
      if (remaining > 0.1) {
        addWall(WALL_T, WALL_H, remaining, wallX, WALL_H / 2, cursor + remaining / 2);
      }
    };

    buildSideWall(hallLeft, leftDoors);
    buildSideWall(hallRight, rightDoors);

    for (let i = 0; i < artistRooms.length; i++) {
      const ri = roomInfos[i];
      const room = artistRooms[i];

      const roomFloorGeo = new THREE.PlaneGeometry(ri.roomD, ri.roomW);
      const roomFloor = new THREE.Mesh(roomFloorGeo, floorMat);
      roomFloor.rotation.x = -Math.PI / 2;
      roomFloor.position.set(ri.centerX, 0.005, ri.centerZ);
      roomFloor.receiveShadow = true;
      scene.add(roomFloor);

      addWall(ri.roomD, WALL_H, WALL_T, ri.centerX, WALL_H / 2, ri.centerZ - ri.roomW / 2);
      addWall(ri.roomD, WALL_H, WALL_T, ri.centerX, WALL_H / 2, ri.centerZ + ri.roomW / 2);
      addWall(WALL_T, WALL_H, ri.roomW, ri.farX, WALL_H / 2, ri.centerZ);

      this_placeArtworks(scene, room, ri);

      addNamePlaque(scene, room.artist.name, ri.isLeft ? hallLeft + 0.2 : hallRight - 0.2, ri.centerZ, ri.isLeft);
    }

    const ambientLight = new THREE.AmbientLight(0xfff8f0, 0.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(0, WALL_H * 2, hallEnd / 2);
    scene.add(dirLight);

    for (let z = 2; z < hallEnd; z += 3) {
      const pl = new THREE.PointLight(0xfff5e6, 0.8, 12);
      pl.position.set(0, WALL_H - 0.2, z);
      scene.add(pl);
    }

    for (let i = 0; i < roomInfos.length; i++) {
      const ri = roomInfos[i];
      const roomLight = new THREE.PointLight(0xffffff, 1.0, 12);
      roomLight.position.set(ri.centerX, WALL_H - 0.2, ri.centerZ);
      scene.add(roomLight);
    }
  }, [artistRooms, roomInfos, hallwayLen, totalW, totalD]);

  function this_placeArtworks(
    scene: THREE.Scene,
    room: ArtistRoom,
    ri: RoomInfo,
  ) {
    const artworks = room.artworks;
    if (!artworks.length) return;

    const maxArtSize = 2.4;
    const { roomW, roomD, centerZ: roomCenterZ, centerX: roomCenterX, farX: roomFarX, isLeft } = ri;

    type WallSlot = { x: number; z: number; rotY: number };
    const slots: WallSlot[] = [];

    const farWallZ1 = roomCenterZ - roomW / 2 + 0.5;
    const farWallZ2 = roomCenterZ + roomW / 2 - 0.5;
    const farLen = farWallZ2 - farWallZ1;

    const farCount = Math.max(1, Math.floor(farLen / ART_SPACING) + 1);
    for (let j = 0; j < farCount; j++) {
      const t = (j + 0.5) / farCount;
      const z = farWallZ1 + t * farLen;
      slots.push({
        x: roomFarX + (isLeft ? 0.25 : -0.25),
        z,
        rotY: isLeft ? Math.PI / 2 : -Math.PI / 2,
      });
    }

    const sideWallX1 = isLeft ? roomFarX + 0.25 : roomFarX - 0.25;
    const sideWallX2 = isLeft ? roomCenterX + roomD / 2 - 0.25 : roomCenterX - roomD / 2 + 0.25;

    const sideLen = Math.abs(sideWallX2 - sideWallX1);
    const sideCount = Math.max(1, Math.floor(sideLen / ART_SPACING) + 1);
    for (let j = 0; j < sideCount; j++) {
      const t = (j + 0.5) / sideCount;
      const x = sideWallX1 + t * (sideWallX2 - sideWallX1);
      slots.push({ x, z: roomCenterZ - roomW / 2 + 0.25, rotY: 0 });
    }
    for (let j = 0; j < sideCount; j++) {
      const t = (j + 0.5) / sideCount;
      const x = sideWallX1 + t * (sideWallX2 - sideWallX1);
      slots.push({ x, z: roomCenterZ + roomW / 2 - 0.25, rotY: Math.PI });
    }

    for (let ai = 0; ai < artworks.length && ai < slots.length; ai++) {
      const artwork = artworks[ai];
      const slot = slots[ai];

      const dims = artworkScale(artwork.dimensions, maxArtSize);

      const artGeo = new THREE.PlaneGeometry(dims.w, dims.h);
      const placeholderMat = new THREE.MeshStandardMaterial({ color: 0xddd8d0, roughness: 0.5 });
      const artMesh = new THREE.Mesh(artGeo, placeholderMat);
      artMesh.position.set(slot.x, PLAYER_H + 0.5, slot.z);
      artMesh.rotation.y = slot.rotY;
      artMesh.translateZ(0.06);
      scene.add(artMesh);
      artworkMeshesRef.current.set(artwork.id, { mesh: artMesh, artwork });

      loadTextureWithCache(artwork.imageUrl).then(texture => {
        artMesh.material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.3 });
      }).catch(() => {
        artMesh.material = new THREE.MeshStandardMaterial({ color: 0xc0b8a8, roughness: 0.5 });
      });

      const spotLight = new THREE.SpotLight(0xfff5e6, 2.0, 8, Math.PI / 5, 0.5);
      spotLight.position.set(slot.x, WALL_H - 0.3, slot.z);
      spotLight.target = artMesh;
      scene.add(spotLight);
      scene.add(spotLight.target);
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
    if (!cameraRef.current || !sceneRef.current || (!isPointerLockedRef.current && !isFocusedRef.current)) return;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), cameraRef.current);
    const meshes = Array.from(artworkMeshesRef.current.values()).map(v => v.mesh);
    const intersects = raycaster.intersectObjects(meshes);
    if (intersects.length > 0 && intersects[0].distance < 6) {
      const mesh = intersects[0].object as THREE.Mesh;
      const entries = Array.from(artworkMeshesRef.current.entries());
      for (let ei = 0; ei < entries.length; ei++) {
        if (entries[ei][1].mesh === mesh) {
          setSelectedArtwork(entries[ei][1].artwork);
          virtualKeysPressed.current.clear();
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
    scene.background = new THREE.Color(0x1a1915);
    scene.fog = new THREE.Fog(0x1a1915, 12, 50);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
    camera.position.set(0, PLAYER_H, 0.8);
    camera.lookAt(0, PLAYER_H, hallwayLen / 2);
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

      const allKeys = new Set(Array.from(keysPressed.current).concat(Array.from(virtualKeysPressed.current)));
      const isActive = isPointerLockedRef.current || isFocusedRef.current || virtualKeysPressed.current.size > 0;

      if (isActive) {
        if (allKeys.has("RotateLeft")) {
          euler.current.y += 0.03;
          cam.quaternion.setFromEuler(euler.current);
        }
        if (allKeys.has("RotateRight")) {
          euler.current.y -= 0.03;
          cam.quaternion.setFromEuler(euler.current);
        }

        const dir = new THREE.Vector3();
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
        forward.y = 0; forward.normalize();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
        right.y = 0; right.normalize();

        if (allKeys.has("KeyW") || allKeys.has("ArrowUp")) dir.add(forward);
        if (allKeys.has("KeyS") || allKeys.has("ArrowDown")) dir.sub(forward);
        if (allKeys.has("KeyA") || allKeys.has("ArrowLeft")) dir.sub(right);
        if (allKeys.has("KeyD") || allKeys.has("ArrowRight")) dir.add(right);

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
      if (movementKeys.has(e.code) && (isPointerLockedRef.current || isFocusedRef.current)) e.preventDefault();
      keysPressed.current.add(e.code);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (movementKeys.has(e.code)) e.preventDefault();
      keysPressed.current.delete(e.code);
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!cameraRef.current) return;
      if (isPointerLockedRef.current) {
        euler.current.setFromQuaternion(cameraRef.current.quaternion);
        euler.current.y -= e.movementX * LOOK_SPEED;
        euler.current.x -= e.movementY * LOOK_SPEED;
        euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x));
        cameraRef.current.quaternion.setFromEuler(euler.current);
      } else if (isDraggingRef.current && isFocusedRef.current) {
        euler.current.setFromQuaternion(cameraRef.current.quaternion);
        euler.current.y -= e.movementX * LOOK_SPEED;
        euler.current.x -= e.movementY * LOOK_SPEED;
        euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x));
        cameraRef.current.quaternion.setFromEuler(euler.current);
      }
    };
    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === containerRef.current;
      isPointerLockedRef.current = locked;
      setIsPointerLocked(locked);
    };
    const handleMouseDown = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (inside) {
        isDraggingRef.current = true;
        if (!isFocusedRef.current) {
          isFocusedRef.current = true;
          setIsFocused(true);
        }
      } else if (isFocusedRef.current) {
        isFocusedRef.current = false;
        setIsFocused(false);
        keysPressed.current.clear();
      }
    };
    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };
    const handleBlur = () => {
      isFocusedRef.current = false;
      setIsFocused(false);
      keysPressed.current.clear();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("click", handleClick);
    };
  }, [handleClick]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlayerPosition(prev => {
        const ref = playerPosRef.current;
        if (Math.abs(prev.x - ref.x) > 0.05 || Math.abs(prev.z - ref.z) > 0.05 || Math.abs(prev.rotation - ref.rotation) > 0.05)
          return { ...ref };
        return prev;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

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

  const hallLeft = -HALLWAY_W / 2;
  const hallRight = HALLWAY_W / 2;
  const mapScale = 12;

  return (
    <div className="relative w-full rounded-lg overflow-hidden" style={{ height: "600px" }}>
      <div ref={containerRef} className="absolute inset-0 cursor-crosshair" style={{ zIndex: 0 }} />

      {!isPointerLocked && !isFocused && !selectedArtwork && (
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
                <span>Click + Drag</span>
                <span className="text-muted-foreground text-xs">Look around</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <ZoomIn className="w-8 h-8 text-primary" />
                <span>Click</span>
                <span className="text-muted-foreground text-xs">View artwork</span>
              </div>
            </div>
            <Button size="lg" onClick={() => { isFocusedRef.current = true; setIsFocused(true); try { containerRef.current?.requestPointerLock(); } catch {} }} className="w-full" data-testid="button-enter-gallery">
              <Move className="w-4 h-4 mr-2" />
              Enter Museum
            </Button>
            <p className="text-xs text-muted-foreground">Click outside the gallery to exit</p>
          </Card>
        </div>
      )}

      {(isPointerLocked || isFocused) && !selectedArtwork && (
        <div style={{ zIndex: 5 }}>
          {isPointerLocked && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-4 h-4 border-2 border-white/50 rounded-full" />
            </div>
          )}
          <div className="absolute bottom-4 left-4 text-white/70 text-sm space-y-1">
            <p>WASD to move | Click+Drag to look</p>
            <p>Click artwork to view</p>
          </div>
        </div>
      )}

      <Button size="icon" variant="ghost" className="absolute top-4 right-4 text-white/70" onClick={toggleFullscreen} data-testid="button-fullscreen" style={{ zIndex: 5 }}>
        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
      </Button>

      {(isPointerLocked || isFocused) && (
        <Button size="icon" variant="ghost" className="absolute top-4 right-16 text-white/70" onClick={() => setShowMinimap(!showMinimap)} data-testid="button-toggle-minimap" style={{ zIndex: 5 }}>
          <MapIcon className="w-5 h-5" />
        </Button>
      )}

      {!selectedArtwork && showArrowControls && (
        <div className="absolute bottom-6 right-6 select-none" style={{ zIndex: 10 }} data-testid="arrow-controls">
          <div className="grid grid-cols-3 gap-1" style={{ width: "144px" }}>
            <button
              className="w-11 h-11 rounded-md bg-white/15 border border-white/20 flex items-center justify-center text-white/80 hover:bg-white/25 active:bg-white/35 transition-colors"
              onPointerDown={() => virtualKeysPressed.current.add("RotateLeft")}
              onPointerUp={() => virtualKeysPressed.current.delete("RotateLeft")}
              onPointerLeave={() => virtualKeysPressed.current.delete("RotateLeft")}
              data-testid="button-rotate-left"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              className="w-11 h-11 rounded-md bg-white/15 border border-white/20 flex items-center justify-center text-white/80 hover:bg-white/25 active:bg-white/35 transition-colors"
              onPointerDown={() => virtualKeysPressed.current.add("KeyW")}
              onPointerUp={() => virtualKeysPressed.current.delete("KeyW")}
              onPointerLeave={() => virtualKeysPressed.current.delete("KeyW")}
              data-testid="button-move-forward"
            >
              <ChevronUp className="w-6 h-6" />
            </button>
            <button
              className="w-11 h-11 rounded-md bg-white/15 border border-white/20 flex items-center justify-center text-white/80 hover:bg-white/25 active:bg-white/35 transition-colors"
              onPointerDown={() => virtualKeysPressed.current.add("RotateRight")}
              onPointerUp={() => virtualKeysPressed.current.delete("RotateRight")}
              onPointerLeave={() => virtualKeysPressed.current.delete("RotateRight")}
              data-testid="button-rotate-right"
            >
              <RotateCw className="w-5 h-5" />
            </button>
            <button
              className="w-11 h-11 rounded-md bg-white/15 border border-white/20 flex items-center justify-center text-white/80 hover:bg-white/25 active:bg-white/35 transition-colors"
              onPointerDown={() => virtualKeysPressed.current.add("KeyA")}
              onPointerUp={() => virtualKeysPressed.current.delete("KeyA")}
              onPointerLeave={() => virtualKeysPressed.current.delete("KeyA")}
              data-testid="button-move-left"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              className="w-11 h-11 rounded-md bg-white/15 border border-white/20 flex items-center justify-center text-white/80 hover:bg-white/25 active:bg-white/35 transition-colors"
              onPointerDown={() => virtualKeysPressed.current.add("KeyS")}
              onPointerUp={() => virtualKeysPressed.current.delete("KeyS")}
              onPointerLeave={() => virtualKeysPressed.current.delete("KeyS")}
              data-testid="button-move-backward"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
            <button
              className="w-11 h-11 rounded-md bg-white/15 border border-white/20 flex items-center justify-center text-white/80 hover:bg-white/25 active:bg-white/35 transition-colors"
              onPointerDown={() => virtualKeysPressed.current.add("KeyD")}
              onPointerUp={() => virtualKeysPressed.current.delete("KeyD")}
              onPointerLeave={() => virtualKeysPressed.current.delete("KeyD")}
              data-testid="button-move-right"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {showMinimap && <Minimap
        artistRooms={artistRooms}
        roomInfos={roomInfos}
        hallLeft={hallLeft}
        hallRight={hallRight}
        totalW={totalW}
        totalD={totalD}
        mapScale={mapScale}
        playerPosition={playerPosition}
      />}

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
                <p className="text-lg font-bold text-primary">${parseFloat(selectedArtwork.price).toLocaleString()}</p>
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
