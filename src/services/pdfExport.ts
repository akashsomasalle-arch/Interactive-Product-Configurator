import { formatMoney, packageLabel, summarizeWalls } from "./pricingEngine";
import type { QuoteInput } from "./pricingEngine";
import type { QuoteResult } from "../types";
import { escapeHtml } from "../utils";

export function downloadConfigurationPdf(input: QuoteInput, quote: QuoteResult, previewImage?: string) {
  const rows: Array<[string, string]> = [
    ["Product", input.displayName],
    ["SKU", quote.sku],
    ["Package", packageLabel(input.packageType)],
    ["Walls", summarizeWalls(input.backWall, input.sideWalls)],
    ["Primary color", input.primaryColor],
    ["Artwork layers", String(input.artworkCount)],
    ["Text layers", String(input.textCount)],
    ["Quantity", String(quote.quantity)],
    ["Unit price", formatMoney(quote.unitPrice, quote.currency)],
    ["Subtotal", formatMoney(quote.subtotal, quote.currency)],
  ];

  const lines = quote.lines
    .map(
      (line) =>
        `<tr><td>${escapeHtml(line.label)}</td><td style="text-align:right">${escapeHtml(formatMoney(line.amount, quote.currency))}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(quote.sku)} production summary</title>
    <style>
      body { font-family: Arimo, Arial, sans-serif; color: #111; margin: 40px; }
      h1 { font-size: 22px; margin: 0 0 8px; text-transform: uppercase; }
      h2 { font-size: 16px; margin: 28px 0 12px; text-transform: uppercase; }
      p { color: #555; margin: 0 0 24px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
      th, td { text-align: left; padding: 8px 0; border-bottom: 1px solid #ddd; font-size: 13px; }
      th { width: 180px; color: #666; font-weight: 700; text-transform: uppercase; font-size: 11px; }
      img { max-width: 100%; border: 1px solid #ddd; }
    </style>
  </head>
  <body>
    <h1>Production summary</h1>
    <p>Attach this sheet to the Shopify draft order.</p>
    <table>
      ${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}
    </table>
    <h2>Line items</h2>
    <table>${lines}</table>
    ${previewImage ? `<h2>3D preview</h2><img src="${previewImage}" alt="3D preview" />` : ""}
  </body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    const popup = window.open("", "_blank", "width=900,height=1100");
    if (!popup) return false;
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
    return true;
  }
  doc.open();
  doc.write(html);
  doc.close();
  let printed = false;
  const print = () => {
    if (printed) return;
    printed = true;
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(() => iframe.remove(), 1500);
  };
  iframe.onload = print;
  window.setTimeout(print, 350);
  return true;
}
