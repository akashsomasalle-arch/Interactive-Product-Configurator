import * as THREE from "three";

export const CANOPY_REGIONS = [
  "back-peak",
  "front-peak",
  "left-peak",
  "right-peak",
  "back-valance",
  "front-valance",
  "left-valance",
  "right-valance",
] as const;

export type CanopyRegion = (typeof CANOPY_REGIONS)[number];

export const VALANCE_REGIONS: CanopyRegion[] = [
  "back-valance",
  "front-valance",
  "left-valance",
  "right-valance",
];

export function isCanopyRegion(part: string): part is CanopyRegion {
  return (CANOPY_REGIONS as readonly string[]).includes(part);
}

export function colorTargetsFor(part: string): string[] {
  if (part === "all") return [...CANOPY_REGIONS];
  if (part === "valance") return [...VALANCE_REGIONS];
  return [part];
}

export function classifyCanopyFace(
  x: number,
  y: number,
  z: number,
  nx: number,
  nz: number,
  minY: number,
  maxY: number,
): CanopyRegion {
  const cut = minY + (maxY - minY) * 0.18;
  const band = y < cut ? "valance" : "peak";
  const side = Math.abs(nz) >= Math.abs(nx) ? (z >= 0 ? "front" : "back") : (x >= 0 ? "right" : "left");
  return `${side}-${band}` as CanopyRegion;
}

export function splitCanopyGeometry(mesh: THREE.Mesh): Partial<Record<CanopyRegion, THREE.BufferGeometry>> {
  const geom = mesh.geometry;
  const pos = geom.attributes.position;
  if (!pos) return {};

  mesh.updateWorldMatrix(true, false);
  const world = mesh.matrixWorld;
  const worldBox = new THREE.Box3().setFromObject(mesh);
  const minY = worldBox.min.y;
  const maxY = worldBox.max.y;

  const idx = geom.index;
  const triCount = Math.floor((idx ? idx.count : pos.count) / 3);
  const buckets: Partial<Record<CanopyRegion, number[][]>> = {};
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const nor = new THREE.Vector3();
  const cent = new THREE.Vector3();
  const indexAt = (i: number) => (idx ? idx.getX(i) : i);

  for (let t = 0; t < triCount; t++) {
    const ia = indexAt(t * 3);
    const ib = indexAt(t * 3 + 1);
    const ic = indexAt(t * 3 + 2);
    a.fromBufferAttribute(pos, ia).applyMatrix4(world);
    b.fromBufferAttribute(pos, ib).applyMatrix4(world);
    c.fromBufferAttribute(pos, ic).applyMatrix4(world);
    cent.set((a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3, (a.z + b.z + c.z) / 3);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    nor.crossVectors(ab, ac).normalize();
    const region = classifyCanopyFace(cent.x, cent.y, cent.z, nor.x, nor.z, minY, maxY);
    (buckets[region] ??= []).push([ia, ib, ic]);
  }

  const nrm = geom.attributes.normal;
  const uv = geom.attributes.uv;
  const col = geom.attributes.color;
  const out: Partial<Record<CanopyRegion, THREE.BufferGeometry>> = {};

  (Object.entries(buckets) as Array<[CanopyRegion, number[][]]>).forEach(([region, triangles]) => {
    const remap = new Map<number, number>();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const add = (old: number) => {
      const existing = remap.get(old);
      if (existing != null) return existing;
      const next = remap.size;
      remap.set(old, next);
      positions.push(pos.getX(old), pos.getY(old), pos.getZ(old));
      if (nrm) normals.push(nrm.getX(old), nrm.getY(old), nrm.getZ(old));
      if (uv) uvs.push(uv.getX(old), uv.getY(old));
      if (col) {
        for (let k = 0; k < col.itemSize; k++) colors.push(col.getComponent(old, k));
      }
      return next;
    };

    triangles.forEach(([ia, ib, ic]) => {
      indices.push(add(ia), add(ib), add(ic));
    });

    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    if (normals.length) next.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    else next.computeVertexNormals();
    if (uvs.length) next.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    if (col && colors.length) next.setAttribute("color", new THREE.Float32BufferAttribute(colors, col.itemSize));
    next.setIndex(indices);
    out[region] = next;
  });

  return out;
}
