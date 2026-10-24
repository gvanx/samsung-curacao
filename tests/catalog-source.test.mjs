import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCatalog, loadCatalog, REFRESH_INTERVAL_MS } from '../js/catalog-source.mjs';

const siteRoot = new URL('https://samsungcuracao.com/');
const sourcePath = '/data/connections-products.json';
const snapshotPath = '/data/products.json';
const product = (overrides = {}) => ({
  name: 'Galaxy A57 5G', suffix: '', category: 'samsung', price: 849,
  image: 'galaxy-a57-model.png', ...overrides,
});
const snapshot = [
  product({ price: 969 }),
  product({ name: 'Galaxy S26 Ultra', price: 2549, image: 'galaxy-s26-ultra-model.png' }),
];
const response = data => ({ ok: true, status: 200, json: async () => data });
function routedFetcher(live, saved = response(snapshot)) {
  const calls = [];
  const fetcher = async (url, options) => {
    const path = new URL(url).pathname;
    calls.push({ path, options });
    const result = path === sourcePath ? live : path === snapshotPath ? saved : undefined;
    assert.ok(result, `Unexpected request: ${path}`);
    if (result instanceof Error) throw result;
    return result;
  };
  return { fetcher, calls };
}

function assertNoSavedPrices(result) {
  assert.equal(result.live, false);
  assert.equal(result.products.length, snapshot.length);
  assert.ok(result.products.every(row => row.price === null), 'Every saved amount must be suppressed');
}

test('uses changed live prices, keeps suffix variants distinct, and ignores other brands', async () => {
  const current = [
    product({ suffix: '128GB', price: 799 }),
    product({ suffix: '256GB', price: '899' }),
    product({ name: 'iPhone 17', category: 'apple', price: 2290 }),
  ];
  const { fetcher, calls } = routedFetcher(response(current));
  const result = await loadCatalog({ siteRoot, fetcher });
  assert.equal(result.live, true);
  assert.deepEqual(result.products.map(({ name, suffix, price }) => ({ name, suffix, price })), [
    { name: 'Galaxy A57 5G', suffix: '128GB', price: 799 },
    { name: 'Galaxy A57 5G', suffix: '256GB', price: 899 },
  ]);
  assert.deepEqual(calls.map(call => call.path), [sourcePath]);
  assert.equal(calls[0].options.cache, 'no-store');
  assert.equal(calls[0].options.credentials, 'omit');
  assert.ok(calls[0].options.signal instanceof AbortSignal);
});

test('preserves supported Samsung model routes instead of using upstream links', () => {
  const rows = normalizeCatalog([
    product({ name: 'Galaxy A27', landingPage: 'https://connectionscuracao.net/galaxya27/' }),
    product({ name: 'Galaxy A27 5G' }),
    product({ name: 'Galaxy A37 5G' }),
    product({ name: 'Galaxy A57 5G' }),
    product({ name: 'Galaxy S26 Ultra', landingPage: 'https://example.com/' }),
  ]);
  assert.deepEqual(rows.map(row => row.landingPage), ['/a27/', '/a27/', '/a37/', '/a57/', undefined]);
});

test('new live model images resolve against Connections without a local asset', () => {
  const rows = normalizeCatalog([
    product({ name: 'Galaxy New Model', image: 'galaxy-new-model.png' }),
    product({ name: 'Galaxy New Tablet', image: '/img/products/new-tablet.webp', subcategory: 'tablet' }),
    product({ name: 'Galaxy Other Model', image: 'https://connectionscuracao.net/img/products/other.png' }),
  ]);
  assert.deepEqual(rows.map(row => row.image), [
    'https://connectionscuracao.net/img/products/galaxy-new-model.png',
    'https://connectionscuracao.net/img/products/new-tablet.webp',
    'https://connectionscuracao.net/img/products/other.png',
  ]);
  assert.equal(rows[1].subcategory, 'tablet');
});

test('removed or renamed live products are not merged back from the saved snapshot', async () => {
  const { fetcher, calls } = routedFetcher(response([
    product({ name: 'Galaxy A57 Successor', price: 999 }),
  ]));
  const result = await loadCatalog({ siteRoot, fetcher });
  assert.equal(result.live, true);
  assert.deepEqual(result.products.map(row => row.name), ['Galaxy A57 Successor']);
  assert.equal(result.products.some(row => row.name === 'Galaxy A57 5G'), false);
  assert.equal(calls.length, 1);
});

for (const [label, value] of [
  ['null', null], ['undefined', undefined], ['empty string', ''], ['whitespace', '   '],
  ['zero', 0], ['negative', -1], ['NaN', NaN], ['infinity', Infinity], ['boolean', true],
]) {
  test(`invalid live price (${label}) falls back without showing saved amounts`, async () => {
    const { fetcher, calls } = routedFetcher(response([product({ price: value })]));
    const result = await loadCatalog({ siteRoot, fetcher });
    assertNoSavedPrices(result);
    assert.deepEqual(calls.map(call => call.path), [sourcePath, snapshotPath]);
  });
}

for (const [label, payload] of [
  ['object instead of array', { products: [product()] }],
  ['no Samsung products', [product({ category: 'apple' })]],
  ['unnamed product', [product({ name: ' ' })]],
  ['duplicate variant', [product(), product()]],
  ['partially invalid catalog', [product(), product({ name: 'Galaxy A37 5G', price: null })]],
]) {
  test(`invalid live payload (${label}) uses a price-free snapshot`, async () => {
    const { fetcher } = routedFetcher(response(payload));
    assertNoSavedPrices(await loadCatalog({ siteRoot, fetcher }));
  });
}

test('network failure uses local product names and images without saved prices', async () => {
  const { fetcher } = routedFetcher(new Error('upstream unavailable'));
  const result = await loadCatalog({ siteRoot, fetcher });
  assertNoSavedPrices(result);
  assert.deepEqual(result.products.map(row => row.image), ['galaxy-a57-model.png', 'galaxy-s26-ultra-model.png']);
});

test('non-success source response falls back even when its body could contain prices', async () => {
  const { fetcher } = routedFetcher({ ok: false, status: 503, json: async () => [product()] });
  assertNoSavedPrices(await loadCatalog({ siteRoot, fetcher }));
});

test('malformed source JSON falls back without saved prices', async () => {
  const { fetcher } = routedFetcher({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad JSON'); } });
  assertNoSavedPrices(await loadCatalog({ siteRoot, fetcher }));
});

test('rejects when the source and saved snapshot both fail', async () => {
  const { fetcher } = routedFetcher(new Error('source unavailable'), new Error('snapshot unavailable'));
  await assert.rejects(loadCatalog({ siteRoot, fetcher }), /snapshot unavailable/);
});

test('rejects malformed saved data rather than silently showing an empty collection', async () => {
  const { fetcher } = routedFetcher(new Error('source unavailable'), response({ error: 'missing' }));
  await assert.rejects(loadCatalog({ siteRoot, fetcher }), /Unexpected catalog format/);
});

test('aborts a stalled source request and falls back without saved prices', { timeout: 1000 }, async () => {
  const paths = [];
  let sourceAborted = false;
  const fetcher = (url, { signal }) => {
    const path = new URL(url).pathname;
    paths.push(path);
    if (path === snapshotPath) return Promise.resolve(response(snapshot));
    assert.equal(path, sourcePath);
    return new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => {
        sourceAborted = true;
        reject(new DOMException('Request aborted', 'AbortError'));
      }, { once: true });
    });
  };
  assertNoSavedPrices(await loadCatalog({ siteRoot, fetcher, timeoutMs: 5 }));
  assert.equal(sourceAborted, true);
  assert.deepEqual(paths, [sourcePath, snapshotPath]);
});

test('open pages have a five-minute refresh interval', () => {
  assert.equal(REFRESH_INTERVAL_MS, 300_000);
});
