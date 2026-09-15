import { useEffect, useRef } from "react";
import { COLLAPSE_SVG, EXPAND_SVG, MINIMIZE_SVG, RESTORE_SVG } from "../utils";
import { useConfigurator } from "../store/ConfiguratorContext";

export function UVMinimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    engine,
    activePart,
    partState,
    uvMinimized,
    uvExpanded,
    activeSection,
    revision,
    sceneBg,
    toggleUvExpand,
    toggleUvMinimize,
    onInteractDown,
    onInteractMove,
    onInteractUp,
    handleContextHit,
    isInteracting,
  } = useConfigurator();

  const editing = activeSection === "upload" || activeSection === "text";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = uvExpanded ? 1024 : 512;
    if (canvas.width !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    canvas.style.backgroundColor = sceneBg;
    engine.updateUVMinimap(canvas, activePart, partState, uvMinimized);
  }, [engine, activePart, partState, uvMinimized, uvExpanded, revision, sceneBg]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const down = (e: MouseEvent) => onInteractDown(engine.getMinimapUV(e.clientX, e.clientY, canvas, activePart));
    const move = (e: MouseEvent) => {
      if (!isInteracting()) return;
      onInteractMove(engine.getMinimapUV(e.clientX, e.clientY, canvas, activePart));
    };
    const ctx = (e: MouseEvent) => {
      e.preventDefault();
      handleContextHit(engine.getMinimapUV(e.clientX, e.clientY, canvas, activePart), e.clientX, e.clientY);
    };
    canvas.addEventListener("mousedown", down);
    canvas.addEventListener("mousemove", move);
    canvas.addEventListener("mouseup", onInteractUp);
    canvas.addEventListener("mouseleave", onInteractUp);
    canvas.addEventListener("contextmenu", ctx);
    return () => {
      canvas.removeEventListener("mousedown", down);
      canvas.removeEventListener("mousemove", move);
      canvas.removeEventListener("mouseup", onInteractUp);
      canvas.removeEventListener("mouseleave", onInteractUp);
      canvas.removeEventListener("contextmenu", ctx);
    };
  }, [engine, activePart, onInteractDown, onInteractMove, onInteractUp, handleContextHit, isInteracting]);

  const classes = [
    "uv-minimap-container",
    uvMinimized ? "minimized" : "",
    uvExpanded ? "expanded" : "",
    editing ? "shift-left" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} id="uvMinimapContainer">
      <div className="uv-minimap-header">
        <span>2D UV Map</span>
        <div className="uv-minimap-actions">
          <button id="uvMinimizeBtn" className="uv-action-btn" title="Minimize" onClick={toggleUvMinimize} dangerouslySetInnerHTML={{ __html: uvMinimized ? RESTORE_SVG : MINIMIZE_SVG }} />
          <button id="uvExpandBtn" className="uv-action-btn" title="Toggle Fullscreen" onClick={toggleUvExpand} dangerouslySetInnerHTML={{ __html: uvExpanded ? COLLAPSE_SVG : EXPAND_SVG }} />
        </div>
      </div>
      <canvas id="uvCanvas" ref={canvasRef} width={512} height={512} />
    </div>
  );
}
