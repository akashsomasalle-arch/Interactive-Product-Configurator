import { Experience } from "./Experience";
import { UVMinimap } from "./UVMinimap";
import { SiteHeader } from "./layout/SiteHeader";
import { activeSku, config, useConfigurator } from "../store/ConfiguratorContext";
import { viewLabel } from "../utils";

export function Viewport() {
  const { activeDesignId, openSavePrompt, saveCurrent, cameraView, setCameraView } = useConfigurator();

  return (
    <main className="viewport">
      <div className="viewport-topbar">
        <SiteHeader title={activeSku?.displayName} />
      </div>

      <div className="top-right-actions">
        <button
          className="btn btn--light btn--sm"
          id="btnSaveAsDefault"
          style={{ height: 32, padding: "0 16px", display: activeDesignId ? "none" : "inline-flex" }}
          onClick={openSavePrompt}
        >
          Save Design As
        </button>
        <button
          className="btn btn--ghost btn--sm"
          id="btnSaveCurrent"
          style={{ display: activeDesignId ? "inline-flex" : "none", height: 32, padding: "0 16px" }}
          onClick={saveCurrent}
        >
          Save Current
        </button>
        <button
          className="btn btn--light btn--sm"
          id="btnSaveNew"
          style={{ display: activeDesignId ? "inline-flex" : "none", height: 32, padding: "0 16px" }}
          onClick={openSavePrompt}
        >
          Save New
        </button>
      </div>

      <div className="view-toggle">
        {Object.keys(config.camera.views).map((id) => (
          <button
            key={id}
            className={`view-btn${cameraView === id ? " view-btn--active" : ""}`}
            type="button"
            onClick={() => setCameraView(id)}
          >
            {viewLabel(id)}
          </button>
        ))}
      </div>

      <UVMinimap />
      <Experience />
    </main>
  );
}
