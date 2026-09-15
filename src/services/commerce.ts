import type { QuoteResult, ShopifyCartResponse } from "../types";
import { quoteConfiguration, type QuoteInput } from "./pricingEngine";
import { addToShopifyCart } from "./shopifyCart";

export interface CommerceService {
  preview(input: QuoteInput): Promise<QuoteResult>;
  addToCart(input: QuoteInput, quote: QuoteResult): Promise<ShopifyCartResponse>;
}

/**
 * UI never reads the price table directly. Swap this mock for
 * Shopify Admin / Storefront or a CRM pricing endpoint later.
 */
export class MockCommerceService implements CommerceService {
  async preview(input: QuoteInput) {
    return quoteConfiguration(input);
  }

  async addToCart(input: QuoteInput, quote: QuoteResult) {
    return addToShopifyCart(input, quote);
  }
}

export const commerceService: CommerceService = new MockCommerceService();
