import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FewyaCatalog } from '../src/lib/catalog/types';

/**
 * The three-step fallback: live feed -> committed cache -> frozen snapshot.
 *
 * Only the last step is guaranteed to exist, and it is the one that matters:
 * whatever happens to fewya.com, every URL this site has ever published still
 * builds a page. These tests drive the chain from the entry point rather than
 * from `feed.ts`, because the promise is about what the site renders.
 */

const fetchFewyaCatalog = vi.fn();
const loadCachedCatalog = vi.fn();

vi.mock('../src/lib/catalog/feed', () => ({
    fetchFewyaCatalog: (...args: unknown[]) => fetchFewyaCatalog(...args),
    loadCachedCatalog: () => loadCachedCatalog(),
    feedUrl: (base: string, shop: string) => `${base}/api/public/shops/${shop}/catalog.json`,
}));

/** The catalog module memoises its resolution, so each test needs a fresh copy. */
async function loadCatalogModule() {
    vi.resetModules();
    return import('../src/lib/catalog/index');
}

function feedWith(slugs: string[]): FewyaCatalog {
    return {
        version: 1,
        generated_at: '2026-07-30T00:00:00.000Z',
        shop: { slug: 'octopus-control', name: 'Octopus Control', url: 'https://fewya.test/octopus-control' },
        products: slugs.map((slug, i) => ({
            id: `p${i}`,
            slug,
            title: slug.replace(/-/g, ' '),
            description: 'desc',
            brand: 'LG',
            category: 'LG',
            images: ['https://img.test/a.jpg'],
            specifications: {},
            price: 10 + i,
            currency: 'EUR',
            in_stock: true,
            url: `https://fewya.test/octopus-control/${slug}`,
            created_at: '2026-01-01T00:00:00.000Z',
        })),
    };
}

beforeEach(() => {
    fetchFewyaCatalog.mockReset();
    loadCachedCatalog.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('when the live feed answers', () => {
    it('uses it and does not read the cache', async () => {
        fetchFewyaCatalog.mockResolvedValue(feedWith([]));
        loadCachedCatalog.mockReturnValue(null);

        const { getProductos } = await loadCatalogModule();
        await getProductos();

        expect(loadCachedCatalog).not.toHaveBeenCalled();
    });

    it('resolves the catalog once per build, however many pages ask for it', async () => {
        fetchFewyaCatalog.mockResolvedValue(feedWith([]));
        loadCachedCatalog.mockReturnValue(null);

        const catalog = await loadCatalogModule();
        await Promise.all([
            catalog.getProductos(),
            catalog.getProductosVisibles(),
            catalog.getCategorias(),
            catalog.getProductosDestacados(),
        ]);

        expect(fetchFewyaCatalog).toHaveBeenCalledOnce();
    });
});

describe('when the live feed is unreachable', () => {
    it('falls back to the committed cache', async () => {
        fetchFewyaCatalog.mockResolvedValue(null);
        loadCachedCatalog.mockReturnValue(feedWith([]));

        const { getProductos } = await loadCatalogModule();
        await getProductos();

        expect(loadCachedCatalog).toHaveBeenCalledOnce();
    });

    it('warns that prices and stock may be stale', async () => {
        fetchFewyaCatalog.mockResolvedValue(null);
        loadCachedCatalog.mockReturnValue(feedWith([]));

        const { getProductos } = await loadCatalogModule();
        await getProductos();

        const warnings = (console.warn as ReturnType<typeof vi.spyOn>).mock.calls.map(String);
        expect(warnings.some((w) => w.includes('cache'))).toBe(true);
    });
});

describe('when there is no Fewya data at all', () => {
    /** Feed down *and* no committed cache: the worst case a build can hit. */
    async function buildWithNothing() {
        fetchFewyaCatalog.mockResolvedValue(null);
        loadCachedCatalog.mockReturnValue(null);
        return loadCatalogModule();
    }

    it('still builds a catalog from the frozen snapshot', async () => {
        const { getProductos } = await buildWithNothing();
        const productos = await getProductos();

        // The specific number is not the point; "not empty" is. An empty
        // catalog here means a deploy blanked the storefront.
        expect(productos.length).toBeGreaterThan(0);
    });

    it('keeps every published URL alive, so no inbound link breaks', async () => {
        const withFeed = await (async () => {
            fetchFewyaCatalog.mockResolvedValue(feedWith([]));
            loadCachedCatalog.mockReturnValue(null);
            const { getProductos } = await loadCatalogModule();
            return (await getProductos()).map((p) => p.slug).sort();
        })();

        const { getProductos } = await buildWithNothing();
        const withoutFeed = (await getProductos()).map((p) => p.slug).sort();

        expect(withoutFeed).toEqual(withFeed);
    });

    it('keeps selling, behaving exactly like the site did before the sync existed', async () => {
        const { getProductosDisponibles, getProductos } = await buildWithNothing();

        // A deliberate trade-off (see reconcile.ts): stock is unknown, but
        // marking the whole catalog out of stock over a network blip would cost
        // more than the occasional order placed on a sold-out unit.
        const disponibles = await getProductosDisponibles();
        expect(disponibles.length).toBeGreaterThan(0);

        // Retired products are the exception: they stay archived, so the
        // degraded path cannot resurrect a buy button for a product that has no
        // Fewya counterpart at all.
        const productos = await getProductos();
        expect(productos.length).toBeGreaterThan(disponibles.length);
        expect(disponibles.every((p) => p.availability === 'in_stock')).toBe(true);
    });

    it('reports the build as degraded, so the log says why prices are frozen', async () => {
        const { getSyncReport } = await buildWithNothing();
        const report = await getSyncReport();

        expect(report.degraded).toBe(true);
        expect(report.generatedAt).toBeNull();
    });

    it('does not throw', async () => {
        const { getProductos } = await buildWithNothing();
        await expect(getProductos()).resolves.toBeDefined();
    });
});

describe('a feed that no longer lists a product', () => {
    it('keeps its page instead of dropping the URL', async () => {
        fetchFewyaCatalog.mockResolvedValue(feedWith([]));
        loadCachedCatalog.mockReturnValue(null);

        const { getProductos } = await loadCatalogModule();
        const productos = await getProductos();

        // Nothing matched the (empty) feed, yet every snapshot URL is still here.
        expect(productos.length).toBeGreaterThan(0);
        expect(productos.every((p) => typeof p.slug === 'string' && p.slug.length > 0)).toBe(true);
    });

    it('never renders a page without a slug or a title', async () => {
        fetchFewyaCatalog.mockResolvedValue(null);
        loadCachedCatalog.mockReturnValue(null);

        const { getProductos } = await loadCatalogModule();
        for (const producto of await getProductos()) {
            expect(producto.slug, JSON.stringify(producto)).toBeTruthy();
            expect(producto.titulo, producto.slug).toBeTruthy();
            expect(producto.fewyaUrl, producto.slug).toContain('http');
        }
    });
});
