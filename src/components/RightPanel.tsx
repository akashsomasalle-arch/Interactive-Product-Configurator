import { ColorSection } from "./ColorSection";
import { UploadSection } from "./UploadSection";
import { TextSection } from "./TextSection";
import { SavedSection } from "./SavedSection";
import { SetupSection } from "./SetupSection";
import { QuoteSection } from "./QuoteSection";
import { useConfigurator } from "../store/ConfiguratorContext";

export function RightPanel() {
  const { activeSection, rightCollapsed, toggleRightPanel } = useConfigurator();

  return (
    <aside className={`panel panel--right${rightCollapsed ? " collapsed" : ""}`} id="panelRight">
      <div className="panel__toggle panel__toggle--right" id="toggleRight" title="Toggle panel" onClick={toggleRightPanel}>
        <span className="toggle-icon">‹</span>
      </div>
      <div className="panel__inner">
        <SetupSection hidden={activeSection !== "setup"} />
        <ColorSection hidden={activeSection !== "color"} />
        <UploadSection hidden={activeSection !== "upload"} />
        <TextSection hidden={activeSection !== "text"} />
        <QuoteSection hidden={activeSection !== "quote"} />
        <SavedSection hidden={activeSection !== "saved"} />
      </div>
    </aside>
  );
}
