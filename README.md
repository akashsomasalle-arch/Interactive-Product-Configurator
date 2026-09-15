# Tent Configurator

React + TypeScript canopy configurator. Product data, camera, colors, packages, walls and prices all live in `src/config.json`.

## Run

```bash
npm install
npm run dev
```

Readable production build (source maps on):

```bash
npm run build
```

Landing: `/`  
Viewer: `/configure/5x5` (also `6.5x6.5`, `8x8`)  
Iframe embed: `/configure/5x5?embed=1`

## What is in the current UI

Keep using the existing left rail and right panels:

1. **Setup** — size, canopy+frame vs canopy only, walls, quantity  
2. **Color** — independent mesh colors + 2D/3D sync  
3. **Upload / Text** — artwork on UV/3D  
4. **Quote** — live price, Shopify draft cart, production PDF  
5. **Saved** — local design library  

The 3D scene, UV minimap and properties panel are unchanged.

## Architecture

- `src/config.json` is the catalog. Swap this file to reuse the shell for another product.
- `src/engine/decalEngine.ts` owns 2D canvases and 3D overlays. UV edits and 3D stay in sync.
- `src/services/commerce.ts` is the only pricing/cart entry point the UI calls. Today it is `MockCommerceService`. Replace it with Shopify Admin/Storefront or a CRM API without changing React components.
- `src/services/pricingEngine.ts` turns setup + artwork counts into a quote using the config price table (size, package, walls, print, artwork, quantity discount).
- `src/services/shopifyCart.ts` writes a mock draft order (`tent_shopify_draft_orders` in localStorage) with line item properties, including `ConfigurationJson`.
- Production PDF opens a print layout with selections, line items and a 3D snapshot. Save as PDF from the browser.
