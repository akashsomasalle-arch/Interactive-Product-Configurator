import { useState } from "react";
import { config, useConfigurator } from "../store/ConfiguratorContext";
import { PartDropdown, SectionShell } from "./PartDropdown";

export function TextSection({ hidden }: { hidden: boolean }) {
  const { addText, logos, selectedIndex, updateSelectedLogo } = useConfigurator();
  const [text, setText] = useState("");
  const selected = selectedIndex >= 0 ? logos[selectedIndex] : null;
  const showTypeControls = selected?.type === "text";

  return (
    <SectionShell eyebrow="04 — Typography" title="Add Text" sub="Type and position custom text on your tent." hidden={hidden}>
      <PartDropdown id="textPartSelector" />
      <div className="control-group">
        <textarea
          id="textInput"
          className="minimal-textarea"
          placeholder="Type your text here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          className="btn btn--light"
          id="addTextBtn"
          onClick={() => {
            addText(text);
            setText("");
          }}
        >
          Add to Garment
        </button>
      </div>
      <div id="textOnlyControls" style={{ display: showTypeControls ? "block" : "none", marginTop: 24 }}>
        <div className="section-divider">
          <span>Selected Typography</span>
        </div>
        <div className="control-row">
          <label className="control-label">Font</label>
          <select
            id="textFont"
            className="select"
            value={selected?.font ?? config.graphics.textDefaultFont}
            onChange={(e) => updateSelectedLogo({ font: e.target.value })}
          >
            {config.graphics.textFonts.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </div>
        <div className="control-row">
          <label className="control-label">Color</label>
          <input
            type="color"
            id="textColorPicker"
            value={selected?.color ?? config.graphics.textDefaultColor}
            className="native-color-picker"
            onChange={(e) => updateSelectedLogo({ color: e.target.value })}
          />
        </div>
      </div>
    </SectionShell>
  );
}
