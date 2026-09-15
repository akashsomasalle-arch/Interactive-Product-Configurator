export interface ColorSwatch {
  hex: string;
  name: string;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PartColorState {
  color: string;
  colorName: string;
}

export interface LandingLogo {
  src: string;
  alt: string;
}

export interface CatalogSku {
  id: string;
  label: string;
  displayName: string;
  imageUrl: string;
  modelPath: string;
}

export interface CatalogOption {
  id: string;
  title: string;
  description?: string;
  includesFrame?: boolean;
}

export interface ProductDefaults {
  packageType: PackageType;
  quantity: number;
  quantityMax: number;
  backWall: WallSelection;
  sideWalls: WallSelection;
}

export interface NavCopy {
  label: string;
  title: string;
}

export type PackageType = "canopy-frame" | "canopy-only";
export type WallCoverage = "none" | "half" | "full";
export type PrintMode = "single" | "double";

export interface WallSelection {
  coverage: WallCoverage;
  printMode: PrintMode;
}

export interface PricingTable {
  currency: string;
  sizes: Record<string, number>;
  packages: Record<string, number>;
  backWalls: Record<string, number>;
  sideWalls: Record<string, number>;
  printSurcharge: Record<string, number>;
  artwork: number;
  text: number;
  quantityDiscounts: Array<{ min: number; rate: number }>;
}

export interface QuoteLine {
  code: string;
  label: string;
  amount: number;
}

export interface QuoteResult {
  currency: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  discountRate: number;
  discountAmount: number;
  subtotal: number;
  lines: QuoteLine[];
  shopifyProperties: Record<string, string>;
}

export interface ShopifyCartResponse {
  draftOrderId: string;
  checkoutUrl: string;
  lineItem: {
    sku: string;
    title: string;
    quantity: number;
    price: number;
    properties: Record<string, string>;
  };
}

export interface AppConfig {
  project: {
    name: string;
    version: string;
  };
  landing: {
    title: string;
    logo: LandingLogo;
  };
  catalog: {
    id: string;
    name: string;
    skus: CatalogSku[];
  };
  packages: CatalogOption[];
  defaults: ProductDefaults;
  walls: {
    back: CatalogOption[];
    sides: CatalogOption[];
  };
  pricing: PricingTable;
  scene: {
    backgroundColor: string;
    exposure: number;
    environmentIntensity: number;
    environmentPath: string;
    ambientIntensity: number;
    contactShadows: {
      opacity: number;
      scale: number;
      blur: number;
      far: number;
      y: number;
    };
  };
  graphics: {
    canvasSize: number;
    logoSizeRatio: number;
    textFontSize: number;
    textCanvasHeight: number;
    textDefaultFont: string;
    textDefaultColor: string;
    textFonts: Array<{ value: string; label: string }>;
    showStats?: boolean;
    logCamera?: boolean;
    postprocessing?: boolean;
    thumbnailQuality: number;
    n8ao: {
      aoRadius: number;
      intensity: number;
      distanceFalloff: number;
    };
    overlay: {
      selection: string;
      danger: string;
      locked: string;
      handle: string;
      pinOn: string;
      pinOff: string;
    };
  };
  model: {
    path: string;
    parts: string[];
    partLabels?: Record<string, string>;
    defaultColors: Record<string, string>;
    metalParts?: string[];
    wallFit: {
      inset: number;
      widthScale: number;
      halfHeightRatio: number;
      eaveRatio: number;
      minHeight: number;
      valanceMinAboveGround: number;
      valanceMaxBelowPeak: number;
    };
  };
  camera: {
    fov: number;
    near: number;
    far: number;
    defaultZ: number;
    defaultView: string;
    target?: Vec3;
    minDistance?: number;
    maxDistance?: number;
    minPolarAngle?: number;
    maxPolarAngle?: number;
    lerp: number;
    dampingFactor: number;
    autoRotateSpeed: number;
    snapDistance: number;
    views: Record<string, Vec3>;
    viewTargets?: Record<string, Vec3>;
  };
  ui: {
    sections: string[];
    sectionNav: Record<string, NavCopy>;
    assetLimit: number;
    colorPalette: ColorSwatch[];
  };
  userConfiguration?: {
    activeView?: string;
    partColors?: Record<string, PartColorState>;
    artworks?: SerializedLogo[];
    skuId?: string;
    packageType?: PackageType;
    backWall?: WallSelection;
    sideWalls?: WallSelection;
    quantity?: number;
    backgroundColor?: string;
  };
}

export type BlendMode = "source-over" | "multiply" | "screen";

export interface Logo {
  img: HTMLImageElement;
  srcUrl: string;
  x: number;
  y: number;
  w: number;
  h: number;
  origW: number;
  origH: number;
  angle: number;
  pinned: boolean;
  opacity: number;
  blend: BlendMode;
  part: string;
  type?: "text" | "image";
  text?: string;
  font?: string;
  color?: string;
}

export type SerializedLogo = Omit<Logo, "img">;

export interface UVHit {
  x: number;
  y: number;
  part: string;
}

export interface SavedAsset {
  url: string;
  part: string;
}

export interface SavedDesign {
  id: number;
  name: string;
  thumbnail: string;
  data: AppConfig;
}

export interface UVBounds {
  minU: number;
  maxU: number;
  minV: number;
  maxV: number;
}

export type SectionId = "setup" | "color" | "upload" | "text" | "quote" | "saved";

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
}

export interface ProductSetup {
  skuId: string;
  packageType: PackageType;
  backWall: WallSelection;
  sideWalls: WallSelection;
  quantity: number;
}
