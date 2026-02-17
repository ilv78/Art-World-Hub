import { useEffect, useRef, useState, useCallback } from "react";
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

const WALL_H = 5.5;
const WALL_T = 0.18;
const PLAYER_H = 1.7;
const MOVE_SPEED = 0.12;
const LOOK_SPEED = 0.002;

const HALLWAY_W = 5;
const ROOM_W = 7;
const ROOM_D = 6;
const DOOR_W = 3.2;

const textureCache = new Map<string, THREE.Texture>();
const loadingTextures = new Map<string, Promise<THREE.Texture>>();

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
      img.src = url + (attempt > 1 ? `?retry=${attempt}` : "");
    };
    tryLoad();
  });
  loadingTextures.set(url, promise);
  return promise;
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

  const numPairs = Math.ceil(artistRooms.length / 2);
  const hallwayLen = Math.max(numPairs * ROOM_W + 2, 6);
  const totalW = HALLWAY_W + ROOM_D * 2;
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

    // Compute door positions for each side
    type DoorInfo = { centerZ: number; halfGap: number };
    const leftDoors: DoorInfo[] = [];
    const rightDoors: DoorInfo[] = [];

    for (let i = 0; i < artistRooms.length; i++) {
      const pairIdx = Math.floor(i / 2);
      const isLeft = i % 2 === 0;
      const roomCenterZ = pairIdx * ROOM_W + ROOM_W / 2 + 1;
      (isLeft ? leftDoors : rightDoors).push({ centerZ: roomCenterZ, halfGap: DOOR_W / 2 });
    }

    // Build hallway walls with gaps for doorways
    const buildSideWall = (wallX: number, doors: DoorInfo[]) => {
      const sortedDoors = [...doors].sort((a, b) => a.centerZ - b.centerZ);
      let cursor = 0;
      for (const door of sortedDoors) {
        const doorStart = door.centerZ - door.halfGap;
        const doorEnd = door.centerZ + door.halfGap;
        // Wall segment before this door
        const segLen = doorStart - cursor;
        if (segLen > 0.1) {
          addWall(WALL_T, WALL_H, segLen, wallX, WALL_H / 2, cursor + segLen / 2);
        }
        // Lintel above door
        const lintelGeo = new THREE.BoxGeometry(WALL_T, WALL_H * 0.25, DOOR_W);
        const lintelMesh = new THREE.Mesh(lintelGeo, accentMat);
        lintelMesh.position.set(wallX, WALL_H * 0.88, door.centerZ);
        scene.add(lintelMesh);

        cursor = doorEnd;
      }
      // Final segment after last door
      const remaining = hallEnd - cursor;
      if (remaining > 0.1) {
        addWall(WALL_T, WALL_H, remaining, wallX, WALL_H / 2, cursor + remaining / 2);
      }
    };

    buildSideWall(hallLeft, leftDoors);
    buildSideWall(hallRight, rightDoors);

    // Build artist rooms
    for (let i = 0; i < artistRooms.length; i++) {
      const pairIdx = Math.floor(i / 2);
      const isLeft = i % 2 === 0;
      const roomCenterZ = pairIdx * ROOM_W + ROOM_W / 2 + 1;
      const roomCenterX = isLeft ? hallLeft - ROOM_D / 2 : hallRight + ROOM_D / 2;
      const roomFarX = isLeft ? hallLeft - ROOM_D : hallRight + ROOM_D;

      // Room floor
      const roomFloorGeo = new THREE.PlaneGeometry(ROOM_D, ROOM_W);
      const roomFloor = new THREE.Mesh(roomFloorGeo, floorMat);
      roomFloor.rotation.x = -Math.PI / 2;
      roomFloor.position.set(roomCenterX, 0.005, roomCenterZ);
      roomFloor.receiveShadow = true;
      scene.add(roomFloor);

      // Room side walls (perpendicular to hallway)
      addWall(ROOM_D, WALL_H, WALL_T, roomCenterX, WALL_H / 2, roomCenterZ - ROOM_W / 2);
      addWall(ROOM_D, WALL_H, WALL_T, roomCenterX, WALL_H / 2, roomCenterZ + ROOM_W / 2);
      // Room far wall (parallel to hallway)
      addWall(WALL_T, WALL_H, ROOM_W, roomFarX, WALL_H / 2, roomCenterZ);

      // Place artworks
      const room = artistRooms[i];
      this_placeArtworks(scene, room, roomCenterX, roomCenterZ, roomFarX, isLeft);

      // Name plaque inside hallway facing inward
      addNamePlaque(scene, room.artist.name, isLeft ? hallLeft + 0.3 : hallRight - 0.3, roomCenterZ, isLeft);
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xfff8f0, 0.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(0, WALL_H * 2, hallEnd / 2);
    scene.add(dirLight);

    // Hallway ceiling lights
    for (let z = 2; z < hallEnd; z += 4) {
      const pl = new THREE.PointLight(0xfff5e6, 0.8, 18);
      pl.position.set(0, WALL_H - 0.3, z);
      scene.add(pl);
    }

    // Room lights
    for (let i = 0; i < artistRooms.length; i++) {
      const pairIdx = Math.floor(i / 2);
      const isLeft = i % 2 === 0;
      const roomCenterZ = pairIdx * ROOM_W + ROOM_W / 2 + 1;
      const roomCenterX = isLeft ? hallLeft - ROOM_D / 2 : hallRight + ROOM_D / 2;
      const roomLight = new THREE.PointLight(0xffffff, 1.0, 15);
      roomLight.position.set(roomCenterX, WALL_H - 0.3, roomCenterZ);
      scene.add(roomLight);
    }
  }, [artistRooms, hallwayLen, totalW, totalD]);

  function this_placeArtworks(
    scene: THREE.Scene,
    room: ArtistRoom,
    roomCenterX: number,
    roomCenterZ: number,
    roomFarX: number,
    isLeft: boolean,
  ) {
    const artworks = room.artworks;
    if (!artworks.length) return;

    const frameSize = 2.4;
    const frameDepth = 0.1;
    const spacing = 3.0;

    type WallSlot = { x: number; z: number; rotY: number };
    const slots: WallSlot[] = [];

    const farWallZ1 = roomCenterZ - ROOM_W / 2 + 0.5;
    const farWallZ2 = roomCenterZ + ROOM_W / 2 - 0.5;

    const farCount = Math.max(1, Math.floor(ROOM_W / spacing));
    for (let j = 0; j < farCount; j++) {
      const t = (j + 0.5) / farCount;
      const z = farWallZ1 + t * (farWallZ2 - farWallZ1);
      slots.push({
        x: roomFarX + (isLeft ? 0.35 : -0.35),
        z,
        rotY: isLeft ? Math.PI / 2 : -Math.PI / 2,
      });
    }

    const sideWallX1 = isLeft ? roomFarX + 0.35 : roomFarX - 0.35;
    const sideWallX2 = isLeft ? roomCenterX + ROOM_D / 2 - 0.35 : roomCenterX - ROOM_D / 2 + 0.35;

    const sideLen = Math.abs(sideWallX2 - sideWallX1);
    const sideCount = Math.max(1, Math.floor(sideLen / spacing));
    for (let j = 0; j < sideCount; j++) {
      const t = (j + 0.5) / sideCount;
      const x = sideWallX1 + t * (sideWallX2 - sideWallX1);
      slots.push({ x, z: roomCenterZ - ROOM_W / 2 + 0.35, rotY: 0 });
    }
    for (let j = 0; j < sideCount; j++) {
      const t = (j + 0.5) / sideCount;
      const x = sideWallX1 + t * (sideWallX2 - sideWallX1);
      slots.push({ x, z: roomCenterZ + ROOM_W / 2 - 0.35, rotY: Math.PI });
    }

    for (let ai = 0; ai < artworks.length && ai < slots.length; ai++) {
      const artwork = artworks[ai];
      const slot = slots[ai];

      const frameGeo = new THREE.BoxGeometry(frameSize + 0.2, frameSize + 0.2, frameDepth);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x2c2418, roughness: 0.5, metalness: 0.3 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(slot.x, PLAYER_H + 0.5, slot.z);
      frame.rotation.y = slot.rotY;
      scene.add(frame);

      const artGeo = new THREE.PlaneGeometry(frameSize, frameSize);
      const placeholderMat = new THREE.MeshStandardMaterial({ color: 0xddd8d0, roughness: 0.5 });
      const artMesh = new THREE.Mesh(artGeo, placeholderMat);
      artMesh.position.set(slot.x, PLAYER_H + 0.5, slot.z);
      artMesh.rotation.y = slot.rotY;
      artMesh.translateZ(frameDepth / 2 + 0.01);
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
    if (!cameraRef.current || !sceneRef.current || !isPointerLockedRef.current) return;
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
      const isActive = isPointerLockedRef.current || virtualKeysPressed.current.size > 0;

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
  const mapScale = 8;

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
            <Button size="lg" onClick={requestPointerLock} className="w-full" data-testid="button-enter-gallery">
              <Move className="w-4 h-4 mr-2" />
              Enter Museum
            </Button>
            <p className="text-xs text-muted-foreground">Press ESC to exit walking mode</p>
          </Card>
        </div>
      )}

      {isPointerLocked && (
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

      <Button size="icon" variant="ghost" className="absolute top-4 right-4 text-white/70" onClick={toggleFullscreen} data-testid="button-fullscreen" style={{ zIndex: 5 }}>
        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
      </Button>

      {isPointerLocked && (
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
