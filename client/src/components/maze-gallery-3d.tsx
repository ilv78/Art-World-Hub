import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, ShoppingCart, Info, Move, Mouse, Keyboard, Maximize2, Minimize2, ZoomIn, ZoomOut, Box } from "lucide-react";
import type { ArtworkWithArtist, MazeLayout, MazeCell } from "@shared/schema";
import { useCartStore } from "@/lib/cart-store";
import { useToast } from "@/hooks/use-toast";

interface MazeGallery3DProps {
  artworks: ArtworkWithArtist[];
  layout?: MazeLayout;
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

const CELL_SIZE = 8;
const WALL_HEIGHT = 4;
const WALL_THICKNESS = 0.2;
const PLAYER_HEIGHT = 1.7;
const MOVE_SPEED = 0.08;
const LOOK_SPEED = 0.002;

export function MazeGallery3D({ artworks, layout = defaultLayout }: MazeGallery3DProps) {
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
  
  const keysPressed = useRef<Set<string>>(new Set());
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  const velocity = useRef(new THREE.Vector3());
  
  const { addItem, items } = useCartStore();
  const { toast } = useToast();

  const isInCart = selectedArtwork ? items.some(item => item.artwork.id === selectedArtwork.id) : false;

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
    const floorGeometry = new THREE.PlaneGeometry(layout.width * CELL_SIZE + 4, layout.height * CELL_SIZE + 4);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a2a2a,
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
      color: 0x1a1a1a,
      roughness: 0.9,
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(layout.width * CELL_SIZE / 2, WALL_HEIGHT, layout.height * CELL_SIZE / 2);
    scene.add(ceiling);

    // Wall material
    const wallMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3d3d3d,
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
  }, [layout]);

  // Place artworks on walls
  const placeArtworks = useCallback((scene: THREE.Scene) => {
    const textureLoader = new THREE.TextureLoader();
    let artworkIndex = 0;

    layout.cells.forEach((cell) => {
      cell.artworkSlots.forEach((slot) => {
        if (artworkIndex >= artworks.length) return;
        
        const artwork = artworks[artworkIndex];
        artworkIndex++;

        const [cellX, cellZ, direction] = slot.wallId.split("-");
        const baseX = parseInt(cellX) * CELL_SIZE;
        const baseZ = parseInt(cellZ) * CELL_SIZE;

        // Create frame
        const frameSize = 2.5;
        const frameDepth = 0.1;
        const frameGeometry = new THREE.BoxGeometry(frameSize + 0.2, frameSize + 0.2, frameDepth);
        const frameMaterial = new THREE.MeshStandardMaterial({ 
          color: 0x8b4513,
          roughness: 0.5,
          metalness: 0.3,
        });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);

        // Create artwork plane
        const artworkGeometry = new THREE.PlaneGeometry(frameSize, frameSize);
        
        textureLoader.load(
          artwork.imageUrl,
          (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            const artworkMaterial = new THREE.MeshStandardMaterial({ 
              map: texture,
              roughness: 0.3,
            });
            const artworkMesh = new THREE.Mesh(artworkGeometry, artworkMaterial);
            
            // Position based on wall direction
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

            frame.position.set(x, PLAYER_HEIGHT + 0.3, z);
            frame.rotation.y = rotY;
            
            artworkMesh.position.set(x, PLAYER_HEIGHT + 0.3, z);
            artworkMesh.rotation.y = rotY;
            artworkMesh.translateZ(frameDepth / 2 + 0.01);
            
            scene.add(frame);
            scene.add(artworkMesh);
            
            artworkMeshesRef.current.set(artwork.id, { mesh: artworkMesh, artwork });
          },
          undefined,
          () => {
            // Fallback if image fails to load
            const placeholderMaterial = new THREE.MeshStandardMaterial({ 
              color: 0x666666,
              roughness: 0.5,
            });
            const artworkMesh = new THREE.Mesh(artworkGeometry, placeholderMaterial);
            
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

            frame.position.set(x, PLAYER_HEIGHT + 0.3, z);
            frame.rotation.y = rotY;
            
            artworkMesh.position.set(x, PLAYER_HEIGHT + 0.3, z);
            artworkMesh.rotation.y = rotY;
            artworkMesh.translateZ(frameDepth / 2 + 0.01);
            
            scene.add(frame);
            scene.add(artworkMesh);
            
            artworkMeshesRef.current.set(artwork.id, { mesh: artworkMesh, artwork });
          }
        );
      });
    });
  }, [layout, artworks]);

  // Setup lighting - minimal to avoid shader limits
  const setupLighting = useCallback((scene: THREE.Scene) => {
    // Main ambient light for overall visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Single directional light for shadows and depth
    const directionalLight = new THREE.DirectionalLight(0xfff5e6, 0.5);
    directionalLight.position.set(layout.width * CELL_SIZE / 2, WALL_HEIGHT * 2, layout.height * CELL_SIZE / 2);
    scene.add(directionalLight);

    // Just one central hemisphere light for soft fill
    const hemiLight = new THREE.HemisphereLight(0xfff5e6, 0x444444, 0.3);
    scene.add(hemiLight);
  }, [layout]);

  // Collision detection
  const checkCollision = useCallback((position: THREE.Vector3): boolean => {
    const margin = 0.5;
    
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
    if (position.x < 0.5 || position.x > layout.width * CELL_SIZE - 0.5 ||
        position.z < 0.5 || position.z > layout.height * CELL_SIZE - 0.5) {
      return true;
    }
    
    return false;
  }, [layout]);

  // Handle artwork click
  const handleClick = useCallback((event: MouseEvent) => {
    if (!cameraRef.current || !sceneRef.current || !isPointerLocked) return;

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
  }, [isPointerLocked]);

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
    scene.background = new THREE.Color(0x0a0a0a);
    scene.fog = new THREE.Fog(0x0a0a0a, 5, 40);
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

      if (isPointerLocked && cameraRef.current) {
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
  }, [layout, artworks, createMaze, placeArtworks, setupLighting, checkCollision]);

  // Pointer lock and controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedArtwork) return;
      keysPressed.current.add(e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPointerLocked || !cameraRef.current) return;

      euler.current.setFromQuaternion(cameraRef.current.quaternion);
      euler.current.y -= e.movementX * LOOK_SPEED;
      euler.current.x -= e.movementY * LOOK_SPEED;
      euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x));
      cameraRef.current.quaternion.setFromEuler(euler.current);
    };

    const handlePointerLockChange = () => {
      setIsPointerLocked(document.pointerLockElement === containerRef.current);
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
  }, [isPointerLocked, selectedArtwork, handleClick]);

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
      <div className="relative w-full h-full min-h-[600px] bg-gradient-to-b from-stone-900 to-black rounded-lg overflow-hidden flex items-center justify-center" data-testid="webgl-fallback">
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
    <div className="relative w-full h-full min-h-[600px] bg-black rounded-lg overflow-hidden">
      <div ref={containerRef} className="w-full h-full cursor-crosshair" />

      {/* Controls overlay */}
      {!isPointerLocked && !selectedArtwork && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
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
        <>
          {/* Crosshair */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-4 h-4 border-2 border-white/50 rounded-full" />
          </div>

          {/* Mini instructions */}
          <div className="absolute bottom-4 left-4 text-white/70 text-sm space-y-1">
            <p>WASD to move | Mouse to look</p>
            <p>Click artwork to view | ESC to pause</p>
          </div>
        </>
      )}

      {/* Fullscreen button */}
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/10"
        onClick={toggleFullscreen}
        data-testid="button-fullscreen"
      >
        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
      </Button>

      {/* Artwork detail panel */}
      {selectedArtwork && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
          <Card className="max-w-2xl w-full mx-4 overflow-hidden">
            <div className="relative aspect-square max-h-[50vh]">
              <img
                src={selectedArtwork.imageUrl}
                alt={selectedArtwork.title}
                className="w-full h-full object-cover"
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => {
                  setSelectedArtwork(null);
                  requestPointerLock();
                }}
                data-testid="button-close-artwork"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h2 className="font-serif text-2xl font-bold">{selectedArtwork.title}</h2>
                <p className="text-muted-foreground">by {selectedArtwork.artist.name}</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{selectedArtwork.category}</Badge>
                <Badge variant="outline">{selectedArtwork.medium}</Badge>
                {selectedArtwork.year && (
                  <Badge variant="outline">{selectedArtwork.year}</Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground">{selectedArtwork.description}</p>

              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <p className="text-2xl font-bold text-primary">
                    ${parseFloat(selectedArtwork.price).toLocaleString()}
                  </p>
                  {selectedArtwork.dimensions && (
                    <p className="text-sm text-muted-foreground">{selectedArtwork.dimensions}</p>
                  )}
                </div>
                
                {selectedArtwork.isForSale && (
                  <Button
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
          </Card>
        </div>
      )}
    </div>
  );
}
