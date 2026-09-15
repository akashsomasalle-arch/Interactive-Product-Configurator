import * as THREE from "three";
import { appConfig } from "./appLocation";
import type { UVBounds, WallCoverage } from "../types";

export interface WallMeshSpec {
  id: "wallBack" | "wallLeft" | "wallRight";
  position: THREE.Vector3Tuple;
  rotation: THREE.EulerTuple;
  width: number;
  height: number;
}

const FIT = appConfig.model.wallFit;

export function measureWallBounds(meshes: THREE.Mesh[], metalParts: string[]) {
  const full = new THREE.Box3();
  const fabric = new THREE.Box3();
  const legs = new THREE.Box3();

  meshes.forEach((mesh) => {
    full.expandByObject(mesh);
    const part = mesh.userData.partName as string;
    if (part === "legs") legs.expandByObject(mesh);
    else if (!metalParts.includes(part)) fabric.expandByObject(mesh);
  });

  const groundY = full.min.y;
  const peakY = full.max.y;
  const eaveY = !legs.isEmpty() ? legs.max.y : groundY + (peakY - groundY) * FIT.eaveRatio;
  const valanceY = !fabric.isEmpty() ? fabric.min.y : eaveY;
  const canopyY =
    valanceY > groundY + FIT.valanceMinAboveGround && valanceY < peakY - FIT.valanceMaxBelowPeak
      ? valanceY
      : Math.min(eaveY, groundY + (peakY - groundY) * FIT.halfHeightRatio);

  return {
    footprint: !legs.isEmpty() ? legs : full,
    groundY,
    canopyY,
  };
}

export class WallBuilder {
  static fromBounds(options: {
    footprint: THREE.Box3;
    groundY: number;
    canopyY: number;
    back: WallCoverage;
    sides: WallCoverage;
  }): WallMeshSpec[] {
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    options.footprint.getSize(size);
    options.footprint.getCenter(center);

    const fullHeight = Math.max(FIT.minHeight, options.canopyY - options.groundY);
    const walls: WallMeshSpec[] = [];

    if (options.back !== "none") {
      const height = options.back === "half" ? fullHeight * FIT.halfHeightRatio : fullHeight;
      walls.push({
        id: "wallBack",
        position: [center.x, options.groundY + height / 2, options.footprint.min.z + FIT.inset],
        rotation: [0, Math.PI, 0],
        width: size.x * FIT.widthScale,
        height,
      });
    }

    if (options.sides !== "none") {
      const height = options.sides === "half" ? fullHeight * FIT.halfHeightRatio : fullHeight;
      const sideY = options.groundY + height / 2;
      walls.push(
        {
          id: "wallLeft",
          position: [options.footprint.min.x + FIT.inset, sideY, center.z],
          rotation: [0, Math.PI / 2, 0],
          width: size.z * FIT.widthScale,
          height,
        },
        {
          id: "wallRight",
          position: [options.footprint.max.x - FIT.inset, sideY, center.z],
          rotation: [0, -Math.PI / 2, 0],
          width: size.z * FIT.widthScale,
          height,
        },
      );
    }

    return walls;
  }
}

function swatchTexture(tex: THREE.Texture | null, bounds?: UVBounds) {
  if (!tex) return null;
  const next = tex.clone();
  next.wrapS = THREE.RepeatWrapping;
  next.wrapT = THREE.RepeatWrapping;
  if (bounds) {
    next.offset.set(bounds.minU, bounds.minV);
    next.repeat.set(Math.max(0.08, bounds.maxU - bounds.minU), Math.max(0.08, bounds.maxV - bounds.minV));
  }
  next.needsUpdate = true;
  return next;
}

export function makeWallMaterial(
  source: THREE.MeshStandardMaterial | undefined,
  bounds: UVBounds | undefined,
  hex: string,
  original: boolean,
) {
  const material = source ? source.clone() : new THREE.MeshStandardMaterial({ color: hex });
  material.side = THREE.DoubleSide;
  material.polygonOffset = true;
  material.polygonOffsetFactor = 1;
  material.map = swatchTexture(source?.map ?? null, bounds);
  material.normalMap = swatchTexture(source?.normalMap ?? null, bounds);
  material.roughnessMap = swatchTexture(source?.roughnessMap ?? null, bounds);
  material.metalnessMap = swatchTexture(source?.metalnessMap ?? null, bounds);
  material.aoMap = swatchTexture(source?.aoMap ?? null, bounds);
  if (original && source?.userData.glbColor) {
    material.color.copy(source.userData.glbColor as THREE.Color);
  } else {
    material.color.set(hex);
  }
  material.needsUpdate = true;
  return material;
}
