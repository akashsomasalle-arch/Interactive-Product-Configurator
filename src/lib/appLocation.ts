import rawConfig from "../config.json";
import type { AppConfig, CatalogSku } from "../types";

export const appConfig = rawConfig as AppConfig;

export function skuById(id: string): CatalogSku | undefined {
  return appConfig.catalog.skus.find((sku) => sku.id === id);
}

export function landingPath() {
  return `/${window.location.search}`;
}

export function viewerPath(skuId: string) {
  return `/configure/${encodeURIComponent(skuId)}${window.location.search}`;
}

export function parseSkuFromPath(pathname = window.location.pathname): string | null {
  const match = pathname.match(/^\/configure\/([^/]+)\/?$/);
  if (!match) return null;
  const id = decodeURIComponent(match[1]);
  return skuById(id)?.id ?? null;
}

export function isEmbedMode() {
  return new URLSearchParams(window.location.search).get("embed") === "1";
}

export function currentPath() {
  return `${window.location.pathname}${window.location.search}`;
}

export function pushAppPath(path: string) {
  if (currentPath() === path) return;
  window.history.pushState(null, "", path);
}
