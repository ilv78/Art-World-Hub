import { Suspense, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import type { Transform } from "./ar-scale";
import { baseArtworkSizePx } from "./ar-scale";

// r3f with `orthographic` maps world units to pixels and centres the camera at
// the origin (y-up), so the tested ar-scale math drops straight in: the artwork
// plane is sized in px and positioned from the pan/zoom transform.

interface SceneProps {
  roomImage: string;
  artworkImage: string;
  widthCm: number | null;
  heightCm: number | null;
  wallWidthCm: number;
  transform: Transform;
}

/** Scale a plane to "cover" the canvas while preserving the image's aspect. */
function coverSize(
  imgW: number,
  imgH: number,
  canvasW: number,
  canvasH: number,
): { width: number; height: number } {
  if (imgW <= 0 || imgH <= 0) return { width: canvasW, height: canvasH };
  const scale = Math.max(canvasW / imgW, canvasH / imgH);
  return { width: imgW * scale, height: imgH * scale };
}

function RoomPlane({ image }: { image: string }) {
  const texture = useTexture(image);
  const { size } = useThree();
  const img = texture.image as { width: number; height: number } | undefined;
  const cover = coverSize(img?.width ?? size.width, img?.height ?? size.height, size.width, size.height);
  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[cover.width, cover.height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function ArtworkPlane({
  image,
  widthCm,
  heightCm,
  wallWidthCm,
  transform,
}: Omit<SceneProps, "roomImage" | "artworkImage"> & { image: string }) {
  const texture = useTexture(image);
  const { size } = useThree();

  const base = useMemo(
    () => baseArtworkSizePx({ widthCm, heightCm, canvasWidthPx: size.width, wallWidthCm }),
    [widthCm, heightCm, size.width, wallWidthCm],
  );

  const w = base.width * transform.zoom;
  const h = base.height * transform.zoom;
  // Screen y is down, world y is up → negate the vertical offset.
  return (
    <mesh position={[transform.offset.x, -transform.offset.y, 1]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

export function RoomCanvas(props: SceneProps) {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 100], near: 0.1, far: 1000, zoom: 1 }}
      gl={{ preserveDrawingBuffer: true }}
      data-testid="ar-room-canvas"
    >
      <Suspense fallback={null}>
        <RoomPlane image={props.roomImage} />
        <ArtworkPlane
          image={props.artworkImage}
          widthCm={props.widthCm}
          heightCm={props.heightCm}
          wallWidthCm={props.wallWidthCm}
          transform={props.transform}
        />
      </Suspense>
    </Canvas>
  );
}
