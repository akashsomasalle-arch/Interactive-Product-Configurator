import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { LandingPage } from "./components/landing/LandingPage";
import { parseSkuFromPath } from "./lib/appLocation";
import "./index.css";

const ConfiguratorTree = lazy(() => import("./components/ConfiguratorTree"));

function Root() {
  const skuId = parseSkuFromPath();

  if (!skuId) return <LandingPage />;

  return (
    <Suspense
      fallback={
        <div className="viewer-boot">
          <p>Loading viewer…</p>
        </div>
      }
    >
      <ConfiguratorTree />
    </Suspense>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
