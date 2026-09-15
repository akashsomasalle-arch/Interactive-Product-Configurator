import { useState } from "react";
import { useConfigurator } from "../store/ConfiguratorContext";
import type { SavedDesign } from "../types";
import { SectionShell } from "./PartDropdown";

export function SavedSection({ hidden }: { hidden: boolean }) {
  const { savedConfigs, loadDesign, deleteDesign, renameDesign, resetToDefaultDesign, showConfirm } = useConfigurator();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const commitRename = (item: SavedDesign) => {
    const newName = draft.trim() || item.name;
    renameDesign(item, newName);
    setEditingId(null);
  };

  return (
    <SectionShell eyebrow="06 — Library" title="Saved Designs" sub="Access your saved configurations and templates." hidden={hidden}>
      <div className="flex-header">
        <span className="flex-header-title" id="savedDesignsLabel">
          All designs
        </span>
      </div>
      <div className="saved-grid" id="savedDesignsGrid">
        <div
          className="saved-card saved-card--new"
          onClick={() => showConfirm("Start a new design? Unsaved changes will be lost.", resetToDefaultDesign)}
        >
          <div className="saved-card-img-wrap">
            <span className="new-design-icon">+</span>
            <span className="saved-card-new-label">New Design</span>
          </div>
          <div className="saved-card-info">
            <span className="saved-card-title">Start from scratch</span>
            <span className="saved-card-meta">Blank Template</span>
          </div>
        </div>
        {[...savedConfigs].reverse().map((item) => {
          const dateStr = new Date(item.id).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
          const actualIdx = savedConfigs.indexOf(item);
          return (
            <div className="saved-card" key={item.id}>
              <div className="saved-card-img-wrap" onClick={() => loadDesign(item)}>
                <img src={item.thumbnail} className="saved-card-img" alt="" />
                <div
                  className="asset-delete-btn"
                  title="Delete design"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDesign(actualIdx);
                  }}
                >
                  ✕
                </div>
              </div>
              <div className="saved-card-info">
                <div className="saved-card-title-row">
                  {editingId === item.id ? (
                    <input
                      type="text"
                      className="minimal-input"
                      value={draft}
                      style={{ padding: "2px 4px", fontSize: 11, height: 20, marginBottom: 0 }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => commitRename(item)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          (e.target as HTMLInputElement).blur();
                        }
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                  ) : (
                    <span className="saved-card-title" onDoubleClick={() => { setEditingId(item.id); setDraft(item.name); }}>
                      {item.name}
                    </span>
                  )}
                  <button
                    className="asset-edit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(item.id);
                      setDraft(item.name);
                    }}
                  >
                    ✎
                  </button>
                </div>
                <span className="saved-card-meta">{dateStr}</span>
              </div>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}
