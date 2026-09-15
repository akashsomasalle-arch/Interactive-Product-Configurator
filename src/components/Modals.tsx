import { useState } from "react";
import { useConfigurator } from "../store/ConfiguratorContext";

export function Modals() {
  const {
    assetModalOpen,
    setAssetModalOpen,
    savedAssets,
    deleteAsset,
    loadLogoFromUrl,
    activePart,
    showConfirm,
    clearAllAssets,
    confirm,
    hideConfirm,
    savePromptOpen,
    closeSavePrompt,
    saveDesign,
    getDefaultDesignName,
  } = useConfigurator();
  const [saveName, setSaveName] = useState("");

  const items = [...savedAssets].reverse();

  return (
    <>
      <div
        className={`asset-modal-overlay${assetModalOpen ? "" : " hidden"}`}
        id="assetModalOverlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) setAssetModalOpen(false);
        }}
      >
        <div className="asset-modal">
          <div className="asset-modal-header">
            <h3 className="asset-modal-title">Asset Library</h3>
            <div className="asset-modal-actions">
              <button
                className="btn btn--danger btn--sm"
                id="clearAllAssetsBtn"
                onClick={() =>
                  showConfirm("Are you sure you want to delete all saved images? This cannot be undone.", clearAllAssets)
                }
              >
                Clear All
              </button>
              <button className="btn-text" id="closeAssetModalBtn" onClick={() => setAssetModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
          <div className="asset-modal-grid" id="modalAssetGrid">
            {items.map((asset, reverseIdx) => {
              const actualIdx = savedAssets.length - 1 - reverseIdx;
              return (
                <div className="asset-item" key={"modal-" + actualIdx}>
                  <img
                    src={asset.url}
                    alt="Asset"
                    onClick={() => {
                      loadLogoFromUrl(asset.url, activePart);
                      setAssetModalOpen(false);
                    }}
                  />
                  <div className="asset-delete-btn" title="Delete permanently" onClick={() => deleteAsset(actualIdx)}>
                    ✕
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`asset-modal-overlay${savePromptOpen ? "" : " hidden"}`} id="savePromptOverlay" style={{ zIndex: 10000 }}>
        <div className="alert-modal" style={{ maxWidth: 360, textAlign: "left", padding: 24 }}>
          <h3 className="asset-modal-title" style={{ fontSize: 16, marginBottom: 8 }}>
            Name your design
          </h3>
          <p className="alert-message" style={{ marginBottom: 16, textAlign: "left" }}>
            Enter a name for this template so you can find it easily in your library.
          </p>
          <input
            type="text"
            id="saveDesignNameInput"
            className="minimal-input"
            placeholder={getDefaultDesignName()}
            value={saveName}
            style={{ marginBottom: 24, width: "100%", borderColor: "var(--border-hi)" }}
            autoFocus={savePromptOpen}
            onChange={(e) => setSaveName(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn--ghost" id="cancelSaveBtn" style={{ flex: 1 }} onClick={() => { closeSavePrompt(); setSaveName(""); }}>
              Cancel
            </button>
            <button
              className="btn btn--light"
              id="confirmSaveBtn"
              style={{ flex: 1 }}
              onClick={() => {
                saveDesign(saveName.trim() || getDefaultDesignName());
                closeSavePrompt();
                setSaveName("");
              }}
            >
              Save Design
            </button>
          </div>
        </div>
      </div>

      <div className={`asset-modal-overlay${confirm ? "" : " hidden"}`} id="customConfirmOverlay" style={{ zIndex: 10000 }}>
        <div className="alert-modal">
          <div className="alert-icon" style={{ color: "var(--danger)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h3 className="asset-modal-title" style={{ fontSize: 16, marginBottom: 4 }}>
            Confirm Action
          </h3>
          <p className="alert-message" id="customConfirmMessage">
            {confirm?.message ?? "Are you sure?"}
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn btn--ghost" id="customConfirmCancelBtn" style={{ flex: 1 }} onClick={hideConfirm}>
              Cancel
            </button>
            <button
              className="btn btn--danger"
              id="customConfirmActionBtn"
              style={{ flex: 1 }}
              onClick={() => {
                confirm?.onConfirm();
                hideConfirm();
              }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
