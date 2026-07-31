import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { feedUrl, fetchFewyaCatalog, loadCachedCatalog } from '../src/lib/catalog/feed';
import type { FewyaCatalog } from '../src/lib/catalog/types';

/**
 * The rule this module exists to enforce: **a deploy must never be able to
 * blank the storefront**. Every way the feed can go wrong has to end in `null`
 * so the caller falls back to the committed cache and then to the snapshot —
 * never in a throw that fails the build, and never in a half-parsed catalog
 * that unlists real products.
 */

const BASE = 'https://fewya.test';
const SHOP = 'octopus-control';

function catalog(overrides: Partial<FewyaCatalog> = {}): FewyaCatalog {
    return {
        version: 1,
        generated_at: '2026-07-30T00:00:00.000Z',
        shop: { slug: SHOP, name: 'Octopus Control', url: `${BASE}/${SHOP}` },
        products: [
            {
                id: 'p1',
                slug: 'mando-lg-akb75675304',
                title: 'Mando LG AKB75675304',
                description: null,
                brand: 'LG',
                category: 'LG',
                images: [],
                specifications: {},
                price: 12.9,
                currency: 'EUR',
                in_stock: true,
                url: `${BASE}/${SHOP}/mando-lg-akb75675304`,
                created_at: '2026-01-01T00:00:00.000Z',
            },
        ],
        ...overrides,
    };
}

function respondWith(body: unknown, init: ResponseInit = {}) {
    return vi.fn(async () => new Response(JSON.stringify(body), { status: 200, ...init }));
}

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('feedUrl', () => {
    it('points at the shop catalog endpoint', () => {
        expect(feedUrl(BASE, SHOP)).toBe(`${BASE}/api/public/shops/${SHOP}/catalog.json`);
    });

    it('tolerates a base URL with trailing slashes', () => {
        expect(feedUrl(`${BASE}///`, SHOP)).toBe(`${BASE}/api/public/shops/${SHOP}/catalog.json`);
    });

    it('escapes the shop slug', () => {
        expect(feedUrl(BASE, 'a b/c')).toBe(`${BASE}/api/public/shops/a%20b%2Fc/catalog.json`);
    });
});

describe('fetchFewyaCatalog — the happy path', () => {
    it('returns the parsed catalog', async () => {
        const payload = catalog();
        vi.stubGlobal('fetch', respondWith(payload));

        await expect(fetchFewyaCatalog(BASE, SHOP)).resolves.toEqual(payload);
    });

    it('asks for JSON and gives up rather than hanging the build', async () => {
        const fetchMock = respondWith(catalog());
        vi.stubGlobal('fetch', fetchMock);

        await fetchFewyaCatalog(BASE, SHOP);

        const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe(feedUrl(BASE, SHOP));
        expect((init.headers as Record<string, string>).Accept).toBe('application/json');
        expect(init.signal).toBeInstanceOf(AbortSignal);
    });
});

describe('fetchFewyaCatalog — every way it can fail', () => {
    /**
     * Each case must resolve to `null`. A throw here fails the Cloudflare Pages
     * build; a non-null return publishes whatever nonsense came back.
     */
    const failures: Array<[string, () => void]> = [
        ['a 500 from the server', () => vi.stubGlobal('fetch', respondWith({}, { status: 500 }))],
        ['a 404 from the server', () => vi.stubGlobal('fetch', respondWith({}, { status: 404 }))],
        [
            'a network error',
            () => vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); })),
        ],
        [
            'a timeout',
            () => vi.stubGlobal('fetch', vi.fn(async () => { throw new DOMException('timed out', 'TimeoutError'); })),
        ],
        [
            'a body that is not JSON',
            () => vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>maintenance</html>'))),
        ],
        ['a JSON null', () => vi.stubGlobal('fetch', respondWith(null))],
        ['a JSON array instead of an object', () => vi.stubGlobal('fetch', respondWith([]))],
        ['no products key at all', () => vi.stubGlobal('fetch', respondWith({ shop: { slug: SHOP } }))],
        [
            'products that is not an array',
            () => vi.stubGlobal('fetch', respondWith(catalog({ products: {} as never }))),
        ],
        [
            'no shop slug',
            () => vi.stubGlobal('fetch', respondWith(catalog({ shop: { name: 'x', url: 'y' } as never }))),
        ],
    ];

    for (const [label, arrange] of failures) {
        it(`returns null on ${label}`, async () => {
            arrange();
            await expect(fetchFewyaCatalog(BASE, SHOP)).resolves.toBeNull();
        });
    }

    it('treats an empty catalog as a failed sync, not as "everything was withdrawn"', async () => {
        // A bad deploy on the Fewya side must not be able to unlist this entire
        // site on the next build.
        vi.stubGlobal('fetch', respondWith(catalog({ products: [] })));

        await expect(fetchFewyaCatalog(BASE, SHOP)).resolves.toBeNull();
    });

    it('says why on the build log every time it discards a response', async () => {
        vi.stubGlobal('fetch', respondWith({}, { status: 503 }));
        await fetchFewyaCatalog(BASE, SHOP);

        expect(warn).toHaveBeenCalledOnce();
        expect(String(warn.mock.calls[0][0])).toContain('503');
    });
});

describe('loadCachedCatalog', () => {
    it('resolves without throwing when the cache file is absent from the repo', () => {
        // `import.meta.glob` returns an empty map for a missing file, which is
        // what lets a fresh clone build before anyone has run `pnpm sync:catalog`.
        expect(() => loadCachedCatalog()).not.toThrow();
    });

    it('returns either a usable catalog or null, never a partial one', () => {
        const cached = loadCachedCatalog();
        if (cached === null) return;
        expect(Array.isArray(cached.products)).toBe(true);
        expect(cached.products.length).toBeGreaterThan(0);
        expect(cached.shop.slug).toBeTruthy();
    });
});
