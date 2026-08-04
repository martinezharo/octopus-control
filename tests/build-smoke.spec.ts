import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import snapshot from '../src/data/productos.json';
import registry from '../src/data/catalog-registry.json';

const DIST = path.resolve(import.meta.dirname, '../dist');
const SITE = 'https://octopuscontrol.com';

async function exists(file: string): Promise<boolean> {
    return stat(file).then(() => true, () => false);
}

async function productPages(): Promise<Map<string, string>> {
    const root = path.join(DIST, 'products');
    const entries = await readdir(root, { withFileTypes: true });
    const pages = new Map<string, string>();
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const file = path.join(root, entry.name, 'index.html');
        if (await exists(file)) pages.set(entry.name, await readFile(file, 'utf8'));
    }
    return pages;
}

describe('static build catalog', () => {
    it('emits one live page for every current or retired product URL', async () => {
        const pages = await productPages();
        const expected = new Set([
            ...snapshot.map((product) => product.slug),
            ...registry.retired.map((product) => product.slug),
        ]);

        expect([...expected].filter((slug) => !pages.has(slug))).toEqual([]);
        for (const [slug, html] of pages) {
            expect(html, slug).toContain('<article class="product-page"');
        }
    });

    it('keeps retired URLs at 200-equivalent HTML and marks them noindex', async () => {
        const pages = await productPages();
        for (const product of registry.retired) {
            expect(pages.get(product.slug), product.slug).toContain('name="robots" content="noindex, follow"');
        }
    });

    it('puts every and only indexable product page in the sitemap', async () => {
        const pages = await productPages();
        const sitemap = await readFile(path.join(DIST, 'sitemap.xml'), 'utf8');
        const sitemapSlugs = new Set(
            [...sitemap.matchAll(/<loc>https:\/\/octopuscontrol\.com\/products\/([^/]+)\/<\/loc>/g)]
                .map((match) => match[1]),
        );
        const indexableSlugs = new Set(
            [...pages]
                .filter(([, html]) => !html.includes('name="robots" content="noindex, follow"'))
                .map(([slug]) => slug),
        );

        expect(sitemapSlugs).toEqual(indexableSlugs);
        for (const slug of sitemapSlugs) {
            expect(sitemap).toContain(`<loc>${SITE}/products/${slug}/</loc>`);
        }
    });
});
