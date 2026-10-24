// Connections is the price source. The local snapshot is only a product/image
// fallback: it must never present its saved amounts as current prices.
const CONNECTIONS = 'https://connectionscuracao.net/';
const localRoutes = new Map([
  ['Galaxy A27', '/a27/'],
  ['Galaxy A27 5G', '/a27/'],
  ['Galaxy A37 5G', '/a37/'],
  ['Galaxy A57 5G', '/a57/'],
]);

export const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export function normalizeCatalog(data, { live = true } = {}) {
  if (!Array.isArray(data)) throw new Error('Unexpected catalog format');
  const rows = data.filter(product => product?.category === 'samsung');
  if (!rows.length) throw new Error('Empty Samsung catalog');
  const names = new Set();
  return rows.map(product => {
    if (typeof product.name !== 'string' || !product.name.trim()) {
      throw new Error('Unnamed Samsung product');
    }
    const name = product.name.trim();
    const suffix = typeof product.suffix === 'string' ? product.suffix.trim() : '';
    const identity = [name, suffix].filter(Boolean).join(' ');
    if (names.has(identity)) throw new Error('Duplicate Samsung variant');
    names.add(identity);
    const validPrice = (typeof product.price === 'number' ||
      (typeof product.price === 'string' && product.price.trim() !== '')) &&
      Number.isFinite(Number(product.price)) && Number(product.price) > 0;
    if (live && !validPrice) throw new Error('Invalid Samsung price');

    const sourceImage = typeof product.image === 'string' ? product.image : '';
    let image = '';
    if (live && sourceImage) {
      const url = new URL(sourceImage.startsWith('/') || /^https:\/\//i.test(sourceImage)
        ? sourceImage : `img/products/${sourceImage}`, CONNECTIONS);
      if (url.origin === new URL(CONNECTIONS).origin && url.pathname.startsWith('/img/')) {
        image = url.href;
      }
    } else if (/^[a-z0-9][a-z0-9_.-]*\.(?:png|jpe?g|webp|avif)$/i.test(sourceImage)) {
      image = sourceImage;
    }
    return {
      name, suffix, category: 'samsung', price: live ? Number(product.price) : null,
      image,
      ...(product.subcategory === 'tablet' ? { subcategory: 'tablet' } : {}),
      ...(localRoutes.has(name) ? { landingPage: localRoutes.get(name) } : {}),
    };
  });
}

async function fetchJson(url, fetcher, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, {
      cache: 'no-store', credentials: 'omit', signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadCatalog({
  siteRoot = new URL('../', import.meta.url), fetcher = fetch, timeoutMs = 8000,
} = {}) {
  try {
    const data = await fetchJson(new URL('data/connections-products.json', siteRoot), fetcher, timeoutMs);
    return { products: normalizeCatalog(data), live: true };
  } catch {
    const snapshot = await fetchJson(new URL('data/products.json', siteRoot), fetcher, timeoutMs);
    return { products: normalizeCatalog(snapshot, { live: false }), live: false };
  }
}
