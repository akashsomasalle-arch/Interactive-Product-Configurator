import { useLayoutEffect, useRef, type MouseEvent } from "react";
import { useConfigurator } from "../store/ConfiguratorContext";

export function ContextMenu() {
  const {
    contextMenu,
    bringFront,
    bringForward,
    sendBackward,
    sendBack,
    toggleLayerLock,
    cloneSelected,
    deleteSelected,
    selectedIndex,
    hideContextMenu,
  } = useConfigurator();
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!contextMenu.visible || !ref.current) return;
    const el = ref.current;
    el.style.left = `${Math.min(contextMenu.x, window.innerWidth - el.offsetWidth - 10)}px`;
    el.style.top = `${Math.min(contextMenu.y, window.innerHeight - el.offsetHeight - 10)}px`;
  }, [contextMenu]);

  if (!contextMenu.visible) return null;

  const run = (fn: () => void) => (e: MouseEvent) => {
    e.stopPropagation();
    fn();
    hideContextMenu();
  };

  return (
    <div ref={ref} id="contextMenu" className="context-menu" style={{ display: "flex", left: contextMenu.x, top: contextMenu.y }} onClick={(e) => e.stopPropagation()}>
      <button className="context-menu-item" id="ctxBringFront" onClick={run(bringFront)}>
        <span>Bring to Front</span>
        <span className="ctx-shortcut">⇧⌘]</span>
      </button>
      <button className="context-menu-item" id="ctxBringForward" onClick={run(bringForward)}>
        <span>Bring Forward</span>
        <span className="ctx-shortcut">⌘]</span>
      </button>
      <button className="context-menu-item" id="ctxSendBackward" onClick={run(sendBackward)}>
        <span>Send Backward</span>
        <span className="ctx-shortcut">⌘[</span>
      </button>
      <button className="context-menu-item" id="ctxSendBack" onClick={run(sendBack)}>
        <span>Send to Back</span>
        <span className="ctx-shortcut">⇧⌘[</span>
      </button>
      <div className="context-menu-divider" />
      <button className="context-menu-item" id="ctxLock" onClick={run(() => selectedIndex >= 0 && toggleLayerLock(selectedIndex))}>
        <span>Lock / Unlock</span>
        <span className="ctx-shortcut">L</span>
      </button>
      <button className="context-menu-item" id="ctxClone" onClick={run(cloneSelected)}>
        <span>Duplicate</span>
        <span className="ctx-shortcut">⌘D</span>
      </button>
      <div className="context-menu-divider" />
      <button className="context-menu-item danger" id="ctxDelete" onClick={run(deleteSelected)}>
        <span>Delete</span>
        <span className="ctx-shortcut">⌫</span>
      </button>
    </div>
  );
}
