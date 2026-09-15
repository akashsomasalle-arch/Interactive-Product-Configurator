import type { QuoteInput } from "./pricingEngine";
import type { QuoteResult, ShopifyCartResponse } from "../types";

const STORAGE_KEY = "tent_shopify_draft_orders";

function randomId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function addToShopifyCart(input: QuoteInput, quote: QuoteResult): ShopifyCartResponse {
  const draftOrderId = randomId("gid://shopify/DraftOrder");
  const response: ShopifyCartResponse = {
    draftOrderId,
    checkoutUrl: `/checkout?draft=${encodeURIComponent(draftOrderId)}`,
    lineItem: {
      sku: quote.sku,
      title: input.displayName,
      quantity: quote.quantity,
      price: quote.unitPrice,
      properties: quote.shopifyProperties,
    },
  };

  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as ShopifyCartResponse[];
    existing.unshift(response);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 20)));
  } catch {
    /* iframe sandbox */
  }

  return response;
}
