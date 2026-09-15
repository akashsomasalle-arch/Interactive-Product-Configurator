import rawConfig from "./config.json";
import type { AppConfig, PartColorState } from "./types";

const PART_LABELS = (rawConfig as AppConfig).model.partLabels ?? {};

export function formatPartLabel(part: string): string {
  return PART_LABELS[part] ?? part.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function fabricHex(partState: Record<string, PartColorState>, config: AppConfig) {
  const fallback = config.model.defaultColors.fabric ?? config.ui.colorPalette[0]?.hex;
  if (partState.all?.colorName === "Original") return fallback;
  return partState.all?.color ?? partState["front-peak"]?.color ?? fallback;
}

export function originalSwatchHex(config: AppConfig) {
  return config.model.defaultColors.all ?? config.model.defaultColors.fabric;
}

export function viewLabel(id: string) {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export function createPartState(config: AppConfig): Record<string, PartColorState> {
  const partState: Record<string, PartColorState> = {};
  const metalParts = config.model.metalParts ?? [];
  config.model.parts.forEach((p) => {
    const savedHex = config.userConfiguration?.partColors?.[p]?.color;
    const savedName = config.userConfiguration?.partColors?.[p]?.colorName;
    const isMetal = metalParts.includes(p);
    const defaultHex = isMetal
      ? config.model.defaultColors[p] || config.model.defaultColors.metal
      : originalSwatchHex(config);
    const hex = savedHex || defaultHex;
    const paletteName = config.ui.colorPalette.find((swatch) => swatch.hex.toUpperCase() === hex.toUpperCase())?.name;
    partState[p] = {
      color: hex,
      colorName: savedName || (savedHex ? paletteName || "Custom Color" : isMetal ? paletteName || "Default" : "Original"),
    };
  });
  return partState;
}

export function escapeHtml(value: string): string {
  return value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const EXPAND_SVG = `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`;
export const COLLAPSE_SVG = `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6M20 10h-6V4M10 14l-7 7M14 10l7-7"/></svg>`;
export const MINIMIZE_SVG = `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M19 9l-7 7-7-7"/></svg>`;
export const RESTORE_SVG = `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M19 15l-7-7-7 7"/></svg>`;
