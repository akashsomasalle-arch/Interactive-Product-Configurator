import { useEffect, useMemo, useState } from "react";
import { appConfig } from "../lib/appLocation";
import { commerceService } from "../services/commerce";
import { downloadConfigurationPdf } from "../services/pdfExport";
import { formatMoney } from "../services/pricingEngine";
import { activeSku, useConfigurator } from "../store/ConfiguratorContext";
import type { QuoteResult } from "../types";
import { fabricHex } from "../utils";
import { SectionShell } from "./PartDropdown";

export function QuoteSection({ hidden }: { hidden: boolean }) {
  const store = useConfigurator();
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const input = useMemo(
    () => ({
      skuId: store.skuId,
      displayName: activeSku?.displayName ?? store.config.catalog.name,
      packageType: store.packageType,
      backWall: store.backWall,
      sideWalls: store.sideWalls,
      quantity: store.quantity,
      primaryColor: fabricHex(store.partState, store.config),
      artworkCount: store.logos.filter((logo) => logo.type !== "text").length,
      textCount: store.logos.filter((logo) => logo.type === "text").length,
    }),
    [
      store.skuId,
      store.packageType,
      store.backWall,
      store.sideWalls,
      store.quantity,
      store.partState,
      store.logos,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    commerceService.preview(input).then((next) => {
      if (!cancelled) setQuote(next);
    });
    return () => {
      cancelled = true;
    };
  }, [input]);

  useEffect(() => {
    if (!store.isEmbed || !quote) return;
    window.parent.postMessage({ type: "tent:config", input, quote }, "*");
  }, [store.isEmbed, input, quote]);

  const addToCart = async () => {
    if (!quote) return;
    setBusy(true);
    try {
      const cart = await commerceService.addToCart(input, quote);
      setStatus(`Shopify draft ${cart.draftOrderId}. Checkout: ${cart.checkoutUrl}`);
      store.showToast("Quote sent to Shopify draft order");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not add to cart");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionShell eyebrow="05 — Quote & order" title="Quote" sub="Price comes from the commerce service, not the UI." hidden={hidden}>
      <div className="summary-card">
        <div className="summary-row">
          <span className="summary-key">Size</span>
          <span className="summary-val">{input.displayName}</span>
        </div>
        <div className="summary-row">
          <span className="summary-key">Package</span>
          <span className="summary-val">
            {appConfig.packages.find((option) => option.id === input.packageType)?.title ?? input.packageType}
          </span>
        </div>
        <div className="summary-row">
          <span className="summary-key">Back wall</span>
          <span className="summary-val">
            {appConfig.walls.back.find((option) => option.id === input.backWall.coverage)?.title ?? input.backWall.coverage}
          </span>
        </div>
        <div className="summary-row">
          <span className="summary-key">Side walls</span>
          <span className="summary-val">
            {appConfig.walls.sides.find((option) => option.id === input.sideWalls.coverage)?.title ??
              input.sideWalls.coverage}
          </span>
        </div>
        <div className="summary-row">
          <span className="summary-key">Quantity</span>
          <span className="summary-val">{input.quantity}</span>
        </div>
        <div className="summary-row">
          <span className="summary-key">Subtotal</span>
          <span className="summary-val">{quote ? formatMoney(quote.subtotal, quote.currency) : "…"}</span>
        </div>
      </div>

      {quote && (
        <div className="quote-lines">
          {quote.lines.map((line) => (
            <div className="summary-row" key={line.code}>
              <span className="summary-key">{line.label}</span>
              <span className="summary-val">{formatMoney(line.amount, quote.currency)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="quote-actions">
        <button type="button" className="btn btn--light" disabled={busy || !quote} onClick={addToCart}>
          Add to Shopify cart
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={!quote}
          onClick={() => {
            if (!quote) return;
            const preview = store.engine.captureThumbnail();
            const opened = downloadConfigurationPdf(input, quote, preview || undefined);
            store.showToast(
              opened ? "Print dialog opened — choose Save as PDF." : "Allow pop-ups to download the production PDF.",
            );
          }}
        >
          Download production PDF
        </button>
      </div>
      {status ? <p className="quote-status">{status}</p> : null}
    </SectionShell>
  );
}
