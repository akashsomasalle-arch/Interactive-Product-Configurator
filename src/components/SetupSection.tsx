import { useState } from "react";
import { appConfig, viewerPath } from "../lib/appLocation";
import { useConfigurator } from "../store/ConfiguratorContext";
import type { PackageType, WallCoverage } from "../types";
import { SectionShell } from "./PartDropdown";

type SetupPane = "product" | "walls";

export function SetupSection({ hidden }: { hidden: boolean }) {
  const { packageType, backWall, sideWalls, quantity, setPackageType, setBackWall, setSideWalls, setQuantity, skuId } =
    useConfigurator();
  const [pane, setPane] = useState<SetupPane>("product");

  return (
    <SectionShell eyebrow="01 — Product setup" title="Setup" sub="Choose size, package, walls and quantity." hidden={hidden}>
      <div className="panel-tabs setup-tabs">
        <button type="button" className={`panel-tab${pane === "product" ? " active" : ""}`} onClick={() => setPane("product")}>
          Product
        </button>
        <button type="button" className={`panel-tab${pane === "walls" ? " active" : ""}`} onClick={() => setPane("walls")}>
          Walls
        </button>
      </div>

      {pane === "product" ? (
        <>
          <div className="section-divider">
            <span>Size</span>
          </div>
          <div className="choice-grid sizes">
            {appConfig.catalog.skus.map((sku) => (
              <a key={sku.id} href={viewerPath(sku.id)} className={`choice${sku.id === skuId ? " is-active" : ""}`}>
                <strong>{sku.label}</strong>
              </a>
            ))}
          </div>

          <div className="section-divider">
            <span>Package</span>
          </div>
          <div className="choice-grid">
            {appConfig.packages.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`choice${packageType === option.id ? " is-active" : ""}`}
                onClick={() => setPackageType(option.id as PackageType)}
              >
                <strong>{option.title}</strong>
                {option.description ? <em>{option.description}</em> : null}
              </button>
            ))}
          </div>

          <div className="section-divider">
            <span>Quantity</span>
          </div>
          <div className="control-row">
            <label className="control-label">Qty</label>
            <div className="quantity">
              <button type="button" onClick={() => setQuantity(quantity - 1)}>
                −
              </button>
              <input
                type="number"
                min={1}
                max={appConfig.defaults.quantityMax}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || 1)}
              />
              <button type="button" onClick={() => setQuantity(quantity + 1)}>
                +
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="section-divider">
            <span>Back wall</span>
          </div>
          <div className="choice-grid">
            {appConfig.walls.back.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`choice${backWall.coverage === option.id ? " is-active" : ""}`}
                onClick={() => setBackWall({ coverage: option.id as WallCoverage, printMode: appConfig.defaults.backWall.printMode })}
              >
                <strong>{option.title}</strong>
              </button>
            ))}
          </div>

          <div className="section-divider">
            <span>Side walls</span>
          </div>
          <div className="choice-grid">
            {appConfig.walls.sides.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`choice${sideWalls.coverage === option.id ? " is-active" : ""}`}
                onClick={() => setSideWalls({ coverage: option.id as WallCoverage, printMode: appConfig.defaults.sideWalls.printMode })}
              >
                <strong>{option.title}</strong>
              </button>
            ))}
          </div>
        </>
      )}
    </SectionShell>
  );
}
