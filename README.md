# Samsung Curaçao

Samsung Galaxy phones and tablets at [samsungcuracao.com](https://samsungcuracao.com), brought to you by Connections Curaçao.

## Pages
- `/` — Galaxy collection, search, series filters, price sorting and store details
- `/a27`, `/a37`, `/a57` — Galaxy A-series product pages
- `/compare` — A37 vs A57 comparison
- `/fold8` — existing Galaxy Z Fold 8 preorder flow

## Stack and hosting
Static HTML, vanilla JavaScript, `css/home.css` for the homepage and `css/shared.css` for product pages. Existing Netlify hosting and routes are retained.

## Catalog prices
`data/products.json` is a local snapshot of the Samsung category in the main Connections catalog. Refresh it before publishing catalog changes:

```sh
node scripts/sync-catalog.mjs
```

The script downloads missing product images, preserves local product routes and writes source/date details to `data/catalog-meta.json`. Displayed product-page and homepage feature prices use that same snapshot. This is a manual refresh; the website does not claim real-time stock. WhatsApp requests confirm price, color, storage and availability with the team.

## Local preview
```sh
python -m http.server 4173
```

Check the homepage, mobile layout, catalog search/filter/sort, product prices and the existing preorder page before publishing. No dependency installation or application build is needed.

## Assets
High-resolution Samsung product imagery is in `img/hero/`. Official source URLs are recorded in `img/hero/sources.json`. The raster social preview is `img/og/home.png`.

Main site: [connectionscuracao.net](https://connectionscuracao.net) · Source: `gvanx/connections-curacao`.
