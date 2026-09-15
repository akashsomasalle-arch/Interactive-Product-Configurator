import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, Stats, useGLTF } from "@react-three/drei";
import { Suspense, lazy, memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CAM_VIEWS, config, useConfigurator } from "../store/ConfiguratorContext";
import { makeWallMaterial, measureWallBounds, WallBuilder } from "../lib/wallBuilder";
import { fabricHex } from "../utils";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

THREE.ColorManagement.enabled = true;
useGLTF.preload(config.model.path);

const ScenePost = lazy(() => import("./ScenePost"));
const CAM_TARGET = config.camera.target ?? { x: 0, y: 0, z: 0 };
const CAM_FOV = config.camera.fov;
const CAM_LERP = config.camera.lerp;
const CAM_SNAP = config.camera.snapDistance;
const CAM_DEFAULT_VIEW = config.camera.defaultView;
const SHADOWS = config.scene.contactShadows;
const CAM_VIEW_TARGETS: Record<string, THREE.Vector3> = {};
for (const [key, pos] of Object.entries(config.camera.viewTargets ?? {})) {
  CAM_VIEW_TARGETS[key] = new THREE.Vector3(pos.x, pos.y, pos.z);
}

function SceneBackground() {
  const { sceneBg } = useConfigurator();
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    scene.background = new THREE.Color(sceneBg);
  }, [sceneBg, scene]);

  return null;
}

function EnvMap() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.environmentIntensity = config.scene.environmentIntensity;
  }, [scene]);
  return (
    <Environment
      files={config.scene.environmentPath}
      background={false}
      environmentIntensity={config.scene.environmentIntensity}
    />
  );
}

function CameraRig() {
  const { cameraView, cameraTick, skuId, autoRotate, controlsEnabled } = useConfigurator();
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useRef<OrbitControlsImpl>(null);
  const goal = useRef(new THREE.Vector3());
  const lookAt = useRef(new THREE.Vector3());
  const animating = useRef(false);
  const framedFor = useRef<string | null>(null);

  useEffect(() => {
    framedFor.current = null;
  }, [skuId]);

  useEffect(() => {
    const pos = CAM_VIEWS[cameraView] || CAM_VIEWS[CAM_DEFAULT_VIEW];
    const target = CAM_VIEW_TARGETS[cameraView] ?? CAM_TARGET;
    goal.current.set(pos.x, pos.y, pos.z);
    lookAt.current.set(target.x, target.y, target.z);

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = CAM_FOV;
      camera.updateProjectionMatrix();
    }

    if (cameraView === CAM_DEFAULT_VIEW) {
      const key = `${skuId}:${CAM_DEFAULT_VIEW}`;
      if (framedFor.current !== key) {
        camera.position.copy(goal.current);
        controls.current?.target.copy(lookAt.current);
        controls.current?.update();
        framedFor.current = key;
        animating.current = false;
        return;
      }
      animating.current = true;
      invalidate();
      return;
    }

    animating.current = true;
    invalidate();
  }, [cameraView, cameraTick, skuId, camera, invalidate]);

  useFrame(() => {
    if (!animating.current || !controls.current) return;

    camera.position.lerp(goal.current, CAM_LERP);
    controls.current.target.lerp(lookAt.current, CAM_LERP);
    controls.current.update();

    if (camera.position.distanceTo(goal.current) < CAM_SNAP) {
      camera.position.copy(goal.current);
      controls.current.target.copy(lookAt.current);
      controls.current.update();
      animating.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={config.camera.dampingFactor}
      enablePan
      enableRotate
      enableZoom
      minDistance={config.camera.minDistance ?? 2.5}
      maxDistance={config.camera.maxDistance ?? 12}
      minPolarAngle={config.camera.minPolarAngle ?? 0.08}
      maxPolarAngle={config.camera.maxPolarAngle ?? 1.636}
      target={[CAM_TARGET.x, CAM_TARGET.y, CAM_TARGET.z]}
      autoRotate={autoRotate}
      autoRotateSpeed={config.camera.autoRotateSpeed}
      enabled={controlsEnabled}
      onStart={() => {
        animating.current = false;
      }}
    />
  );
}

function CameraReadout() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | undefined;
  const node = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    const el = document.createElement("pre");
    el.className = "camera-readout";
    gl.domElement.parentElement?.appendChild(el);
    node.current = el;
    return () => {
      el.remove();
      node.current = null;
    };
  }, [gl]);

  useFrame(() => {
    if (!node.current) return;
    const p = camera.position;
    const t = controls?.target;
    const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : CAM_FOV;
    node.current.textContent =
      `pos     { "x": ${p.x.toFixed(3)}, "y": ${p.y.toFixed(3)}, "z": ${p.z.toFixed(3)} }\n` +
      `target  { "x": ${(t?.x ?? 0).toFixed(3)}, "y": ${(t?.y ?? 0).toFixed(3)}, "z": ${(t?.z ?? 0).toFixed(3)} }\n` +
      `fov     ${fov.toFixed(2)}`;
  });

  return null;
}

function CaptureBridge() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | undefined;
  const { engine } = useConfigurator();

  useEffect(() => {
    engine.captureThumbnail = () => {
      try {
        const prevPos = camera.position.clone();
        const prevTarget = controls?.target.clone();
        camera.position.copy(CAM_VIEWS[CAM_DEFAULT_VIEW]);
        if (controls) {
          controls.target.set(CAM_TARGET.x, CAM_TARGET.y, CAM_TARGET.z);
          controls.update();
        }
        gl.render(scene, camera);
        const data = gl.domElement.toDataURL("image/jpeg", config.graphics.thumbnailQuality);
        camera.position.copy(prevPos);
        if (controls && prevTarget) {
          controls.target.copy(prevTarget);
          controls.update();
        }
        gl.render(scene, camera);
        return data;
      } catch {
        return "";
      }
    };
  }, [engine, gl, camera, scene, controls]);

  return null;
}

function RenderBridge() {
  const { engine } = useConfigurator();
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    engine.onNeedRender = () => invalidate();
  }, [engine, invalidate]);
  return null;
}

function CanvasInteraction() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const store = useConfigurator();
  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    const canvas = gl.domElement;
    const getUV = (x: number, y: number) => storeRef.current.engine.getUV(x, y, canvas, camera);

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const uv = getUV(e.clientX, e.clientY);
      if (uv) storeRef.current.onInteractDown(uv);
      else storeRef.current.onInteractDown({ x: -9999, y: -9999, part: "__none__" });
    };
    const onMove = (e: PointerEvent) => {
      if (!storeRef.current.isInteracting()) return;
      const uv = getUV(e.clientX, e.clientY);
      if (uv) storeRef.current.onInteractMove(uv);
    };
    const onUp = () => storeRef.current.onInteractUp();
    const onCtx = (e: MouseEvent) => {
      e.preventDefault();
      storeRef.current.handleContextHit(getUV(e.clientX, e.clientY), e.clientX, e.clientY);
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    canvas.addEventListener("contextmenu", onCtx);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("contextmenu", onCtx);
    };
  }, [camera, gl]);

  return null;
}

function Tent() {
  const { scene } = useGLTF(config.model.path);
  const { engine, setModelReady, partState } = useConfigurator();
  const gl = useThree((s) => s.gl);
  const [root, setRoot] = useState<THREE.Group | null>(null);
  const initialColors = useRef(partState);
  const prepared = useRef(false);

  useLayoutEffect(() => {
    if (prepared.current) return;
    prepared.current = true;
    engine.initMaterials(initialColors.current, gl.capabilities.getMaxAnisotropy());
    const clone = scene.clone(true);
    setRoot(engine.prepareModel(clone));
    setModelReady();
  }, [scene, engine, gl, setModelReady]);

  return root ? <primitive object={root} /> : null;
}

function TentAccessories() {
  const { packageType, backWall, sideWalls, partState, engine, modelReady } = useConfigurator();
  const original = partState.all?.colorName === "Original";
  const fabricColor = fabricHex(partState, config);
  const includesFrame = config.packages.find((option) => option.id === packageType)?.includesFrame !== false;

  useLayoutEffect(() => {
    if (!modelReady) return;
    const metal = config.model.metalParts ?? [];
    engine.tentMeshes.forEach((mesh) => {
      const part = mesh.userData.partName as string;
      mesh.visible = includesFrame || !metal.includes(part);
    });
  }, [engine, modelReady, packageType, includesFrame]);

  const specs = useMemo(() => {
    if (!modelReady || !engine.tentMeshes.length) return [];
    const bounds = measureWallBounds(engine.tentMeshes, config.model.metalParts ?? []);
    if (bounds.footprint.isEmpty()) return [];
    return WallBuilder.fromBounds({
      footprint: bounds.footprint,
      groundY: bounds.groundY,
      canopyY: bounds.canopyY,
      back: backWall.coverage,
      sides: sideWalls.coverage,
    });
  }, [engine, modelReady, backWall.coverage, sideWalls.coverage, packageType]);

  const wallMaterial = useMemo(() => {
    if (!modelReady) return null;
    const source =
      engine.materials["front-valance"] ?? engine.materials["front-peak"] ?? engine.materials.all;
    return makeWallMaterial(
      source,
      engine.uvBounds["front-valance"] ?? engine.uvBounds["front-peak"],
      fabricColor,
      original,
    );
  }, [engine, modelReady, fabricColor, original]);

  return (
    <>
      {wallMaterial &&
        specs.map((spec) => (
          <mesh key={spec.id} position={spec.position} rotation={spec.rotation} renderOrder={3} material={wallMaterial}>
            <planeGeometry args={[spec.width, spec.height]} />
          </mesh>
        ))}
      <ContactShadows
        key={`${modelReady}-${packageType}-${backWall.coverage}-${sideWalls.coverage}-${fabricColor}`}
        position={[0, SHADOWS.y, 0]}
        opacity={SHADOWS.opacity}
        scale={SHADOWS.scale}
        blur={SHADOWS.blur}
        far={SHADOWS.far}
        frames={1}
      />
    </>
  );
}

export const Experience = memo(function Experience() {
  const start = config.camera.views[CAM_DEFAULT_VIEW];

  return (
    <Canvas
      className="webgl"
      flat
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      frameloop="always"
      dpr={[1, 1.6]}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: true,
        toneMapping: THREE.NoToneMapping,
        toneMappingExposure: config.scene.exposure,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      camera={{
        fov: CAM_FOV,
        near: config.camera.near,
        far: config.camera.far,
        position: [start?.x ?? 0, start?.y ?? 0, start?.z ?? config.camera.defaultZ],
      }}
      onCreated={({ gl, scene }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.NoToneMapping;
        gl.setClearColor(0x000000, 0);
        scene.environmentIntensity = config.scene.environmentIntensity;
      }}
    >
      <SceneBackground />
      <ambientLight intensity={config.scene.ambientIntensity} />
      <Suspense fallback={null}>
        <EnvMap />
        <Tent />
        <TentAccessories />
        {config.graphics.postprocessing ? <ScenePost /> : null}
      </Suspense>
      {config.graphics.logCamera ? <CameraReadout /> : null}
      <CameraRig />
      <CaptureBridge />
      <RenderBridge />
      <CanvasInteraction />
      {config.graphics.showStats ? <Stats className="fps-stats" showPanel={0} /> : null}
    </Canvas>
  );
});
