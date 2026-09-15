import * as THREE from "three";
import type { AppConfig, BlendMode, Logo, PartColorState, UVBounds, UVHit } from "../types";
import { CANOPY_REGIONS, colorTargetsFor, isCanopyRegion, splitCanopyGeometry } from "../lib/canopyRegions";

THREE.ColorManagement.enabled = true;

const H_CTRL = 72;
const HALF = H_CTRL / 2;
const CTRL_RADIUS = 18;

type HandleKey = "pin" | "rotate" | "del" | "clone" | "resize";

export class DecalEngine {
  readonly canvases: Record<string, HTMLCanvasElement> = {};
  readonly ctxs: Record<string, CanvasRenderingContext2D> = {};
  readonly textures: Record<string, THREE.CanvasTexture> = {};
  readonly materials: Record<string, THREE.MeshStandardMaterial> = {};
  readonly decalMaterials: Record<string, THREE.MeshStandardMaterial> = {};
  readonly silhouettes: Record<string, HTMLCanvasElement> = {};
  readonly uvBounds: Record<string, UVBounds> = {};
  tentMeshes: THREE.Mesh[] = [];
  private overlays: THREE.Mesh[] = [];
  cacheNeedsUpdate = true;

  private ctx: CanvasRenderingContext2D | null = null;
  private readonly parts: string[];
  private readonly canvasSize: number;
  private readonly defaultPart: string;
  private readonly baseUVCache: HTMLCanvasElement;
  private readonly cacheCtx: CanvasRenderingContext2D;
  private readonly tempTintCanvas: HTMLCanvasElement;
  private readonly tempTintCtx: CanvasRenderingContext2D;
  private uvBoxCache = { minU: 0, maxU: 1, minV: 0, maxV: 1, isValid: false };
  private readonly islandAngle: Record<string, number> = {};
  readonly minimapState = { scale: 1, offsetX: 0, offsetY: 0 };
  onNeedRender: () => void = () => undefined;
  captureThumbnail: () => string = () => "";
  private materialsReady = false;

  constructor(private readonly config: AppConfig) {
    this.parts = config.model.parts;
    this.canvasSize = config.graphics.canvasSize;
    this.defaultPart = this.parts.includes("all") ? "all" : (this.parts[0] ?? "all");
    this.baseUVCache = document.createElement("canvas");
    this.baseUVCache.width = this.canvasSize;
    this.baseUVCache.height = this.canvasSize;
    this.cacheCtx = this.baseUVCache.getContext("2d")!;
    this.tempTintCanvas = document.createElement("canvas");
    this.tempTintCanvas.width = this.canvasSize;
    this.tempTintCanvas.height = this.canvasSize;
    this.tempTintCtx = this.tempTintCanvas.getContext("2d")!;
  }

  private get overlay() {
    return this.config.graphics.overlay;
  }

  private get canvasWhite() {
    return this.config.model.defaultColors.all;
  }

  private compact(value: string) {
    return value.toLowerCase().replace(/[-_ ]/g, "");
  }

  private collectNameHints(mesh: THREE.Mesh): string {
    const hints: string[] = [mesh.name];
    let node: THREE.Object3D | null = mesh;
    for (let i = 0; i < 4 && node; i++) {
      hints.push(node.name);
      node = node.parent;
    }
    const mat = mesh.material;
    const mats = Array.isArray(mat) ? mat : mat ? [mat] : [];
    mats.forEach((m) => {
      if (m?.name) hints.push(m.name);
    });
    return this.compact(hints.join(" "));
  }

  private partTokens(part: string): string[] {
    const compact = this.compact(part);
    const tokens = [compact];
    if (compact.endsWith("s") && compact.length > 3) tokens.push(compact.slice(0, -1));
    if (compact === "innerfabric") tokens.push("inner");
    return tokens;
  }

  private isMetalPart(part: string) {
    return this.config.model.metalParts?.includes(part) ?? false;
  }

  /** Canvas Y matches glTF V (flipY is false on the canvas texture). */
  private uvToCanvas(u: number, v: number) {
    return { x: u * this.canvasSize, y: v * this.canvasSize };
  }

  private isMetalMesh(mesh: THREE.Mesh) {
    return /leg|mechanism|metal/.test(this.collectNameHints(mesh));
  }

  private isInnerMesh(mesh: THREE.Mesh) {
    return /inner/.test(this.collectNameHints(mesh));
  }

  private encodeColorMaps(material: THREE.MeshStandardMaterial) {
    if (material.map) {
      material.map.colorSpace = THREE.SRGBColorSpace;
      material.map.needsUpdate = true;
    }
    if (material.emissiveMap) {
      material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
      material.emissiveMap.needsUpdate = true;
    }
    if (material.normalMap) material.normalMap.colorSpace = THREE.NoColorSpace;
    if (material.roughnessMap) material.roughnessMap.colorSpace = THREE.NoColorSpace;
    if (material.metalnessMap) material.metalnessMap.colorSpace = THREE.NoColorSpace;
    if (material.aoMap) material.aoMap.colorSpace = THREE.NoColorSpace;
  }

  private cloneAsStandard(source: THREE.Material): THREE.MeshStandardMaterial {
    if (source instanceof THREE.MeshStandardMaterial) {
      const clone = source.clone();
      this.encodeColorMaps(clone);
      return clone;
    }
    return new THREE.MeshStandardMaterial({ color: this.canvasWhite });
  }

  private adoptGlbMaterial(part: string, source: THREE.Material, geometry: THREE.BufferGeometry) {
    const dest = this.materials[part];
    if (!dest || dest.userData.glbAdopted) return;
    const cloned = this.cloneAsStandard(source);
    dest.map = cloned.map;
    dest.normalMap = cloned.normalMap;
    dest.roughnessMap = cloned.roughnessMap;
    dest.metalnessMap = cloned.metalnessMap;
    dest.aoMap = cloned.aoMap;
    dest.roughness = Math.max(cloned.roughness, 0.82);
    dest.metalness = Math.min(cloned.metalness, 0.04);
    dest.color.copy(cloned.color);
    dest.envMapIntensity = 0.55;
    dest.side = THREE.DoubleSide;
    dest.vertexColors = Boolean(geometry.getAttribute("color"));
    dest.userData.glbColor = cloned.color.clone();
    dest.userData.glbVertexColors = dest.vertexColors;
    dest.userData.glbAdopted = true;
    dest.needsUpdate = true;
  }

  private tintAlbedo(material: THREE.MeshStandardMaterial, hex: string) {
    material.vertexColors = false;
    const baked = this.config.model.defaultColors.fabric;
    if (material.map) {
      const desired = new THREE.Color().setStyle(hex);
      const bakedCol = new THREE.Color().setStyle(baked);
      material.color.setRGB(
        bakedCol.r === 0 ? desired.r : Math.min(desired.r / bakedCol.r, 8),
        bakedCol.g === 0 ? desired.g : Math.min(desired.g / bakedCol.g, 8),
        bakedCol.b === 0 ? desired.b : Math.min(desired.b / bakedCol.b, 8),
      );
    } else {
      material.color.set(hex);
    }
    material.needsUpdate = true;
  }

  restoreGlbAlbedo() {
    Object.entries(this.materials).forEach(([part, material]) => {
      if (!isCanopyRegion(part)) return;
      const orig = material.userData.glbColor as THREE.Color | undefined;
      if (orig) material.color.copy(orig);
      else material.color.set(this.canvasWhite);
      material.vertexColors = Boolean(material.userData.glbVertexColors);
      material.needsUpdate = true;
    });
    this.cacheNeedsUpdate = true;
    this.onNeedRender();
  }

  private resolvePart(mesh: THREE.Mesh): string {
    const haystack = this.collectNameHints(mesh);
    const candidates = this.parts
      .filter((p) => p !== "all")
      .sort((a, b) => this.compact(b).length - this.compact(a).length);

    for (const part of candidates) {
      if (this.partTokens(part).some((token) => haystack.includes(token))) return part;
    }
    return this.defaultPart;
  }

  initMaterials(_partState: Record<string, PartColorState>, anisotropy: number) {
    if (this.materialsReady) return;
    this.materialsReady = true;
    this.parts.forEach((p) => {
      if (this.isMetalPart(p)) return;
      this.materials[p] = new THREE.MeshStandardMaterial({
        color: this.canvasWhite,
        metalness: 0,
        roughness: 1,
        side: THREE.DoubleSide,
        envMapIntensity: 0.55,
      });

      const offscreen = document.createElement("canvas");
      offscreen.width = this.canvasSize;
      offscreen.height = this.canvasSize;
      const c = offscreen.getContext("2d")!;
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = "high";

      const tex = new THREE.CanvasTexture(offscreen);
      tex.flipY = false;
      tex.format = THREE.RGBAFormat;
      tex.type = THREE.UnsignedByteType;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearMipMapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      tex.anisotropy = anisotropy;

      this.canvases[p] = offscreen;
      this.ctxs[p] = c;
      this.textures[p] = tex;

      this.decalMaterials[p] = new THREE.MeshStandardMaterial({
        map: tex,
        transparent: true,
        roughness: 1.0,
        metalness: 0.0,
        envMapIntensity: 0.2,
        alphaTest: 0.05,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
        depthWrite: false,
        side: THREE.FrontSide,
      });
    });
  }

  private addOverlay(
    group: THREE.Group,
    source: THREE.Mesh,
    material: THREE.MeshStandardMaterial,
    renderOrder: number,
    part: string,
    kind: "part" | "all",
  ) {
    const overlay = new THREE.Mesh(source.geometry, material);
    overlay.position.copy(source.position);
    overlay.quaternion.copy(source.quaternion);
    overlay.scale.copy(source.scale);
    overlay.updateMatrix();
    overlay.matrixAutoUpdate = false;
    overlay.renderOrder = renderOrder;
    overlay.visible = false;
    overlay.frustumCulled = true;
    overlay.userData.isBaseMesh = false;
    overlay.userData.overlayPart = part;
    overlay.userData.overlayKind = kind;
    overlay.raycast = () => undefined;
    this.overlays.push(overlay);
    group.add(overlay);
  }

  prepareModel(root: THREE.Object3D): THREE.Group {
    const group = new THREE.Group();
    const meshes: THREE.Mesh[] = [];
    root.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
    });

    this.tentMeshes = [];
    this.overlays = [];
    const fabricSources: THREE.Mesh[] = [];

    for (const child of meshes) {
      child.castShadow = false;
      child.receiveShadow = false;
      child.updateMatrix();
      child.matrixAutoUpdate = false;

      if (this.isMetalMesh(child)) {
        const origMat = Array.isArray(child.material) ? child.material[0] : child.material;
        if (origMat) {
          const metalMat = this.cloneAsStandard(origMat);
          metalMat.envMapIntensity = 1;
          metalMat.side = THREE.FrontSide;
          child.material = metalMat;
        }
        child.userData.partName = /leg/.test(this.collectNameHints(child)) ? "legs" : "mechanism";
        child.userData.isBaseMesh = true;
        child.frustumCulled = true;
        child.removeFromParent();
        this.tentMeshes.push(child);
        group.add(child);
        continue;
      }

      if (this.isInnerMesh(child)) {
        const origMat = Array.isArray(child.material) ? child.material[0] : child.material;
        if (origMat) child.material = this.cloneAsStandard(origMat);
        child.userData.partName = "inner-fabric";
        child.userData.isBaseMesh = true;
        child.frustumCulled = true;
        child.removeFromParent();
        this.tentMeshes.push(child);
        group.add(child);
        continue;
      }

      fabricSources.push(child);
    }

    fabricSources.forEach((source) => {
      const origMat = Array.isArray(source.material) ? source.material[0] : source.material;
      if (origMat) {
        CANOPY_REGIONS.forEach((region) => {
          if (this.materials[region]) this.adoptGlbMaterial(region, origMat, source.geometry);
        });
      }
      const pieces = splitCanopyGeometry(source);
      Object.entries(pieces).forEach(([region, geometry]) => {
        if (!geometry) return;
        const mesh = new THREE.Mesh(geometry, this.materials[region] ?? this.materials.all);
        mesh.position.copy(source.position);
        mesh.quaternion.copy(source.quaternion);
        mesh.scale.copy(source.scale);
        mesh.updateMatrix();
        mesh.matrixAutoUpdate = false;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.frustumCulled = true;
        mesh.userData.partName = region;
        mesh.userData.isBaseMesh = true;
        this.tentMeshes.push(mesh);
        group.add(mesh);
        const partDecal = this.decalMaterials[region];
        const allDecal = this.decalMaterials.all;
        if (partDecal) this.addOverlay(group, mesh, partDecal, 1, region, "part");
        if (allDecal) this.addOverlay(group, mesh, allDecal, 2, region, "all");
      });
    });

    this.computeSilhouettes();
    this.computeIslandAngles();
    this.cacheNeedsUpdate = true;
    return group;
  }

  private computeSilhouettes() {
    this.tentMeshes.forEach((mesh) => {
      if (mesh.name.toLowerCase().includes("stitch")) return;
      const partName = mesh.userData.partName as string;
      if (!isCanopyRegion(partName)) return;
      const uvs = mesh.geometry.attributes.uv;
      const indices = mesh.geometry.index;
      if (!uvs) return;

      let minU = Infinity;
      let maxU = -Infinity;
      let minV = Infinity;
      let maxV = -Infinity;
      for (let i = 0; i < uvs.count; i++) {
        const u = uvs.getX(i);
        const v = uvs.getY(i);
        if (u < minU) minU = u;
        if (u > maxU) maxU = u;
        if (v < minV) minV = v;
        if (v > maxV) maxV = v;
      }
      this.uvBounds[partName] = { minU, maxU, minV, maxV };

      const silCanvas = document.createElement("canvas");
      silCanvas.width = this.canvasSize;
      silCanvas.height = this.canvasSize;
      const silCtx = silCanvas.getContext("2d")!;
      silCtx.fillStyle = "#000000";

      const drawTriangle = (a: number, b: number, c: number) => {
        const pa = this.uvToCanvas(uvs.getX(a), uvs.getY(a));
        const pb = this.uvToCanvas(uvs.getX(b), uvs.getY(b));
        const pc = this.uvToCanvas(uvs.getX(c), uvs.getY(c));
        silCtx.beginPath();
        silCtx.moveTo(pa.x, pa.y);
        silCtx.lineTo(pb.x, pb.y);
        silCtx.lineTo(pc.x, pc.y);
        silCtx.closePath();
        silCtx.fill();
      };

      if (indices) {
        for (let i = 0; i < indices.count; i += 3) {
          drawTriangle(indices.getX(i), indices.getX(i + 1), indices.getX(i + 2));
        }
      } else {
        for (let i = 0; i < uvs.count; i += 3) drawTriangle(i, i + 1, i + 2);
      }
      this.silhouettes[partName] = silCanvas;
    });
  }

  private computeIslandAngles() {
    this.tentMeshes.forEach((mesh) => {
      const partName = mesh.userData.partName as string;
      if (!isCanopyRegion(partName)) return;
      const pos = mesh.geometry.attributes.position;
      const uv = mesh.geometry.attributes.uv;
      if (!pos || !uv || pos.count === 0) return;

      let maxY = -Infinity;
      let su = 0;
      let sv = 0;
      const tips: Array<{ u: number; v: number }> = [];
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const u = uv.getX(i);
        const v = uv.getY(i);
        su += u;
        sv += v;
        if (y > maxY + 1e-5) {
          maxY = y;
          tips.length = 0;
          tips.push({ u, v });
        } else if (Math.abs(y - maxY) <= 1e-5) {
          tips.push({ u, v });
        }
      }
      if (!tips.length) return;
      const cu = su / pos.count;
      const cv = sv / pos.count;
      const tu = tips.reduce((sum, tip) => sum + tip.u, 0) / tips.length;
      const tv = tips.reduce((sum, tip) => sum + tip.v, 0) / tips.length;
      const origin = this.uvToCanvas(cu, cv);
      const peak = this.uvToCanvas(tu, tv);
      this.islandAngle[partName] = Math.atan2(peak.x - origin.x, -(peak.y - origin.y));
    });
  }

  private regionAtCanvas(x: number, y: number, fallback: string) {
    const u = x / this.canvasSize;
    const v = y / this.canvasSize;
    let best = fallback;
    let bestArea = Infinity;
    for (const [part, bounds] of Object.entries(this.uvBounds)) {
      if (u < bounds.minU || u > bounds.maxU || v < bounds.minV || v > bounds.maxV) continue;
      const area = (bounds.maxU - bounds.minU) * (bounds.maxV - bounds.minV);
      if (area < bestArea) {
        bestArea = area;
        best = part;
      }
    }
    return best;
  }

  private logoSpin(logo: Logo) {
    const part = this.regionAtCanvas(logo.x + logo.w / 2, logo.y + logo.h / 2, logo.part);
    return logo.angle + (this.islandAngle[part] ?? Math.PI);
  }

  applyPartColor(part: string, hex: string, parts: string[]) {
    colorTargetsFor(part).forEach((target) => {
      if (this.materials[target]) this.tintAlbedo(this.materials[target], hex);
    });
    void parts;
    this.cacheNeedsUpdate = true;
    this.onNeedRender();
  }

  applyBlend(part: string, blend: BlendMode) {
    const mat = this.decalMaterials[part];
    if (!mat) return;
    if (blend === "multiply") mat.blending = THREE.MultiplyBlending;
    else if (blend === "screen") mat.blending = THREE.AdditiveBlending;
    else mat.blending = THREE.NormalBlending;
    mat.needsUpdate = true;
    this.onNeedRender();
  }

  findCenterUV(part: string, viewPos: THREE.Vector3): { x: number; y: number } {
    const targetMesh = this.tentMeshes.find((m) => colorTargetsFor(part).includes(m.userData.partName as string));
    if (!targetMesh) return { x: this.canvasSize / 2, y: this.canvasSize / 2 };
    targetMesh.geometry.computeBoundingBox();
    const center3D = new THREE.Vector3();
    targetMesh.geometry.boundingBox!.getCenter(center3D);
    targetMesh.localToWorld(center3D);

    const tempRaycaster = new THREE.Raycaster();
    tempRaycaster.set(viewPos, new THREE.Vector3().subVectors(center3D, viewPos).normalize());
    const hits = tempRaycaster.intersectObject(targetMesh, false);
    return hits.length > 0 && hits[0].uv
      ? this.uvToCanvas(hits[0].uv.x, hits[0].uv.y)
      : { x: this.canvasSize / 2, y: this.canvasSize / 2 };
  }

  getUV(clientX: number, clientY: number, canvas: HTMLCanvasElement, camera: THREE.Camera): UVHit | null {
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const pickMeshes = this.tentMeshes.filter((mesh) => isCanopyRegion(mesh.userData.partName as string));
    const hits = raycaster.intersectObjects(pickMeshes, false);
    if (hits.length > 0 && hits[0].uv) {
      const { x, y } = this.uvToCanvas(hits[0].uv.x, hits[0].uv.y);
      return {
        x,
        y,
        part: hits[0].object.userData.partName as string,
      };
    }
    return null;
  }

  getMinimapUV(clientX: number, clientY: number, uvCanvas: HTMLCanvasElement, activePart: string): UVHit {
    const rect = uvCanvas.getBoundingClientRect();
    const rawX = ((clientX - rect.left) / rect.width) * uvCanvas.width;
    const rawY = ((clientY - rect.top) / rect.height) * uvCanvas.height;
    const unscaledX = (rawX - this.minimapState.offsetX) / this.minimapState.scale;
    const unscaledY = (rawY - this.minimapState.offsetY) / this.minimapState.scale;
    const ratio = this.canvasSize / uvCanvas.width;
    return { x: unscaledX * ratio, y: unscaledY * ratio, part: activePart };
  }

  handles(logo: Logo) {
    const hw = logo.w / 2;
    const hh = logo.h / 2;
    return {
      pin: { lx: -hw, ly: -hh },
      rotate: { lx: hw, ly: -hh },
      del: { lx: -hw, ly: hh },
      clone: { lx: 0, ly: hh },
      resize: { lx: hw, ly: hh },
    };
  }

  toLocal(logo: Logo, px: number, py: number) {
    const cx = logo.x + logo.w / 2;
    const cy = logo.y + logo.h / 2;
    const spin = this.logoSpin(logo);
    const cos = Math.cos(-spin);
    const sin = Math.sin(-spin);
    return { lx: cos * (px - cx) - sin * (py - cy), ly: sin * (px - cx) + cos * (py - cy) };
  }

  hitHandle(logo: Logo, px: number, py: number, key: HandleKey) {
    const { lx, ly } = this.toLocal(logo, px, py);
    const h = this.handles(logo)[key];
    return Math.abs(lx - h.lx) <= HALF && Math.abs(ly - h.ly) <= HALF;
  }

  hitBody(logo: Logo, px: number, py: number) {
    const { lx, ly } = this.toLocal(logo, px, py);
    return Math.abs(lx) <= logo.w / 2 && Math.abs(ly) <= logo.h / 2;
  }

  redraw(logos: Logo[], selectedIndex: number) {
    this.computeIslandAngles();
    this.parts.forEach((p) => {
      this.ctxs[p]?.clearRect(0, 0, this.canvasSize, this.canvasSize);
      const tex = this.textures[p];
      if (tex && tex.flipY) {
        tex.flipY = false;
        tex.needsUpdate = true;
      }
    });

    const overlay = this.config.graphics.overlay;
    logos.forEach((logo, i) => {
      this.ctx = this.ctxs[logo.part];
      if (!this.ctx) return;
      this.ctx.save();
      const cx = logo.x + logo.w / 2;
      const cy = logo.y + logo.h / 2;
      this.ctx.translate(cx, cy);
      this.ctx.rotate(this.logoSpin(logo));
      this.ctx.globalAlpha = (logo.opacity ?? 100) / 100;
      this.ctx.globalCompositeOperation = logo.blend ?? "source-over";
      this.ctx.drawImage(logo.img, -logo.w / 2, -logo.h / 2, logo.w, logo.h);
      this.ctx.globalAlpha = 1;
      this.ctx.globalCompositeOperation = "source-over";

      if (i === selectedIndex) {
        this.ctx.strokeStyle = logo.pinned ? overlay.locked : overlay.selection;
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash(logo.pinned ? [6, 4] : []);
        this.ctx.strokeRect(-logo.w / 2, -logo.h / 2, logo.w, logo.h);
        this.ctx.setLineDash([]);

        const hw = logo.w / 2;
        const hh = logo.h / 2;
        this.drawPinNode(-hw, -hh, logo.pinned);
        if (!logo.pinned) {
          this.drawRotateNode(hw, -hh);
          this.drawDeleteNode(-hw, hh);
          this.drawCloneNode(0, hh);
          this.drawResizeNode(hw, hh);
        }
      }
      this.ctx.restore();
    });

    this.parts.forEach((p) => {
      if (this.textures[p]) this.textures[p].needsUpdate = true;
    });
    this.updateOverlayVisibility(logos);
    this.onNeedRender();
  }

  private updateOverlayVisibility(logos: Logo[]) {
    const used = new Set(logos.map((logo) => logo.part));
    this.overlays.forEach((overlay) => {
      overlay.visible =
        overlay.userData.overlayKind === "all" ? used.has("all") : used.has(overlay.userData.overlayPart as string);
    });
  }

  updateUVMinimap(
    canvas: HTMLCanvasElement,
    activePart: string,
    partState: Record<string, PartColorState>,
    minimized: boolean,
  ) {
    if (minimized) return;
    const mCtx = canvas.getContext("2d");
    if (!mCtx) return;
    const W = canvas.width;
    const H = canvas.height;
    mCtx.clearRect(0, 0, W, H);

    if (this.cacheNeedsUpdate) this.rebuildBaseUVCache(activePart, partState);
    if (!this.uvBoxCache.isValid) return;

    mCtx.save();
    const padding = 20;
    const boxW = (this.uvBoxCache.maxU - this.uvBoxCache.minU) * W;
    const boxH = (this.uvBoxCache.maxV - this.uvBoxCache.minV) * H;
    const boxCx = ((this.uvBoxCache.minU + this.uvBoxCache.maxU) / 2) * W;
    const boxCy = ((this.uvBoxCache.minV + this.uvBoxCache.maxV) / 2) * H;
    const scale = boxW === 0 || boxH === 0 ? 1 : Math.min((W - padding * 2) / boxW, (H - padding * 2) / boxH);

    this.minimapState.scale = scale;
    this.minimapState.offsetX = W / 2 - boxCx * scale;
    this.minimapState.offsetY = H / 2 - boxCy * scale;

    mCtx.translate(W / 2, H / 2);
    mCtx.scale(scale, scale);
    mCtx.translate(-boxCx, -boxCy);
    mCtx.drawImage(this.baseUVCache, 0, 0, W, H);

    if (activePart === "all") {
      this.parts.forEach((p) => {
        if (this.canvases[p]) mCtx.drawImage(this.canvases[p], 0, 0, W, H);
      });
    } else {
      if (this.canvases[activePart]) mCtx.drawImage(this.canvases[activePart], 0, 0, W, H);
      if (this.canvases.all) mCtx.drawImage(this.canvases.all, 0, 0, W, H);
    }
    mCtx.restore();
  }

  private rebuildBaseUVCache(activePart: string, partState: Record<string, PartColorState>) {
    this.cacheCtx.clearRect(0, 0, this.canvasSize, this.canvasSize);
    const targets = new Set(colorTargetsFor(activePart));
    const meshesToDraw = this.tentMeshes.filter((m) => targets.has(m.userData.partName as string));
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    let hasValidUVs = false;

    meshesToDraw.forEach((mesh) => {
      if (mesh.name.toLowerCase().includes("stitch")) return;
      const partName = mesh.userData.partName as string;
      const bounds = this.uvBounds[partName];
      if (bounds) {
        hasValidUVs = true;
        if (bounds.minU < minU) minU = bounds.minU;
        if (bounds.maxU > maxU) maxU = bounds.maxU;
        if (bounds.minV < minV) minV = bounds.minV;
        if (bounds.maxV > maxV) maxV = bounds.maxV;
      }
      const silCanvas = this.silhouettes[partName];
      if (silCanvas) {
        const color = partState[partName]?.color || this.canvasWhite;
        this.tempTintCtx.clearRect(0, 0, this.canvasSize, this.canvasSize);
        this.tempTintCtx.drawImage(silCanvas, 0, 0);
        this.tempTintCtx.globalCompositeOperation = "source-in";
        this.tempTintCtx.fillStyle = color;
        this.tempTintCtx.fillRect(0, 0, this.canvasSize, this.canvasSize);
        this.tempTintCtx.globalCompositeOperation = "source-over";
        this.cacheCtx.drawImage(this.tempTintCanvas, 0, 0);
      }
    });

    this.uvBoxCache = { minU, maxU, minV, maxV, isValid: hasValidUVs };
    this.cacheNeedsUpdate = false;
  }

  private drawNode(cx: number, cy: number, color = this.overlay.selection) {
    const ctx = this.ctx!;
    ctx.beginPath();
    ctx.arc(cx, cy, CTRL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.overlay.handle;
    ctx.stroke();
  }

  private drawDeleteNode(cx: number, cy: number) {
    const ctx = this.ctx!;
    this.drawNode(cx, cy, this.overlay.danger);
    ctx.beginPath();
    const d = 8;
    ctx.moveTo(cx - d, cy - d);
    ctx.lineTo(cx + d, cy + d);
    ctx.moveTo(cx + d, cy - d);
    ctx.lineTo(cx - d, cy + d);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = this.overlay.handle;
    ctx.stroke();
  }

  private drawRotateNode(cx: number, cy: number) {
    const ctx = this.ctx!;
    this.drawNode(cx, cy, this.overlay.selection);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = this.overlay.handle;
    ctx.beginPath();
    ctx.arc(cx, cy, 6.5, Math.PI * 0.7, Math.PI * 1.95);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 6.5, cy - 1.5);
    ctx.lineTo(cx + 6.5, cy - 7.5);
    ctx.lineTo(cx + 1.2, cy - 7.5);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
  }

  private drawCloneNode(cx: number, cy: number) {
    const ctx = this.ctx!;
    this.drawNode(cx, cy, this.overlay.selection);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = this.overlay.handle;
    ctx.strokeRect(cx - 7, cy - 3, 10, 10);
    ctx.strokeRect(cx - 3, cy - 7, 10, 10);
  }

  private drawResizeNode(cx: number, cy: number) {
    const ctx = this.ctx!;
    this.drawNode(cx, cy, this.overlay.selection);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = this.overlay.handle;
    ctx.beginPath();
    const d = 6.5;
    ctx.moveTo(cx - d, cy - d);
    ctx.lineTo(cx + d, cy + d);
    ctx.moveTo(cx - d + 4.5, cy - d);
    ctx.lineTo(cx - d, cy - d);
    ctx.lineTo(cx - d, cy - d + 4.5);
    ctx.moveTo(cx + d - 4.5, cy + d);
    ctx.lineTo(cx + d, cy + d);
    ctx.lineTo(cx + d, cy + d - 4.5);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
  }

  private drawPinNode(cx: number, cy: number, isPinned: boolean) {
    const ctx = this.ctx!;
    const pin = isPinned ? this.overlay.pinOn : this.overlay.pinOff;
    this.drawNode(cx, cy, pin);
    ctx.fillStyle = this.overlay.handle;
    ctx.fillRect(cx - 7, cy - 1, 14, 10);
    ctx.fillStyle = pin;
    ctx.beginPath();
    ctx.arc(cx, cy + 3.5, 2, 0, Math.PI * 2);
    ctx.moveTo(cx - 2.5, cy + 7.5);
    ctx.lineTo(cx + 2.5, cy + 7.5);
    ctx.lineTo(cx, cy + 2);
    ctx.fill();
    ctx.beginPath();
    ctx.strokeStyle = this.overlay.handle;
    ctx.lineWidth = 2.5;
    if (isPinned) {
      ctx.arc(cx, cy - 1, 4.5, Math.PI, 0);
    } else {
      ctx.arc(cx, cy - 4, 4.5, Math.PI, 0);
      ctx.moveTo(cx - 4.5, cy - 4);
      ctx.lineTo(cx - 4.5, cy - 1);
    }
    ctx.stroke();
  }
}

export function disposeLogo(logo: Logo) {
  if (logo.img) {
    logo.img.src = "";
  }
}
