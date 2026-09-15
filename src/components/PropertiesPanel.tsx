import { Fragment } from "react";
import { useConfigurator } from "../store/ConfiguratorContext";
import { formatPartLabel } from "../utils";
import type { BlendMode } from "../types";

export function PropertiesPanel() {
  const {
    activeSection,
    logos,
    selectedIndex,
    setSelectedIndex,
    updateSelectedLogo,
    toggleLayerLock,
    deleteLayer,
  } = useConfigurator();

  const isEditingTab = activeSection === "upload" || activeSection === "text";
  const isUploadTab = activeSection === "upload";
  const visibleLogos = logos
    .map((logo, i) => ({ logo, i }))
    .filter(({ logo }) => (isUploadTab ? logo.type !== "text" : logo.type === "text"));
  const hasContent = visibleLogos.length > 0;
  const selected = selectedIndex >= 0 ? logos[selectedIndex] : null;

  const groups: Record<string, number[]> = {};
  for (const { logo, i } of [...visibleLogos].reverse()) {
    if (!groups[logo.part]) groups[logo.part] = [];
    groups[logo.part].push(i);
  }

  if (!isEditingTab) {
    return <aside className="panel panel--properties" id="panelProperties" />;
  }

  return (
    <aside className="panel panel--properties is-visible" id="panelProperties">
      <header className="properties-header">
        <h3 className="panel__title" style={{ fontSize: 14, margin: 0 }}>
          Properties
        </h3>
      </header>

      <div className="properties-section" style={{ display: hasContent ? undefined : "none" }}>
        <div className="section-divider">
          <span>Attributes</span>
        </div>
        <div className="prop-grid">
          <div className="prop-group">
            <label>Width</label>
            <input
              type="number"
              id="propWidth"
              className="minimal-input"
              value={selected ? Math.round(selected.w) : ""}
              onChange={(e) => {
                if (!selected) return;
                const newW = parseFloat(e.target.value) || 30;
                const ratio = newW / selected.w;
                updateSelectedLogo({ w: newW, h: selected.h * ratio });
              }}
            />
          </div>
          <div className="prop-group">
            <label>Height</label>
            <input
              type="number"
              id="propHeight"
              className="minimal-input"
              value={selected ? Math.round(selected.h) : ""}
              onChange={(e) => {
                if (!selected) return;
                const newH = parseFloat(e.target.value) || 30;
                const ratio = newH / selected.h;
                updateSelectedLogo({ h: newH, w: selected.w * ratio });
              }}
            />
          </div>
          <div className="prop-group">
            <label>Position X</label>
            <input
              type="number"
              id="propX"
              className="minimal-input"
              value={selected ? Math.round(selected.x) : ""}
              onChange={(e) => updateSelectedLogo({ x: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="prop-group">
            <label>Position Y</label>
            <input
              type="number"
              id="propY"
              className="minimal-input"
              value={selected ? Math.round(selected.y) : ""}
              onChange={(e) => updateSelectedLogo({ y: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="prop-group">
            <label>Rotate</label>
            <input
              type="number"
              id="propRotate"
              className="minimal-input"
              value={selected ? Math.round(selected.angle * (180 / Math.PI)) : ""}
              onChange={(e) => updateSelectedLogo({ angle: (parseFloat(e.target.value) || 0) * (Math.PI / 180) })}
            />
          </div>
          <div className="prop-group">
            <label>Scale %</label>
            <input
              type="number"
              id="propScale"
              className="minimal-input"
              value={selected?.origW ? Math.round((selected.w / selected.origW) * 100) : 100}
              onChange={(e) => {
                if (!selected?.origW || !selected.origH) return;
                const scale = (parseFloat(e.target.value) || 100) / 100;
                updateSelectedLogo({ w: selected.origW * scale, h: selected.origH * scale });
              }}
            />
          </div>
        </div>
      </div>

      <div
        className="properties-section"
        id="logoControls"
        style={{ display: hasContent && selectedIndex >= 0 ? "block" : "none", paddingTop: 0 }}
      >
        <div className="section-divider">
          <span>Layer Settings</span>
        </div>
        <div className="control-row">
          <label className="control-label">Opacity</label>
          <div className="slider-wrap">
            <input
              type="range"
              className="slider"
              id="logoOpacity"
              min={10}
              max={100}
              value={selected?.opacity ?? 100}
              onChange={(e) => updateSelectedLogo({ opacity: Number(e.target.value) })}
            />
            <span className="slider-val" id="logoOpacityVal">
              {selected?.opacity ?? 100}%
            </span>
          </div>
        </div>
        <div className="control-row">
          <label className="control-label">Blend</label>
          <select
            id="logoBlend"
            className="select"
            value={selected?.blend ?? "source-over"}
            onChange={(e) => updateSelectedLogo({ blend: e.target.value as BlendMode })}
          >
            <option value="source-over">Normal</option>
            <option value="multiply">Multiply</option>
            <option value="screen">Screen</option>
          </select>
        </div>
      </div>

      <div id="propertiesEmptyState" className={`properties-empty-state${hasContent ? "" : " visible"}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
        <p>{isUploadTab ? "Upload an image first" : "Add a text first"}</p>
      </div>

      <div className="properties-section" style={{ flex: 1, overflowY: "auto", paddingTop: 0, display: hasContent ? undefined : "none" }}>
        <div className="section-divider">
          <span>Layers</span>
        </div>
        <ul className="layers-list" id="layersList">
          {Object.entries(groups).map(([part, indices]) => (
            <Fragment key={part}>
              <li className="layer-group-header">{formatPartLabel(part)}</li>
              {indices.map((i) => {
                const logo = logos[i];
                const isText = logo.type === "text";
                const rawName = isText
                  ? `${(logo.text ?? "").substring(0, 10)}${(logo.text ?? "").length > 10 ? "…" : ""}`
                  : `Image Layer ${i + 1}`;
                return (
                  <li
                    key={i}
                    className={`layer-item${i === selectedIndex ? " active" : ""}`}
                    onClick={() => setSelectedIndex(i)}
                  >
                    <span className="layer-item-left">
                      {isText ? (
                        <span className="layer-type-icon layer-type-icon--text">T</span>
                      ) : (
                        <span className="layer-type-icon layer-type-icon--image">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="11" height="11">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                          </svg>
                        </span>
                      )}
                      <span className="layer-item-name">{rawName}</span>
                    </span>
                    <div className="layer-actions">
                      <span
                        className="layer-action-btn"
                        title="Lock/Unlock"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLayerLock(i);
                        }}
                      >
                        {logo.pinned ? "🔒" : "🔓"}
                      </span>
                      <span
                        className="layer-action-btn"
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLayer(i);
                        }}
                      >
                        🗑️
                      </span>
                    </div>
                  </li>
                );
              })}
            </Fragment>
          ))}
        </ul>
      </div>

      <div className="properties-section" style={{ paddingTop: 0, borderTop: "1px solid var(--border)", background: "var(--surface2)" }}>
        <div className="section-divider" style={{ marginTop: 16 }}>
          <span>How to use</span>
        </div>
        <ul className="tips-list">
          <li>
            <span className="tip-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                <path d="M13 13l6 6" />
              </svg>
            </span>
            Select a tent part above
          </li>
          <li>
            <span className="tip-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </span>
            Upload or drop your artwork
          </li>
          <li>
            <span className="tip-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </span>
            Drag corners to resize
          </li>
          <li>
            <span className="tip-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </span>
            Top-right handle rotates
          </li>
          <li>
            <span className="tip-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="3" width="12" height="18" rx="6" />
                <path d="M12 3v7" />
                <path d="M12 10h6" />
              </svg>
            </span>
            Right-click for layer & lock options
          </li>
          <li>
            <span className="tip-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </span>
            Delete key removes selected
          </li>
        </ul>
      </div>
    </aside>
  );
}
