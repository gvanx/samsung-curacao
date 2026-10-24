#!/usr/bin/env node
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultSource = 'https://connectionscuracao.net/data/products.json';
const options = { source: defaultSource, output: path.join(root, 'data/products.json'), metadata: path.join(root, 'data/catalog-meta.json'), assetsDir: path.join(root, 'img/products'), assetBase: 'https://connectionscuracao.net/', skipImages: false };
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index++) {
  const flag = args[index];
  if (flag === '--skip-images') { options.skipImages = true; continue; }
  if (flag === '--help') { console.log('node scripts/sync-catalog.mjs [--source URL|FILE] [--output FILE] [--metadata FILE] [--assets-dir DIR] [--asset-base URL] [--date YYYY-MM-DD] [--skip-images]'); process.exit(0); }
  const key = { '--source': 'source', '--output': 'output', '--metadata': 'metadata', '--assets-dir': 'assetsDir', '--asset-base': 'assetBase', '--date': 'date' }[flag];
  if (!key || !args[index + 1]) throw new Error(`Unknown or incomplete option: ${flag}`);
  options[key] = args[++index];
}
const exists = file => access(file).then(() => true, () => false);
async function getResponse(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response;
}
const raw = /^https?:\/\//i.test(options.source) ? await (await getResponse(options.source)).json() : JSON.parse(await readFile(path.resolve(options.source), 'utf8'));
if (!Array.isArray(raw)) throw new Error('Source catalog must be a JSON array');
const samsung = raw.filter(p => p.category === 'samsung');
if (!samsung.length) throw new Error('Source catalog has no Samsung products; refusing to overwrite');
await mkdir(options.assetsDir, { recursive: true });
const highlighted = ['Galaxy S26 Ultra', 'Galaxy A57 5G', 'Galaxy A37 5G'];
const landingRoutes = { 'Galaxy A27': '/a27/', 'Galaxy A27 5G': '/a27/', 'Galaxy A37 5G': '/a37/', 'Galaxy A57 5G': '/a57/' };
const products = [], warnings = [], processedAssets = new Set();
for (const p of samsung) {
  if (typeof p.name !== 'string' || !Number.isFinite(Number(p.price)) || Number(p.price) <= 0) throw new Error(`Invalid product: ${p.name || '(unnamed)'}`);
  const sourceImage = String(p.image || ''), filename = path.posix.basename(sourceImage);
  if (!/^[a-z0-9][a-z0-9_.-]*\.(?:png|jpe?g|webp|avif)$/i.test(filename)) throw new Error(`Invalid image filename for ${p.name}`);
  const png = filename.replace(/\.jpe?g$/i, '.png');
  const image = await exists(path.join(options.assetsDir, png)) ? png : filename;
  if (!await exists(path.join(options.assetsDir, image)) && !options.skipImages && !processedAssets.has(image)) {
    processedAssets.add(image);
    const imageUrl = new URL(sourceImage.startsWith('/') ? sourceImage : `img/products/${sourceImage}`, options.assetBase);
    try {
      const response = await getResponse(imageUrl);
      if (!(response.headers.get('content-type') || '').startsWith('image/')) throw new Error('Response is not an image');
      await writeFile(path.join(options.assetsDir, image), Buffer.from(await response.arrayBuffer()));
    } catch (error) { warnings.push(`${p.name}: could not download ${image}: ${error.message}`); }
  }
  products.push({ name: p.name, suffix: p.suffix || '', price: Number(p.price), category: 'samsung', featured: highlighted.includes(p.name), ...(p.subcategory ? { subcategory: p.subcategory } : {}), image, ...(landingRoutes[p.name] ? { landingPage: landingRoutes[p.name] } : {}) });
}
const output = path.resolve(options.output), metadata = path.resolve(options.metadata);
await mkdir(path.dirname(output), { recursive: true }); await mkdir(path.dirname(metadata), { recursive: true });
await writeFile(output, JSON.stringify(products, null, 2) + '\n');
await writeFile(metadata, JSON.stringify({ source: /^https?:\/\//i.test(options.source) ? options.source : defaultSource, syncedAt: options.date || new Date().toISOString().slice(0, 10), productCount: products.length, currency: 'XCG' }, null, 2) + '\n');
console.log(`Synced ${products.length} Samsung products to ${output}`);
warnings.forEach(warning => console.warn(warning)); if (warnings.length) process.exitCode = 1;
