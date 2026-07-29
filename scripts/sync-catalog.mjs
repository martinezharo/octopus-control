#!/usr/bin/env node
/**
 * Refreshes the committed copy of the Fewya catalog (src/data/fewya-catalog.json).
 *
 * The build already fetches the feed live, so this script is not required for a
 * deploy. What it gives you is a safety net and a diff:
 *
 *   - the committed copy is what the build falls back to when fewya.com is
 *     unreachable from the Cloudflare Pages builder;
 *   - `git diff` after running it shows exactly what changed in the shop
 *     (prices, stock, new products) before you ship it.
 *
 * Usage:
 *   pnpm sync:catalog          # refresh the cache
 *   pnpm sync:catalog --check  # fail if the cache is stale (for CI)
 *
 * Run `pnpm build` afterwards: it prints which products matched, which are left
 * without a Fewya counterpart, and which ones are new.
 */
import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(ROOT, 'src/data/fewya-catalog.json');

const BASE_URL = (process.env.FEWYA_BASE_URL ?? 'https://fewya.com').replace(/\/+$/, '');
const SHOP_SLUG = process.env.FEWYA_SHOP_SLUG ?? 'octopus-control';
const CHECK_ONLY = process.argv.includes('--check');

const url = `${BASE_URL}/api/public/shops/${encodeURIComponent(SHOP_SLUG)}/catalog.json`;

function fail(message) {
    console.error(`✗ ${message}`);
    process.exit(1);
}

const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
}).catch(error => fail(`Could not reach ${url}: ${error.message}`));

if (!response.ok) fail(`${url} responded ${response.status}`);

const catalog = await response.json().catch(() => fail(`${url} did not return JSON`));

if (!Array.isArray(catalog?.products)) fail('The feed has no "products" array');
if (catalog.products.length === 0) {
    // Overwriting a good cache with an empty one would unlist the whole site on
    // the next build that cannot reach the network.
    fail('The feed returned zero products; refusing to overwrite the cache');
}
if (catalog.shop?.slug !== SHOP_SLUG) {
    fail(`The feed is for shop "${catalog.shop?.slug}", expected "${SHOP_SLUG}"`);
}

// `generated_at` changes on every request; ignore it when comparing so an
// unchanged catalog produces no diff.
const stripVolatile = ({ generated_at: _ignored, ...rest }) => rest;
const serialized = `${JSON.stringify(catalog, null, 2)}\n`;

const previous = await readFile(OUTPUT, 'utf8').catch(() => null);
const unchanged = previous
    && JSON.stringify(stripVolatile(JSON.parse(previous))) === JSON.stringify(stripVolatile(catalog));

if (unchanged) {
    console.log(`✓ Cache already up to date (${catalog.products.length} products)`);
    process.exit(0);
}

if (CHECK_ONLY) {
    fail('The committed cache is out of date. Run `pnpm sync:catalog` and commit the result.');
}

await writeFile(OUTPUT, serialized);

const inStock = catalog.products.filter(p => p.in_stock).length;
console.log(`✓ Cached ${catalog.products.length} products from ${catalog.shop.name} (${inStock} in stock)`);
console.log('  Run `pnpm build` to see how they match this site\'s URLs.');
