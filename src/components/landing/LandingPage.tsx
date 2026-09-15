import { appConfig, viewerPath } from "../../lib/appLocation";
import { SiteHeader } from "../layout/SiteHeader";
import { useEffect } from "react";

export function LandingPage() {
  useEffect(() => {
    document.documentElement.classList.add("landing-active");
    document.title = appConfig.catalog.name;
    return () => {
      document.documentElement.classList.remove("landing-active");
    };
  }, []);

  return (
    <div className="landing">
      <SiteHeader home />
      <main className="landing-main">
        <h1 className="landing-title">{appConfig.landing.title}</h1>
        <ul className="landing-grid">
          {appConfig.catalog.skus.map((sku) => (
            <li key={sku.id}>
              <a href={viewerPath(sku.id)} className="product-card">
                <span className="product-card-image">
                  <img src={sku.imageUrl} alt="" />
                </span>
                <span className="product-card-title">{sku.displayName}</span>
              </a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
