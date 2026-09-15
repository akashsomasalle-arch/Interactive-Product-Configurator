import { useRef } from "react";
import { useConfigurator } from "../store/ConfiguratorContext";
import { PartDropdown, SectionShell } from "./PartDropdown";

export function UploadSection({ hidden }: { hidden: boolean }) {
  const { savedAssets, assetLimit, processNewUpload, deleteAsset, loadLogoFromUrl, activePart, setAssetModalOpen } =
    useConfigurator();
  const inputRef = useRef<HTMLInputElement>(null);

  const items = [...savedAssets].reverse();

  return (
    <SectionShell eyebrow="03 — Upload images on mesh" title="Artwork" sub="Place & transform logos on your tent." hidden={hidden}>
      <div className="flex-header" style={{ marginBottom: 8 }}>
        <span className="flex-header-title">Target Placement</span>
      </div>
      <PartDropdown id="uploadPartSelector" />
      <input
        ref={inputRef}
        type="file"
        id="image-upload"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processNewUpload(file);
          e.target.value = "";
        }}
      />
      <button className="primary-upload-btn" id="primaryUploadBtn" onClick={() => inputRef.current?.click()}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Upload
      </button>
      <div className="flex-header" style={{ marginTop: 24 }}>
        <span className="flex-header-title">
          All images
          <span id="assetCountLabel" className="flex-header-count">
            ({savedAssets.length}/{assetLimit})
          </span>
        </span>
        <span className="flex-header-link" id="viewAllAssetsBtn" onClick={() => setAssetModalOpen(true)}>
          View All
        </span>
      </div>
      <div className="asset-grid" id="assetGrid">
        {items.map((asset, reverseIdx) => {
          const actualIdx = savedAssets.length - 1 - reverseIdx;
          return (
            <div className="asset-item" key={actualIdx + asset.url.slice(0, 24)}>
              <img src={asset.url} alt="Asset" onClick={() => loadLogoFromUrl(asset.url, activePart)} />
              <div className="asset-delete-btn" title="Delete permanently" onClick={() => deleteAsset(actualIdx)}>
                ✕
              </div>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}
