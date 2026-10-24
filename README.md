# Samsung Curaçao

Samsung Galaxy phones and tablets at [samsungcuracao.com](https://samsungcuracao.com), brought to you by Connections Curaçao.

## Pages
- `/` — Galaxy collection, search, series filters, price sorting and store details
- `/a27`, `/a37`, `/a57` — Galaxy A-series product pages
- `/compare` — A37 vs A57 comparison
- `/fold8` — existing Galaxy Z Fold 8 preorder flow

## Stack and hosting
Static HTML, vanilla JavaScript, `css/home.css` for the homepage and `css/shared.css` for product pages. Existing Netlify hosting and routes are retained.

## Automatic catalog prices
The Connections public catalog is the single source for Samsung catalog prices:
`https://connectionscuracao.net/data/products.json`.

The Netlify rewrite in `_redirects` exposes that catalog at the same-origin `/data/connections-products.json`. `js/catalog-source.mjs` fetches it with browser caching disabled and an eight-second timeout. No credentials, scheduled job, or redeployment is needed for Connections price changes to appear on Samsung.

Prices load whenever a page opens, refresh every five minutes while visible, and refresh when visitors return to a tab after 30 seconds or reconnect to the internet. Search, filter and sort choices persist across refreshes. Homepage features, catalog cards, A27/A37/A57 pages and the comparison use the same current data. Images resolve to Connections so new catalog models also appear automatically.

If Connections is unavailable or sends invalid data, the local snapshot supplies product names/images only: saved numeric prices are suppressed and the page says “Ask for current price.” Removed feature models also show that message. Price sorting is disabled while current prices are unavailable. The site does not claim real-time inventory.

The Fold 8 preorder has its own existing variant pricing/deposit calculator and is not part of the Connections catalog sync.

### Fallback snapshot maintenance
The optional command below refreshes the product/image fallback. It is not required to update live prices:

```sh
node scripts/sync-catalog.mjs
```

It downloads missing images and records snapshot source/date in `data/catalog-meta.json`.

## Validation and local preview
```sh
node --test tests/catalog-source.test.mjs
python -m http.server 4173
```

A basic static server does not implement the Netlify proxy; it intentionally shows the no-price fallback. Test the live route on Netlify or use Netlify Dev for a full local proxy preview. No application build is needed.

## Assets
High-resolution Samsung product imagery is in `img/hero/`, with official sources in `img/hero/sources.json`. The raster social preview is `img/og/home.png`.

Main site: [connectionscuracao.net](https://connectionscuracao.net) · Source: `gvanx/connections-curacao`.
