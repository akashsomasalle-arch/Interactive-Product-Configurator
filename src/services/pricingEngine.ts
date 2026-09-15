import { appConfig, skuById } from "../lib/appLocation";
import type { PackageType, ProductSetup, QuoteResult, WallSelection } from "../types";

export interface QuoteInput extends ProductSetup {
  displayName: string;
  primaryColor: string;
  artworkCount: number;
  textCount: number;
}

function quantityDiscountRate(quantity: number) {
  const rows = [...appConfig.pricing.quantityDiscounts].sort((a, b) => b.min - a.min);
  return rows.find((row) => quantity >= row.min)?.rate ?? 0;
}

function wallLabel(kind: "Back" | "Side", wall: WallSelection) {
  if (wall.coverage === "none") return `No ${kind.toLowerCase()} wall`;
  const height = wall.coverage === "half" ? "half" : "full";
  return `${kind} ${height} wall`;
}

export function summarizeWalls(backWall: WallSelection, sideWalls: WallSelection) {
  if (backWall.coverage === "none" && sideWalls.coverage === "none") return "No walls";
  return [wallLabel("Back", backWall), wallLabel("Side", sideWalls)].join(" · ");
}

export function packageLabel(packageType: PackageType) {
  return appConfig.packages.find((item) => item.id === packageType)?.title ?? packageType;
}

export function quoteConfiguration(input: QuoteInput): QuoteResult {
  const table = appConfig.pricing;
  const quantity = Math.min(appConfig.defaults.quantityMax, Math.max(1, input.quantity));
  const sizePrice = table.sizes[input.skuId] ?? 0;
  const packageAdj = table.packages[input.packageType] ?? 0;
  const backPrice = table.backWalls[input.backWall.coverage] ?? 0;
  const sidePrice = table.sideWalls[input.sideWalls.coverage] ?? 0;
  const backPrint =
    input.backWall.coverage === "none" ? 0 : (table.printSurcharge[input.backWall.printMode] ?? 0);
  const sidePrint =
    input.sideWalls.coverage === "none" ? 0 : (table.printSurcharge[input.sideWalls.printMode] ?? 0);
  const artwork = input.artworkCount * table.artwork;
  const text = input.textCount * table.text;
  const unitPrice = sizePrice + packageAdj + backPrice + sidePrice + backPrint + sidePrint + artwork + text;
  const discountRate = quantityDiscountRate(quantity);
  const discountAmount = Math.round(unitPrice * quantity * discountRate);
  const subtotal = unitPrice * quantity - discountAmount;
  const sku = skuById(input.skuId);
  const lines = [
    { code: "base", label: `${input.displayName} · ${packageLabel(input.packageType)}`, amount: (sizePrice + packageAdj) * quantity },
    ...(backPrice ? [{ code: "back-wall", label: wallLabel("Back", input.backWall), amount: (backPrice + backPrint) * quantity }] : []),
    ...(sidePrice ? [{ code: "side-walls", label: wallLabel("Side", input.sideWalls), amount: (sidePrice + sidePrint) * quantity }] : []),
    ...(artwork ? [{ code: "artwork", label: `Artwork × ${input.artworkCount}`, amount: artwork * quantity }] : []),
    ...(text ? [{ code: "text", label: `Custom text × ${input.textCount}`, amount: text * quantity }] : []),
    ...(discountAmount ? [{ code: "qty-discount", label: `Quantity discount (${Math.round(discountRate * 100)}%)`, amount: -discountAmount }] : []),
  ];

  return {
    currency: table.currency,
    sku: `${appConfig.catalog.id}-${input.skuId}-${input.packageType}`,
    unitPrice,
    quantity,
    discountRate,
    discountAmount,
    subtotal,
    lines,
    shopifyProperties: {
      Size: sku?.label ?? input.skuId,
      Setup: packageLabel(input.packageType),
      Walls: summarizeWalls(input.backWall, input.sideWalls),
      PrimaryColor: input.primaryColor,
      Artwork: String(input.artworkCount),
      Text: String(input.textCount),
      Quantity: String(quantity),
      ConfigurationJson: JSON.stringify({
        skuId: input.skuId,
        packageType: input.packageType,
        backWall: input.backWall,
        sideWalls: input.sideWalls,
        quantity,
        primaryColor: input.primaryColor,
      }),
    },
  };
}

export function formatMoney(amount: number, currency = appConfig.pricing.currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
