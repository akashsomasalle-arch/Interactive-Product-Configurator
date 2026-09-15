import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";
import rawConfig from "../config.json";
import { DecalEngine, disposeLogo } from "../engine/decalEngine";
import { parseSkuFromPath, skuById, isEmbedMode } from "../lib/appLocation";
import type {
  AppConfig,
  BlendMode,
  ContextMenuState,
  Logo,
  PackageType,
  PartColorState,
  SavedAsset,
  SavedDesign,
  SectionId,
  SerializedLogo,
  UVHit,
  WallSelection,
} from "../types";
import { createPartState, readStorage } from "../utils";
import { colorTargetsFor, isCanopyRegion } from "../lib/canopyRegions";

const raw = rawConfig as AppConfig;
const activeSku = skuById(parseSkuFromPath() ?? "");
const config: AppConfig = activeSku
  ? { ...raw, model: { ...raw.model, path: activeSku.modelPath } }
  : raw;
const PARTS = config.model.parts;
const COLORABLE_PARTS = PARTS.filter((p) => p === "all" || !config.model.metalParts?.includes(p));
const PALETTE = config.ui.colorPalette;
const SECTIONS = config.ui.sections as SectionId[];
const ASSET_LIMIT = config.ui.assetLimit;
const CANVAS_SIZE = config.graphics.canvasSize;
const LOGO_SIZE_RATIO = config.graphics.logoSizeRatio;
const TEXT_FONT_SIZE = config.graphics.textFontSize;
const TEXT_CANVAS_HEIGHT = config.graphics.textCanvasHeight;
const TEXT_DEFAULT_FONT = config.graphics.textDefaultFont;
const TEXT_DEFAULT_COLOR = config.graphics.textDefaultColor;
const DEFAULT_PART = PARTS.includes("all") ? "all" : (COLORABLE_PARTS[0] ?? PARTS[0]);
const DEFAULT_BG_COLOR = config.scene.backgroundColor;
const DEFAULT_VIEW = config.camera.defaultView;

const CAM_VIEWS: Record<string, THREE.Vector3> = {};
for (const [key, pos] of Object.entries(config.camera.views)) {
  CAM_VIEWS[key] = new THREE.Vector3(pos.x, pos.y, pos.z);
}

export { CAM_VIEWS, CANVAS_SIZE, DEFAULT_PART, PALETTE, PARTS, SECTIONS, activeSku, config };

interface ConfirmState {
  message: string;
  onConfirm: () => void;
}

interface Store {
  engine: DecalEngine;
  config: AppConfig;
  parts: string[];
  palette: typeof PALETTE;
  sections: SectionId[];
  assetLimit: number;
  defaultPart: string;
  partState: Record<string, PartColorState>;
  activePart: string;
  activeSection: SectionId;
  logos: Logo[];
  selectedIndex: number;
  sceneBg: string;
  autoRotate: boolean;
  cameraView: string;
  cameraTick: number;
  controlsEnabled: boolean;
  rightCollapsed: boolean;
  uvMinimized: boolean;
  uvExpanded: boolean;
  modelReady: boolean;
  loaderHidden: boolean;
  openDropdown: string | null;
  savedAssets: SavedAsset[];
  savedConfigs: SavedDesign[];
  activeDesignId: number | null;
  toast: string | null;
  confirm: ConfirmState | null;
  savePromptOpen: boolean;
  assetModalOpen: boolean;
  contextMenu: ContextMenuState;
  revision: number;
  skuId: string;
  isEmbed: boolean;
  packageType: PackageType;
  backWall: WallSelection;
  sideWalls: WallSelection;
  quantity: number;
  setModelReady: () => void;
  hideLoader: () => void;
  bump: () => void;
  setActivePart: (part: string) => void;
  switchSection: (id: SectionId) => void;
  applyColor: (hex: string, saveToState?: boolean, updateModel?: boolean) => void;
  applySceneColor: (hex: string) => void;
  toggleAutoRotate: () => void;
  resetCamera: () => void;
  setCameraView: (view: string) => void;
  toggleRightPanel: () => void;
  toggleDropdown: (id: string) => void;
  closeDropdowns: () => void;
  toggleUvExpand: () => void;
  toggleUvMinimize: () => void;
  loadLogoFromUrl: (url: string, targetPart: string) => void;
  addText: (str: string) => void;
  refreshTextLogo: (logo: Logo) => void;
  updateSelectedLogo: (patch: Partial<Logo>) => void;
  setSelectedIndex: (index: number) => void;
  processNewUpload: (file: File) => void;
  deleteAsset: (index: number) => void;
  clearAllAssets: () => void;
  setAssetModalOpen: (open: boolean) => void;
  showToast: (message: string) => void;
  showConfirm: (message: string, onConfirm: () => void) => void;
  hideConfirm: () => void;
  openSavePrompt: () => void;
  closeSavePrompt: () => void;
  saveDesign: (name: string, idToOverwrite?: number | null) => string | null;
  saveCurrent: () => void;
  loadDesign: (item: SavedDesign) => void;
  resetToDefaultDesign: () => void;
  deleteDesign: (index: number) => void;
  renameDesign: (item: SavedDesign, name: string) => void;
  toggleLayerLock: (index: number) => void;
  deleteLayer: (index: number) => void;
  bringFront: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  sendBack: () => void;
  cloneSelected: () => void;
  deleteSelected: () => void;
  hideContextMenu: () => void;
  showContextMenu: (x: number, y: number) => void;
  setControlsEnabled: (enabled: boolean) => void;
  onInteractDown: (uv: UVHit) => boolean;
  onInteractMove: (uv: UVHit | null) => void;
  onInteractUp: () => void;
  handleContextHit: (uv: UVHit | null, x: number, y: number) => void;
  getDefaultDesignName: () => string;
  isInteracting: () => boolean;
  setPackageType: (value: PackageType) => void;
  setBackWall: (value: WallSelection) => void;
  setSideWalls: (value: WallSelection) => void;
  setQuantity: (value: number) => void;
}

const ConfiguratorContext = createContext<Store | null>(null);

export function useConfigurator(): Store {
  const ctx = useContext(ConfiguratorContext);
  if (!ctx) throw new Error("useConfigurator must be used within ConfiguratorProvider");
  return ctx;
}

export function ConfiguratorProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<DecalEngine | null>(null);
  if (!engineRef.current) engineRef.current = new DecalEngine(config);
  const engine = engineRef.current;

  const [partState, setPartState] = useState(() => createPartState(config));
  const [activePart, setActivePartState] = useState(DEFAULT_PART);
  const [activeSection, setActiveSection] = useState<SectionId>((SECTIONS[0] ?? "color") as SectionId);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [selectedIndex, setSelectedIndexState] = useState(-1);
  const [sceneBg, setSceneBg] = useState(DEFAULT_BG_COLOR);
  const [autoRotate, setAutoRotate] = useState(false);
  const [cameraView, setCameraViewState] = useState(DEFAULT_VIEW);
  const [cameraTick, setCameraTick] = useState(0);
  const skuId = activeSku?.id ?? config.catalog.skus[0]?.id ?? "";
  const isEmbed = isEmbedMode();
  const [packageType, setPackageType] = useState<PackageType>(config.defaults.packageType);
  const [backWall, setBackWall] = useState<WallSelection>(config.defaults.backWall);
  const [sideWalls, setSideWalls] = useState<WallSelection>(config.defaults.sideWalls);
  const [quantity, setQuantityState] = useState(config.defaults.quantity);
  const setQuantity = useCallback(
    (value: number) => setQuantityState(Math.min(config.defaults.quantityMax, Math.max(1, Math.round(value)))),
    [],
  );
  const [controlsEnabled, setControlsEnabled] = useState(true);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [uvMinimized, setUvMinimized] = useState(false);
  const [uvExpanded, setUvExpanded] = useState(false);
  const [modelReady, setModelReadyState] = useState(false);
  const [loaderHidden, setLoaderHidden] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [savedAssets, setSavedAssets] = useState<SavedAsset[]>(() => readStorage("tent_assets", []));
  const [savedConfigs, setSavedConfigs] = useState<SavedDesign[]>(() => readStorage("tent_configs", []));
  const [activeDesignId, setActiveDesignId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0 });
  const [revision, setRevision] = useState(0);

  const logosRef = useRef(logos);
  const selectedRef = useRef(selectedIndex);
  const activePartRef = useRef(activePart);
  logosRef.current = logos;
  selectedRef.current = selectedIndex;
  activePartRef.current = activePart;

  const drag = useRef({
    dragActive: false,
    scaleActive: false,
    rotateActive: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
    scaleStartDist: 0,
    scaleStartW: 0,
    scaleStartH: 0,
    rotateStartAngle: 0,
    rotateStartMouse: 0,
  });

  const toastTimer = useRef<number | null>(null);
  const interactSyncRaf = useRef<number | null>(null);

  const bump = useCallback(() => setRevision((n) => n + 1), []);
  const setModelReady = useCallback(() => setModelReadyState(true), []);
  const hideLoader = useCallback(() => setLoaderHidden(true), []);
  const toggleAutoRotate = useCallback(() => setAutoRotate((v) => !v), []);

  const redrawNow = useCallback(
    (nextLogos = logosRef.current, nextSelected = selectedRef.current) => {
      engine.redraw(nextLogos, nextSelected);
      bump();
    },
    [engine, bump],
  );

  const isInteracting = useCallback(
    () => drag.current.dragActive || drag.current.scaleActive || drag.current.rotateActive,
    [],
  );

  const flushInteractSync = useCallback(() => {
    if (interactSyncRaf.current != null) {
      window.cancelAnimationFrame(interactSyncRaf.current);
      interactSyncRaf.current = null;
    }
    setLogos([...logosRef.current]);
    bump();
  }, [bump]);

  const scheduleInteractSync = useCallback(() => {
    if (interactSyncRaf.current != null) return;
    interactSyncRaf.current = window.requestAnimationFrame(() => {
      interactSyncRaf.current = null;
      setLogos([...logosRef.current]);
      bump();
    });
  }, [bump]);

  const persistAssets = useCallback((assets: SavedAsset[]) => {
    setSavedAssets(assets);
    try {
      localStorage.setItem("tent_assets", JSON.stringify(assets));
    } catch {
      /* quota */
    }
  }, []);

  const persistConfigs = useCallback((items: SavedDesign[]) => {
    try {
      localStorage.setItem("tent_configs", JSON.stringify(items));
      setSavedConfigs(items);
      return true;
    } catch {
      return false;
    }
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2500);
  }, []);

  const setActivePart = useCallback(
    (part: string) => {
      setActivePartState(part);
      setAutoRotate(false);
      engine.cacheNeedsUpdate = true;
      if (part !== "all" && partState[part]?.colorName !== "Original") {
        engine.applyPartColor(part, partState[part].color, COLORABLE_PARTS);
      }
      bump();
    },
    [engine, partState, bump],
  );

  const switchSection = useCallback(
    (id: SectionId) => {
      setActiveSection(id);
      let shouldDeselect = false;
      if (id === "color" || id === "saved") shouldDeselect = true;
      else if (selectedRef.current >= 0 && logosRef.current[selectedRef.current]) {
        const isText = logosRef.current[selectedRef.current].type === "text";
        if (id === "upload" && isText) shouldDeselect = true;
        if (id === "text" && !isText) shouldDeselect = true;
      }
      if (shouldDeselect) {
        selectedRef.current = -1;
        setSelectedIndexState(-1);
        redrawNow(logosRef.current, -1);
      }
    },
    [redrawNow],
  );

  const applyColor = useCallback(
    (hex: string, saveToState = true, updateModel = true) => {
      if (updateModel) engine.applyPartColor(activePartRef.current, hex, COLORABLE_PARTS);
      const name = PALETTE.find((p) => p.hex.toUpperCase() === hex.toUpperCase())?.name ?? "Custom Color";
      if (saveToState) {
        setPartState((prev) => {
          const next = { ...prev };
          colorTargetsFor(activePartRef.current).forEach((p) => {
            next[p] = { color: hex, colorName: name };
          });
          next[activePartRef.current] = { color: hex, colorName: name };
          return next;
        });
      }
      engine.cacheNeedsUpdate = true;
      bump();
    },
    [engine, bump],
  );

  const applySceneColor = useCallback(
    (hex: string) => {
      config.scene.backgroundColor = hex;
      setSceneBg(hex);
      bump();
    },
    [bump],
  );

  const loadLogoFromUrl = useCallback(
    (url: string, targetPart: string) => {
      const img = new Image();
      img.onload = () => {
        const placedPart = isCanopyRegion(targetPart) ? targetPart : (colorTargetsFor(targetPart)[0] ?? targetPart);
        const uv = engine.findCenterUV(placedPart, CAM_VIEWS.front);
        const w = CANVAS_SIZE * LOGO_SIZE_RATIO;
        const h = (img.naturalHeight / img.naturalWidth) * w;
        const logo: Logo = {
          img,
          srcUrl: url,
          x: uv.x - w / 2,
          y: uv.y - h / 2,
          w,
          h,
          origW: w,
          origH: h,
          angle: 0,
          pinned: false,
          opacity: 100,
          blend: "source-over",
          part: placedPart,
        };
        const next = [...logosRef.current, logo];
        logosRef.current = next;
        selectedRef.current = next.length - 1;
        setLogos(next);
        setSelectedIndexState(next.length - 1);
        redrawNow(next, next.length - 1);
      };
      img.src = url;
    },
    [engine, redrawNow],
  );

  const refreshTextLogo = useCallback(
    (logo: Logo) => {
      const tCanvas = document.createElement("canvas");
      const tCtx = tCanvas.getContext("2d")!;
      tCtx.font = `bold ${TEXT_FONT_SIZE}px ${logo.font}`;
      const metrics = tCtx.measureText(logo.text ?? "");
      tCanvas.width = metrics.width + 20;
      tCanvas.height = TEXT_CANVAS_HEIGHT;
      tCtx.font = `bold ${TEXT_FONT_SIZE}px ${logo.font}`;
      tCtx.fillStyle = logo.color ?? TEXT_DEFAULT_COLOR;
      tCtx.textBaseline = "middle";
      tCtx.fillText(logo.text ?? "", 10, 70);
      const dataUrl = tCanvas.toDataURL();
      logo.srcUrl = dataUrl;
      const img = new Image();
      img.onload = () => {
        logo.img = img;
        setLogos([...logosRef.current]);
        redrawNow();
      };
      img.src = dataUrl;
    },
    [redrawNow],
  );

  const addText = useCallback(
    (str: string) => {
      const trimmed = str.trim();
      if (!trimmed) return;
      const targetPart = activePartRef.current;
      const tCanvas = document.createElement("canvas");
      const tCtx = tCanvas.getContext("2d")!;
      tCtx.font = `bold ${TEXT_FONT_SIZE}px ${TEXT_DEFAULT_FONT}`;
      const metrics = tCtx.measureText(trimmed);
      tCanvas.width = metrics.width + 20;
      tCanvas.height = TEXT_CANVAS_HEIGHT;
      tCtx.font = `bold ${TEXT_FONT_SIZE}px ${TEXT_DEFAULT_FONT}`;
      tCtx.fillStyle = TEXT_DEFAULT_COLOR;
      tCtx.textBaseline = "middle";
      tCtx.fillText(trimmed, 10, 70);
      const img = new Image();
      img.onload = () => {
        const placedPart = isCanopyRegion(targetPart) ? targetPart : (colorTargetsFor(targetPart)[0] ?? targetPart);
        const uv = engine.findCenterUV(placedPart, CAM_VIEWS.front);
        const w = tCanvas.width * 0.8;
        const h = tCanvas.height * 0.8;
        const logo: Logo = {
          type: "text",
          srcUrl: tCanvas.toDataURL(),
          text: trimmed,
          font: TEXT_DEFAULT_FONT,
          color: TEXT_DEFAULT_COLOR,
          img,
          x: uv.x - tCanvas.width / 4,
          y: uv.y - tCanvas.height / 4,
          w,
          h,
          origW: w,
          origH: h,
          angle: 0,
          pinned: false,
          opacity: 100,
          blend: "source-over",
          part: placedPart,
        };
        const next = [...logosRef.current, logo];
        logosRef.current = next;
        selectedRef.current = next.length - 1;
        setLogos(next);
        setSelectedIndexState(next.length - 1);
        redrawNow(next, next.length - 1);
      };
      img.src = tCanvas.toDataURL();
    },
    [engine, redrawNow],
  );

  const updateSelectedLogo = useCallback(
    (patch: Partial<Logo>) => {
      const i = selectedRef.current;
      if (i < 0) return;
      const next = logosRef.current.map((logo, idx) => (idx === i ? { ...logo, ...patch } : logo));
      logosRef.current = next;
      setLogos(next);
      const logo = next[i];
      if (patch.blend && logo) engine.applyBlend(logo.part, logo.blend);
      if (logo?.type === "text" && (patch.font || patch.color || patch.text)) {
        refreshTextLogo(logo);
        return;
      }
      redrawNow(next, i);
    },
    [engine, redrawNow, refreshTextLogo],
  );

  const setSelectedIndex = useCallback(
    (index: number) => {
      selectedRef.current = index;
      setSelectedIndexState(index);
      if (index >= 0) {
        const logo = logosRef.current[index];
        if (logo && logo.part !== activePartRef.current) setActivePart(logo.part);
      }
      redrawNow(logosRef.current, index);
    },
    [redrawNow, setActivePart],
  );

  const processNewUpload = useCallback(
    (file: File) => {
      if (savedAssets.length >= ASSET_LIMIT) {
        showToast(`Storage limit reached (${ASSET_LIMIT} images maximum)`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64Data = String(ev.target?.result ?? "");
        loadLogoFromUrl(base64Data, activePartRef.current);
        try {
          persistAssets([...savedAssets, { url: base64Data, part: activePartRef.current }]);
        } catch {
          showToast("Browser storage full. Image applied but not saved.");
        }
      };
      reader.readAsDataURL(file);
    },
    [savedAssets, loadLogoFromUrl, persistAssets, showToast],
  );

  const deleteAsset = useCallback(
    (index: number) => {
      persistAssets(savedAssets.filter((_, i) => i !== index));
    },
    [savedAssets, persistAssets],
  );

  const clearAllAssets = useCallback(() => {
    persistAssets([]);
    localStorage.removeItem("tent_assets");
    setAssetModalOpen(false);
  }, [persistAssets]);

  const toggleLayerLock = useCallback(
    (index: number) => {
      const next = logosRef.current.map((logo, i) => (i === index ? { ...logo, pinned: !logo.pinned } : logo));
      logosRef.current = next;
      setLogos(next);
      redrawNow(next);
    },
    [redrawNow],
  );

  const deleteLayer = useCallback(
    (index: number) => {
      const target = logosRef.current[index];
      if (target) disposeLogo(target);
      const next = logosRef.current.filter((_, i) => i !== index);
      let sel = selectedRef.current;
      if (sel === index) sel = -1;
      else if (sel > index) sel -= 1;
      logosRef.current = next;
      selectedRef.current = sel;
      setLogos(next);
      setSelectedIndexState(sel);
      redrawNow(next, sel);
    },
    [redrawNow],
  );

  const bringFront = useCallback(() => {
    const i = selectedRef.current;
    if (i < 0 || i === logosRef.current.length - 1) return;
    const next = [...logosRef.current];
    const [item] = next.splice(i, 1);
    next.push(item);
    logosRef.current = next;
    selectedRef.current = next.length - 1;
    setLogos(next);
    setSelectedIndexState(next.length - 1);
    redrawNow(next, next.length - 1);
  }, [redrawNow]);

  const bringForward = useCallback(() => {
    const i = selectedRef.current;
    if (i < 0 || i === logosRef.current.length - 1) return;
    const next = [...logosRef.current];
    const t = next[i];
    next[i] = next[i + 1];
    next[i + 1] = t;
    logosRef.current = next;
    selectedRef.current = i + 1;
    setLogos(next);
    setSelectedIndexState(i + 1);
    redrawNow(next, i + 1);
  }, [redrawNow]);

  const sendBackward = useCallback(() => {
    const i = selectedRef.current;
    if (i <= 0) return;
    const next = [...logosRef.current];
    const t = next[i];
    next[i] = next[i - 1];
    next[i - 1] = t;
    logosRef.current = next;
    selectedRef.current = i - 1;
    setLogos(next);
    setSelectedIndexState(i - 1);
    redrawNow(next, i - 1);
  }, [redrawNow]);

  const sendBack = useCallback(() => {
    const i = selectedRef.current;
    if (i <= 0) return;
    const next = [...logosRef.current];
    const [item] = next.splice(i, 1);
    next.unshift(item);
    logosRef.current = next;
    selectedRef.current = 0;
    setLogos(next);
    setSelectedIndexState(0);
    redrawNow(next, 0);
  }, [redrawNow]);

  const cloneSelected = useCallback(() => {
    const i = selectedRef.current;
    if (i < 0) return;
    const src = logosRef.current[i];
    const clone: Logo = { ...src, x: src.x + 30, y: src.y + 30 };
    const next = [...logosRef.current, clone];
    logosRef.current = next;
    selectedRef.current = next.length - 1;
    setLogos(next);
    setSelectedIndexState(next.length - 1);
    redrawNow(next, next.length - 1);
  }, [redrawNow]);

  const deleteSelected = useCallback(() => {
    const i = selectedRef.current;
    if (i < 0) return;
    const logo = logosRef.current[i];
    if (logo.pinned) return;
    disposeLogo(logo);
    const next = logosRef.current.filter((_, idx) => idx !== i);
    logosRef.current = next;
    selectedRef.current = -1;
    setLogos(next);
    setSelectedIndexState(-1);
    setControlsEnabled(true);
    redrawNow(next, -1);
  }, [redrawNow]);

  const onInteractDown = useCallback(
    (uv: UVHit) => {
      const i = selectedRef.current;
      if (i >= 0) {
        const logo = logosRef.current[i];
        const matchesPart = uv.part === "all" || logo.part === uv.part || logo.part === "all";
        if (matchesPart) {
          if (engine.hitHandle(logo, uv.x, uv.y, "pin")) {
            toggleLayerLock(i);
            return true;
          }
          if (!logo.pinned) {
            if (engine.hitHandle(logo, uv.x, uv.y, "del")) {
              deleteLayer(i);
              setControlsEnabled(true);
              return true;
            }
            if (engine.hitHandle(logo, uv.x, uv.y, "clone")) {
              cloneSelected();
              return true;
            }
            if (engine.hitHandle(logo, uv.x, uv.y, "rotate")) {
              drag.current.rotateActive = true;
              drag.current.rotateStartAngle = logo.angle;
              drag.current.rotateStartMouse = Math.atan2(uv.y - (logo.y + logo.h / 2), uv.x - (logo.x + logo.w / 2));
              setControlsEnabled(false);
              return true;
            }
            if (engine.hitHandle(logo, uv.x, uv.y, "resize")) {
              drag.current.scaleActive = true;
              drag.current.scaleStartDist = Math.hypot(uv.x - (logo.x + logo.w / 2), uv.y - (logo.y + logo.h / 2));
              drag.current.scaleStartW = logo.w;
              drag.current.scaleStartH = logo.h;
              setControlsEnabled(false);
              return true;
            }
          }
        }
      }

      for (let idx = logosRef.current.length - 1; idx >= 0; idx--) {
        const logo = logosRef.current[idx];
        const matchesPart = uv.part === "all" || logo.part === uv.part || logo.part === "all";
        if (matchesPart && engine.hitBody(logo, uv.x, uv.y)) {
          selectedRef.current = idx;
          setSelectedIndexState(idx);
          if (logo.part !== activePartRef.current) setActivePart(logo.part);
          if (logo.type === "text") switchSection("text");
          else switchSection("upload");
          if (!logo.pinned) {
            drag.current.dragActive = true;
            drag.current.dragOffsetX = uv.x - logo.x;
            drag.current.dragOffsetY = uv.y - logo.y;
            setControlsEnabled(false);
          }
          redrawNow(logosRef.current, idx);
          return true;
        }
      }

      if (selectedRef.current !== -1) {
        selectedRef.current = -1;
        setSelectedIndexState(-1);
        redrawNow(logosRef.current, -1);
      }
      return false;
    },
    [engine, toggleLayerLock, deleteLayer, cloneSelected, setActivePart, switchSection, redrawNow],
  );

  const onInteractMove = useCallback(
    (uv: UVHit | null) => {
      const d = drag.current;
      if (!d.dragActive && !d.scaleActive && !d.rotateActive) return;
      if (!uv || selectedRef.current < 0) return;
      const logo = logosRef.current[selectedRef.current];
      if (!logo) return;
      const matchesPart = uv.part === "all" || logo.part === uv.part || logo.part === "all";
      if (!matchesPart) return;

      if (d.dragActive) {
        logo.x = uv.x - d.dragOffsetX;
        logo.y = uv.y - d.dragOffsetY;
      }
      if (d.scaleActive) {
        const dist = Math.hypot(uv.x - (logo.x + logo.w / 2), uv.y - (logo.y + logo.h / 2));
        const ratio = dist / d.scaleStartDist;
        logo.w = Math.max(30, d.scaleStartW * ratio);
        logo.h = Math.max(30, d.scaleStartH * ratio);
      }
      if (d.rotateActive) {
        const cur = Math.atan2(uv.y - (logo.y + logo.h / 2), uv.x - (logo.x + logo.w / 2));
        logo.angle = d.rotateStartAngle + (cur - d.rotateStartMouse);
      }

      engine.redraw(logosRef.current, selectedRef.current);
      scheduleInteractSync();
    },
    [engine, scheduleInteractSync],
  );

  const onInteractUp = useCallback(() => {
    drag.current.dragActive = drag.current.scaleActive = drag.current.rotateActive = false;
    flushInteractSync();
    setControlsEnabled(true);
  }, [flushInteractSync]);

  const hideContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  const showContextMenu = useCallback((x: number, y: number) => {
    setContextMenu({ visible: true, x, y });
  }, []);

  const handleContextHit = useCallback(
    (uv: UVHit | null, x: number, y: number) => {
      if (!uv) {
        hideContextMenu();
        return;
      }
      let clickedIndex = -1;
      for (let i = logosRef.current.length - 1; i >= 0; i--) {
        const logo = logosRef.current[i];
        if ((uv.part === "all" || logo.part === uv.part || logo.part === "all") && engine.hitBody(logo, uv.x, uv.y)) {
          clickedIndex = i;
          break;
        }
      }
      if (clickedIndex >= 0) {
        selectedRef.current = clickedIndex;
        setSelectedIndexState(clickedIndex);
        redrawNow(logosRef.current, clickedIndex);
        showContextMenu(x, y);
      } else {
        hideContextMenu();
      }
    },
    [engine, hideContextMenu, showContextMenu, redrawNow],
  );

  const getDefaultDesignName = useCallback(() => {
    let count = 1;
    let newName = `Custom Design ${count}`;
    while (savedConfigs.some((c) => c.name === newName)) {
      count++;
      newName = `Custom Design ${count}`;
    }
    return newName;
  }, [savedConfigs]);

  const captureThumbnail = useCallback(() => {
    return engine.captureThumbnail() || "";
  }, [engine]);

  const saveDesign = useCallback(
    (name: string, idToOverwrite: number | null = null) => {
      const serializableLogos: SerializedLogo[] = logosRef.current.map((logo) => {
        const { img: _img, ...safeLogo } = logo;
        return safeLogo;
      });
      const exportData: AppConfig = {
        ...config,
        scene: { ...config.scene, backgroundColor: sceneBg },
        userConfiguration: {
          activeView: activePartRef.current,
          partColors: JSON.parse(JSON.stringify(partState)) as Record<string, PartColorState>,
          artworks: serializableLogos,
          skuId,
          packageType,
          backWall,
          sideWalls,
          quantity,
          backgroundColor: sceneBg,
        },
      };
      const thumbnailData = captureThumbnail();
      const nextItem = {
        thumbnail: thumbnailData,
        data: exportData,
        name,
      };
      let next: SavedDesign[];
      let savedName = name;
      if (idToOverwrite) {
        next = savedConfigs.map((item) =>
          item.id === idToOverwrite ? { ...item, ...nextItem } : item,
        );
        savedName = savedConfigs.find((item) => item.id === idToOverwrite)?.name ?? name;
      } else {
        const newId = Date.now();
        next = [...savedConfigs, { id: newId, ...nextItem }];
        setActiveDesignId(newId);
      }
      if (!persistConfigs(next)) {
        showToast("Could not save design: browser storage is full.");
        return null;
      }
      showToast(idToOverwrite ? `"${savedName}" updated!` : `"${name}" saved to library!`);
      return name;
    },
    [
      partState,
      savedConfigs,
      persistConfigs,
      showToast,
      captureThumbnail,
      sceneBg,
      skuId,
      packageType,
      backWall,
      sideWalls,
      quantity,
    ],
  );

  const saveCurrent = useCallback(() => {
    if (!activeDesignId) return;
    const currentDesign = savedConfigs.find((c) => c.id === activeDesignId);
    if (!currentDesign) {
      showToast("Design no longer exists. Save as new instead.");
      setActiveDesignId(null);
      return;
    }
    saveDesign(currentDesign.name, activeDesignId);
  }, [activeDesignId, savedConfigs, saveDesign, showToast]);

  const loadArtworks = useCallback(
    (arts: SerializedLogo[], onDone: () => void) => {
      if (arts.length === 0) {
        onDone();
        return;
      }
      let loaded = 0;
      const next: Logo[] = [];
      arts.forEach((art) => {
        const img = new Image();
        img.onload = () => {
          next.push({ ...art, img, blend: (art.blend as BlendMode) ?? "source-over" });
          engine.applyBlend(art.part, (art.blend as BlendMode) ?? "source-over");
          loaded++;
          if (loaded === arts.length) {
            logosRef.current = next;
            selectedRef.current = -1;
            setLogos(next);
            setSelectedIndexState(-1);
            redrawNow(next, -1);
            onDone();
          }
        };
        img.onerror = () => {
          loaded++;
          if (loaded === arts.length) {
            logosRef.current = next;
            selectedRef.current = -1;
            setLogos(next);
            setSelectedIndexState(-1);
            redrawNow(next, -1);
            onDone();
          }
        };
        img.src = art.srcUrl;
      });
    },
    [engine, redrawNow],
  );

  const loadDesign = useCallback(
    (item: SavedDesign) => {
      if (!item?.data) return;
      setActiveDesignId(item.id);
      const savedData = item.data;
      const userConfig = savedData.userConfiguration;
      if (userConfig?.partColors) {
        const nextParts = { ...userConfig.partColors };
        setPartState(nextParts);
        PARTS.forEach((p) => {
          if (config.model.metalParts?.includes(p)) return;
          if (engine.materials[p] && nextParts[p]) engine.applyPartColor(p, nextParts[p].color, COLORABLE_PARTS);
        });
        engine.cacheNeedsUpdate = true;
      }
      if (savedData.scene?.backgroundColor) applySceneColor(savedData.scene.backgroundColor);
      else if (userConfig?.backgroundColor) applySceneColor(userConfig.backgroundColor);
      if (userConfig?.packageType) setPackageType(userConfig.packageType);
      if (userConfig?.backWall) setBackWall(userConfig.backWall);
      if (userConfig?.sideWalls) setSideWalls(userConfig.sideWalls);
      if (userConfig?.quantity) setQuantity(userConfig.quantity);
      setCameraViewState(DEFAULT_VIEW);
      setCameraTick((n) => n + 1);
      logosRef.current.forEach(disposeLogo);
      logosRef.current = [];
      selectedRef.current = -1;
      setLogos([]);
      setSelectedIndexState(-1);

      const arts = userConfig?.artworks || [];
      loadArtworks(arts, () => {
        const current = logosRef.current;
        const hasImages = current.some((l) => l.type !== "text");
        const hasText = current.some((l) => l.type === "text");
        const targetSection = hasImages ? "upload" : hasText ? "text" : SECTIONS[0];
        setActivePart(DEFAULT_PART);
        switchSection(targetSection);
        showToast("Design loaded successfully!");
      });
    },
    [engine, applySceneColor, loadArtworks, setActivePart, switchSection, showToast],
  );

  const resetToDefaultDesign = useCallback(() => {
    setActiveDesignId(null);
    const next = createPartState({ ...config, userConfiguration: undefined });
    setPartState(next);
    engine.restoreGlbAlbedo();
    logosRef.current.forEach(disposeLogo);
    logosRef.current = [];
    selectedRef.current = -1;
    setLogos([]);
    setSelectedIndexState(-1);
    applySceneColor(DEFAULT_BG_COLOR);
    engine.cacheNeedsUpdate = true;
    setActivePart(DEFAULT_PART);
    setPackageType(config.defaults.packageType);
    setBackWall(config.defaults.backWall);
    setSideWalls(config.defaults.sideWalls);
    setQuantity(config.defaults.quantity);
    redrawNow([], -1);
    switchSection(SECTIONS[0]);
    showToast("Started a new design");
  }, [engine, applySceneColor, setActivePart, redrawNow, switchSection, showToast, setQuantity]);

  const value = useMemo<Store>(
    () => ({
      engine,
      config,
      parts: COLORABLE_PARTS,
      palette: PALETTE,
      sections: SECTIONS,
      assetLimit: ASSET_LIMIT,
      defaultPart: DEFAULT_PART,
      partState,
      activePart,
      activeSection,
      logos,
      selectedIndex,
      sceneBg,
      autoRotate,
      cameraView,
      cameraTick,
      controlsEnabled,
      rightCollapsed,
      uvMinimized,
      uvExpanded,
      modelReady,
      loaderHidden,
      openDropdown,
      savedAssets,
      savedConfigs,
      activeDesignId,
      toast,
      confirm,
      savePromptOpen,
      assetModalOpen,
      contextMenu,
      revision,
      skuId,
      isEmbed,
      packageType,
      backWall,
      sideWalls,
      quantity,
      setModelReady,
      hideLoader,
      bump,
      setActivePart,
      switchSection,
      applyColor,
      applySceneColor,
      toggleAutoRotate,
      resetCamera: () => {
        setAutoRotate(false);
        setCameraViewState(DEFAULT_VIEW);
        setCameraTick((n) => n + 1);
      },
      setCameraView: (view) => {
        setAutoRotate(false);
        setCameraViewState(view);
        setCameraTick((n) => n + 1);
      },
      toggleRightPanel: () => setRightCollapsed((v) => !v),
      toggleDropdown: (id) => setOpenDropdown((cur) => (cur === id ? null : id)),
      closeDropdowns: () => setOpenDropdown(null),
      toggleUvExpand: () => {
        setUvExpanded((v) => !v);
        setUvMinimized(false);
      },
      toggleUvMinimize: () => {
        setUvMinimized((v) => {
          if (!v) setUvExpanded(false);
          return !v;
        });
      },
      loadLogoFromUrl,
      addText,
      refreshTextLogo,
      updateSelectedLogo,
      setSelectedIndex,
      processNewUpload,
      deleteAsset,
      clearAllAssets,
      setAssetModalOpen,
      showToast,
      showConfirm: (message, onConfirm) => setConfirm({ message, onConfirm }),
      hideConfirm: () => setConfirm(null),
      openSavePrompt: () => setSavePromptOpen(true),
      closeSavePrompt: () => setSavePromptOpen(false),
      saveDesign,
      saveCurrent,
      loadDesign,
      resetToDefaultDesign,
      deleteDesign: (index) => persistConfigs(savedConfigs.filter((_, i) => i !== index)),
      renameDesign: (item, name) =>
        persistConfigs(savedConfigs.map((c) => (c.id === item.id ? { ...c, name } : c))),
      toggleLayerLock,
      deleteLayer,
      bringFront,
      bringForward,
      sendBackward,
      sendBack,
      cloneSelected,
      deleteSelected,
      hideContextMenu,
      showContextMenu,
      setControlsEnabled,
      onInteractDown,
      onInteractMove,
      onInteractUp,
      handleContextHit,
      getDefaultDesignName,
      isInteracting,
      setPackageType,
      setBackWall,
      setSideWalls,
      setQuantity,
    }),
    [
      engine,
      partState,
      activePart,
      activeSection,
      logos,
      selectedIndex,
      sceneBg,
      autoRotate,
      cameraView,
      cameraTick,
      controlsEnabled,
      rightCollapsed,
      uvMinimized,
      uvExpanded,
      modelReady,
      loaderHidden,
      openDropdown,
      savedAssets,
      savedConfigs,
      activeDesignId,
      toast,
      confirm,
      savePromptOpen,
      assetModalOpen,
      contextMenu,
      revision,
      skuId,
      isEmbed,
      packageType,
      backWall,
      sideWalls,
      quantity,
      bump,
      setModelReady,
      hideLoader,
      toggleAutoRotate,
      setActivePart,
      switchSection,
      applyColor,
      applySceneColor,
      loadLogoFromUrl,
      addText,
      refreshTextLogo,
      updateSelectedLogo,
      setSelectedIndex,
      processNewUpload,
      deleteAsset,
      clearAllAssets,
      showToast,
      saveDesign,
      saveCurrent,
      loadDesign,
      resetToDefaultDesign,
      persistConfigs,
      toggleLayerLock,
      deleteLayer,
      bringFront,
      bringForward,
      sendBackward,
      sendBack,
      cloneSelected,
      deleteSelected,
      hideContextMenu,
      showContextMenu,
      onInteractDown,
      onInteractMove,
      onInteractUp,
      handleContextHit,
      getDefaultDesignName,
      isInteracting,
      setQuantity,
    ],
  );

  return <ConfiguratorContext.Provider value={value}>{children}</ConfiguratorContext.Provider>;
}

export function colorNameFor(hex: string, fallbackPartName?: string) {
  return PALETTE.find((p) => p.hex.toUpperCase() === hex.toUpperCase())?.name ?? fallbackPartName ?? "Custom Color";
}
