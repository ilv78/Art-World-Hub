export interface TextureSet {
  color: string;
  normal: string;
  roughness: string;
}

export interface GalleryTemplate {
  id: string;
  name: string;
  description: string;
  // Colors (used as fallback and for tinting)
  wallColor: number;
  floorColor: number;
  ceilingColor: number;
  backgroundColor: number;
  // Textures
  floorTexture: TextureSet | null;
  wallTexture: TextureSet | null;
  floorRepeat: number; // texture tile repeat factor
  wallRepeat: number;
  // Floor
  floorType: "wood" | "marble" | "concrete" | "stone" | "glossy" | "solid";
  floorRoughness: number;
  // Walls / Ceiling
  wallRoughness: number;
  ceilingRoughness: number;
  // Door
  hasDoor: boolean;
  doorFrameColor: number;
  doorPanelColor: number;
  // Lighting
  ambientColor: number;
  ambientIntensity: number;
  directionalColor: number;
  directionalIntensity: number;
  hemisphereColor: number;
  hemisphereGroundColor: number;
  hemisphereIntensity: number;
  // Fog
  fogNear: number;
  fogFar: number;
}

function tex(prefix: string): TextureSet {
  return {
    color: `/textures/${prefix}-color.jpg`,
    normal: `/textures/${prefix}-normal.jpg`,
    roughness: `/textures/${prefix}-roughness.jpg`,
  };
}

export const GALLERY_TEMPLATES: Record<string, GalleryTemplate> = {
  contemporary: {
    id: "contemporary",
    name: "Contemporary",
    description: "Minimalist white space with polished wood floors and natural daylight",
    wallColor: 0xf5f0eb,
    floorColor: 0xc8a882,
    ceilingColor: 0xffffff,
    backgroundColor: 0xf5f0eb,
    floorTexture: tex("floor-wood"),
    wallTexture: tex("wall-plaster-contemporary"),
    floorRepeat: 3,
    wallRepeat: 2,
    floorType: "wood",
    floorRoughness: 0.7,
    wallRoughness: 0.7,
    ceilingRoughness: 0.9,
    hasDoor: true,
    doorFrameColor: 0x5c3a1e,
    doorPanelColor: 0x6b4226,
    ambientColor: 0xffffff,
    ambientIntensity: 1.2,
    directionalColor: 0xffffff,
    directionalIntensity: 0.8,
    hemisphereColor: 0xffffff,
    hemisphereGroundColor: 0xe8e0d8,
    hemisphereIntensity: 0.5,
    fogNear: 5,
    fogFar: 30,
  },

  classical: {
    id: "classical",
    name: "Classical Museum",
    description: "Elegant European gallery with ornate moldings, marble floors, and warm lighting",
    wallColor: 0xf0e6d3,
    floorColor: 0xe8e0d4,
    ceilingColor: 0xf5f0e8,
    backgroundColor: 0xf0e6d3,
    floorTexture: tex("floor-marble-classical"),
    wallTexture: tex("wall-plaster-classical"),
    floorRepeat: 3,
    wallRepeat: 2,
    floorType: "marble",
    floorRoughness: 0.3,
    wallRoughness: 0.6,
    ceilingRoughness: 0.8,
    hasDoor: true,
    doorFrameColor: 0x4a3520,
    doorPanelColor: 0x5c4530,
    ambientColor: 0xfff5e6,
    ambientIntensity: 1.0,
    directionalColor: 0xffd89b,
    directionalIntensity: 0.6,
    hemisphereColor: 0xfff5e6,
    hemisphereGroundColor: 0xe0d0b8,
    hemisphereIntensity: 0.5,
    fogNear: 5,
    fogFar: 30,
  },

  industrial: {
    id: "industrial",
    name: "Industrial",
    description: "Converted warehouse with exposed brick, steel beams, and dramatic spotlighting",
    wallColor: 0x6b5c50,
    floorColor: 0x5a5550,
    ceilingColor: 0x4a4a4a,
    backgroundColor: 0x2a2520,
    floorTexture: tex("floor-concrete-industrial"),
    wallTexture: tex("wall-brick-industrial"),
    floorRepeat: 4,
    wallRepeat: 2,
    floorType: "concrete",
    floorRoughness: 0.9,
    wallRoughness: 0.85,
    ceilingRoughness: 0.9,
    hasDoor: false,
    doorFrameColor: 0x3a3a3a,
    doorPanelColor: 0x4a4a4a,
    ambientColor: 0xfff5e6,
    ambientIntensity: 0.6,
    directionalColor: 0xffffff,
    directionalIntensity: 0.9,
    hemisphereColor: 0xfff0e0,
    hemisphereGroundColor: 0x3a3a3a,
    hemisphereIntensity: 0.3,
    fogNear: 5,
    fogFar: 35,
  },

  luxury: {
    id: "luxury",
    name: "Luxury",
    description: "Ultra-luxury exhibition hall with marble floors, soft beige stone, and gold accents",
    wallColor: 0xf5efe6,
    floorColor: 0xf0e8d8,
    ceilingColor: 0xfaf5ef,
    backgroundColor: 0xf5efe6,
    floorTexture: tex("floor-marble-luxury"),
    wallTexture: tex("wall-plaster-luxury"),
    floorRepeat: 3,
    wallRepeat: 2,
    floorType: "marble",
    floorRoughness: 0.25,
    wallRoughness: 0.5,
    ceilingRoughness: 0.8,
    hasDoor: true,
    doorFrameColor: 0x8b7340,
    doorPanelColor: 0xa08850,
    ambientColor: 0xfff8f0,
    ambientIntensity: 1.1,
    directionalColor: 0xffd89b,
    directionalIntensity: 0.7,
    hemisphereColor: 0xfff8f0,
    hemisphereGroundColor: 0xe8ddd0,
    hemisphereIntensity: 0.5,
    fogNear: 5,
    fogFar: 28,
  },

  futuristic: {
    id: "futuristic",
    name: "Futuristic",
    description: "Sleek curved architecture with LED lighting, glossy floors, and sci-fi aesthetic",
    wallColor: 0xf0f5ff,
    floorColor: 0xe8eef8,
    ceilingColor: 0xf5f8ff,
    backgroundColor: 0xf0f5ff,
    floorTexture: null,
    wallTexture: null,
    floorRepeat: 1,
    wallRepeat: 1,
    floorType: "glossy",
    floorRoughness: 0.1,
    wallRoughness: 0.3,
    ceilingRoughness: 0.4,
    hasDoor: false,
    doorFrameColor: 0xc0c8d8,
    doorPanelColor: 0xd0d8e8,
    ambientColor: 0xe0e8ff,
    ambientIntensity: 1.3,
    directionalColor: 0xf0f5ff,
    directionalIntensity: 0.6,
    hemisphereColor: 0xe0e8ff,
    hemisphereGroundColor: 0xd0d8f0,
    hemisphereIntensity: 0.6,
    fogNear: 4,
    fogFar: 25,
  },

  japanese: {
    id: "japanese",
    name: "Japanese Minimalist",
    description: "Quiet refined space with natural wood, plaster walls, and soft diffused light",
    wallColor: 0xf5f0e8,
    floorColor: 0xa09080,
    ceilingColor: 0xf8f5f0,
    backgroundColor: 0xf5f0e8,
    floorTexture: tex("floor-stone-japanese"),
    wallTexture: tex("wall-plaster-japanese"),
    floorRepeat: 4,
    wallRepeat: 2,
    floorType: "stone",
    floorRoughness: 0.8,
    wallRoughness: 0.9,
    ceilingRoughness: 0.9,
    hasDoor: true,
    doorFrameColor: 0x8b6914,
    doorPanelColor: 0xa07828,
    ambientColor: 0xfff8f0,
    ambientIntensity: 0.9,
    directionalColor: 0xfff5e6,
    directionalIntensity: 0.5,
    hemisphereColor: 0xfff8f0,
    hemisphereGroundColor: 0xd4c8b8,
    hemisphereIntensity: 0.4,
    fogNear: 4,
    fogFar: 25,
  },

  "industrial-new": {
    id: "industrial-new",
    name: "Industrial Modern",
    description: "Contemporary concrete gallery with skylight ceiling, polished floors, and clean museum lighting",
    wallColor: 0xd5d0ca,       // light warm concrete — matches reference
    floorColor: 0x5a5a5a,      // dark grey aggregate floor
    ceilingColor: 0xe8e8e8,    // light grey ceiling
    backgroundColor: 0xc8c4be,
    floorTexture: tex("floor-concrete-industrial"),
    wallTexture: tex("wall-concrete-modern"),
    floorRepeat: 5,             // tighter tile for polished aggregate look
    wallRepeat: 1,
    floorType: "concrete",
    floorRoughness: 0.45,       // slightly polished floor
    wallRoughness: 0.8,         // raw concrete walls
    ceilingRoughness: 0.95,
    hasDoor: false,
    doorFrameColor: 0x808080,
    doorPanelColor: 0x909090,
    ambientColor: 0xffffff,
    ambientIntensity: 1.5,      // bright overhead daylight feel
    directionalColor: 0xffffff,
    directionalIntensity: 1.2,  // strong top-down light simulating skylight
    hemisphereColor: 0xffffff,
    hemisphereGroundColor: 0x9a9a9a,  // grey ground bounce
    hemisphereIntensity: 0.7,
    fogNear: 8,
    fogFar: 40,                 // less fog — cleaner sightlines
  },

};

export const TEMPLATE_IDS = Object.keys(GALLERY_TEMPLATES) as string[];

export function getTemplate(id: string | null | undefined): GalleryTemplate {
  return GALLERY_TEMPLATES[id || "contemporary"] || GALLERY_TEMPLATES.contemporary;
}
