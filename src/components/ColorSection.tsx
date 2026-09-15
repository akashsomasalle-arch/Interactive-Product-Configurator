import { useEffect, useState } from "react";
import { colorNameFor, config, useConfigurator } from "../store/ConfiguratorContext";
import { formatPartLabel, originalSwatchHex } from "../utils";
import { PartDropdown, SectionShell } from "./PartDropdown";

export function ColorSection({ hidden }: { hidden: boolean }) {
  const { palette, partState, activePart, applyColor, applySceneColor, sceneBg } = useConfigurator();
  const current = partState[activePart];
  const hex = current?.colorName === "Original" ? originalSwatchHex(config) : (current?.color ?? originalSwatchHex(config));
  const name =
    current?.colorName === "Original"
      ? "Original"
      : current?.colorName === "Default"
        ? colorNameFor(hex, "Default")
        : current?.colorName ?? "Original";
  const activeSwatch =
    current?.colorName === "Original" ? -1 : palette.findIndex((p) => p.hex.toUpperCase() === hex.toUpperCase());
  const [hexDraft, setHexDraft] = useState(hex.toUpperCase());
  const [bgDraft, setBgDraft] = useState(sceneBg.toUpperCase());

  useEffect(() => setHexDraft(hex.toUpperCase()), [hex]);
  useEffect(() => setBgDraft(sceneBg.toUpperCase()), [sceneBg]);

  return (
    <SectionShell eyebrow="02 — Edit Color in scene" title="Color" hidden={hidden}>
      <PartDropdown id="colorPartSelector" />
      <div className="section-divider">
        <span>Color</span>
      </div>
      <div className="swatch-grid" id="swatchGrid">
        {palette.map((p, i) => (
          <div
            key={p.hex + p.name}
            className={`swatch${i === activeSwatch ? " active" : ""}`}
            style={{ background: p.hex }}
            title={p.name}
            onClick={() => {
              applyColor(p.hex);
            }}
          />
        ))}
      </div>
      <div className="control-row" style={{ marginTop: 12 }}>
          <label className="control-label">Tent</label>
        <div className="color-input-wrap">
          <input
            type="color"
            id="base-color-picker"
            value={hex}
            className="native-color-picker"
            title="Pick a tent color"
            onChange={(e) => {
              applyColor(e.target.value);
            }}
          />
          <input
            type="text"
            className="color-hex-input"
            id="colorHex"
            value={hexDraft}
            maxLength={7}
            onChange={(e) => {
              setHexDraft(e.target.value);
              if (/^#[0-9A-F]{6}$/i.test(e.target.value)) applyColor(e.target.value);
            }}
          />
        </div>
      </div>
      <div className="control-row" style={{ marginTop: 8 }}>
        <label className="control-label">Background</label>
        <div className="color-input-wrap">
          <input
            type="color"
            id="scene-color-picker"
            value={sceneBg}
            className="native-color-picker"
            title="Pick a background color"
            onChange={(e) => applySceneColor(e.target.value)}
          />
          <input
            type="text"
            className="color-hex-input"
            id="sceneColorHex"
            value={bgDraft}
            maxLength={7}
            onChange={(e) => {
              setBgDraft(e.target.value);
              if (/^#[0-9A-F]{6}$/i.test(e.target.value)) applySceneColor(e.target.value);
            }}
          />
        </div>
      </div>
      <div className="summary-card" id="summaryCard">
        <div className="summary-row">
          <span className="summary-key">Part</span>
          <span className="summary-val" id="summaryPart">
            {formatPartLabel(activePart)}
          </span>
        </div>
        <div className="summary-row">
          <span className="summary-key">Color</span>
          <span className="summary-val" id="summaryColor">
            {name}
          </span>
        </div>
      </div>
    </SectionShell>
  );
}
