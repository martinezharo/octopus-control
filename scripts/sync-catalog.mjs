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
import { validateCatalogFeed, isSameCatalog } from '../src/lib/catalog/validation.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(ROOT, 'src/data/fewya-catalog.json');

const BASE_URL = (process.env.FEWYA_BASE_URL ?? 'https://fewya.com').replace(/\/+$/, '');
const SHOP_SLUG = process.env.FEWYA_SHOP_SLUG ?? 'octopus-control';
const CHECK_ONLY = process.argv.includes('--check');

const url = `${BASE_URL}/api/public/shops/${encodeURIComponent(SHOP_SLUG)}/catalog.json`;

/**
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
    console.error(`✗ ${message}`);
    process.exit(1);
}

const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
}).catch(/** @param {Error} error */ error => fail(`Could not reach ${url}: ${error.message}`));

if (!response.ok) fail(`${url} responded ${response.status}`);

const catalog = await response.json().catch(() => fail(`${url} did not return JSON`));

// The same verdict the build uses, so the cache this script is willing to
// write is exactly the one the build is willing to read.
const verdict = validateCatalogFeed(catalog, SHOP_SLUG);
if (!verdict.ok) fail(`${verdict.reason}; refusing to overwrite the cache`);

const serialized = `${JSON.stringify(catalog, null, 2)}\n`;

const previous = await readFile(OUTPUT, 'utf8').catch(() => null);
const unchanged = previous !== null && isSameCatalog(JSON.parse(previous), catalog);

if (unchanged) {
    console.log(`✓ Cache already up to date (${catalog.products.length} products)`);
    process.exit(0);
}

if (CHECK_ONLY) {
    fail('The committed cache is out of date. Run `pnpm sync:catalog` and commit the result.');
}

await writeFile(OUTPUT, serialized);

const inStock = catalog.products.filter(/** @param {{ in_stock?: boolean }} p */ p => p.in_stock).length;
console.log(`✓ Cached ${catalog.products.length} products from ${catalog.shop.name} (${inStock} in stock)`);
console.log('  Run `pnpm build` to see how they match this site\'s URLs.');
