import { describe, it, expect } from 'vitest';
import { reconcileCatalog, sortForDisplay } from '../src/lib/catalog/reconcile';
import { AVAILABILITY } from '../src/lib/catalog/types';
import type { CatalogRegistry, FewyaCatalog, SnapshotProducto } from '../src/lib/catalog/types';

const SHOP_URL = 'https://fewya.com/octopus-control';

function snapshotProduct(overrides: Partial<SnapshotProducto> = {}): SnapshotProducto {
    return {
        id: 1,
        created_at: '2026-02-07T10:56:51.541706+00:00',
        titulo: 'Mando LG AKB75675304',
        slug: 'lg-akb75675304',
        descripcion: 'Descripción antigua',
        precio: 3.49,
        categoria: 'Lg',
        imagenes: ['https://cdn.jsdelivr.net/legacy-1.webp'],
        destacado: true,
        activo: true,
        ...overrides,
    };
}

function feed(products: Partial<FewyaCatalog['products'][number]>[] = []): FewyaCatalog {
    return {
        version: 1,
        generated_at: '2026-07-29T10:00:00.000Z',
        shop: { slug: 'octopus-control', name: 'Octopus Control', url: SHOP_URL },
        products: products.map((p, i) => ({
            id: `uuid-${i}`,
            slug: 'mando-lg-akb75675304',
            title: 'Mando LG AKB75675304',
            description: 'Descripción actual en Fewya',
            brand: 'LG',
            category: 'tecnologia',
            images: ['https://cdn.fewya.com/nueva-1.webp'],
            specifications: {},
            price: 4.5,
            currency: 'EUR',
            in_stock: true,
            url: `${SHOP_URL}/mando-lg-akb75675304`,
            created_at: '2026-02-07T10:56:51.541706+00:00',
            ...p,
        })),
    };
}

const emptyRegistry: CatalogRegistry = { shop: 'octopus-control', overrides: {}, retired: [] };

function run(snapshot: SnapshotProducto[], registry: CatalogRegistry, catalog: FewyaCatalog | null) {
    return reconcileCatalog({ snapshot, registry, feed: catalog, shopUrl: SHOP_URL });
}

describe('reconcileCatalog — mirroring', () => {
    it('takes content and stock from Fewya but keeps our slug', () => {
        const { productos } = run([snapshotProduct()], emptyRegistry, feed([{}]));

        expect(productos).toHaveLength(1);
        expect(productos[0]).toMatchObject({
            slug: 'lg-akb75675304', // ours, not Fewya's
            titulo: 'Mando LG AKB75675304',
            descripcion: 'Descripción actual en Fewya',
            precio: 4.5,
            imagenes: ['https://cdn.fewya.com/nueva-1.webp'],
            availability: AVAILABILITY.IN_STOCK,
            fewyaUrl: `${SHOP_URL}/mando-lg-akb75675304`,
            fewyaSlug: 'mando-lg-akb75675304',
        });
    });

    it('keeps the editorial flag Fewya knows nothing about', () => {
        const { productos } = run([snapshotProduct({ destacado: true })], emptyRegistry, feed([{}]));
        expect(productos[0].destacado).toBe(true);
    });

    it('canonicalises the category so LG and Lg do not split the filter', () => {
        const { productos } = run(
            [snapshotProduct({ categoria: 'Lg' }), snapshotProduct({ id: 2, slug: 'otro', titulo: 'Mando LG AKB1', categoria: 'Lg' })],
            emptyRegistry,
            feed([{ brand: 'LG' }])
        );
        expect(new Set(productos.map(p => p.categoria))).toEqual(new Set(['LG']));
    });

    it('marks a sold-out product without touching its URL', () => {
        const { productos } = run([snapshotProduct()], emptyRegistry, feed([{ in_stock: false }]));
        expect(productos[0].availability).toBe(AVAILABILITY.OUT_OF_STOCK);
        expect(productos[0].slug).toBe('lg-akb75675304');
        expect(productos[0].fewyaUrl).toBe(`${SHOP_URL}/mando-lg-akb75675304`);
    });

    it('publishes products that only exist on Fewya', () => {
        const { productos, report } = run([], emptyRegistry, feed([{ slug: 'mando-tcl-rc802n', title: 'Mando TCL RC802N', brand: 'TCL' }]));
        expect(productos.map(p => p.slug)).toEqual(['mando-tcl-rc802n']);
        expect(report.newFromFewya).toEqual(['mando-tcl-rc802n']);
    });
});

describe('reconcileCatalog — URL preservation', () => {
    it('keeps a product whose Fewya listing disappeared, without a buy link', () => {
        const { productos, report } = run([snapshotProduct()], emptyRegistry, feed([{ slug: 'otra-cosa', title: 'Mando Samsung BN59-01358D' }]));

        const orphan = productos.find(p => p.slug === 'lg-akb75675304');
        expect(orphan?.availability).toBe(AVAILABILITY.UNLISTED);
        expect(orphan?.fewyaUrl).toBe(SHOP_URL);
        expect(orphan?.descripcion).toBe('Descripción antigua'); // snapshot content survives
        expect(report.unmatchedLocal.map(p => p.slug)).toContain('lg-akb75675304');
    });

    it('renders retired URLs as archived pages instead of dropping them', () => {
        const registry: CatalogRegistry = {
            ...emptyRegistry,
            retired: [{ slug: 'mando-lg-akb75095308', titulo: 'Mando LG AKB75095308', categoria: 'LG' }],
        };
        const { productos } = run([], registry, feed([]));

        expect(productos).toHaveLength(1);
        expect(productos[0]).toMatchObject({
            slug: 'mando-lg-akb75095308',
            availability: AVAILABILITY.ARCHIVED,
            precio: null,
            destacado: false,
        });
    });

    it('brings a retired product back on its original URL once Fewya lists it again', () => {
        const registry: CatalogRegistry = {
            ...emptyRegistry,
            retired: [{ slug: 'mando-lg-akb75095308', titulo: 'Mando LG AKB75095308', categoria: 'LG' }],
        };
        const { productos } = run([], registry, feed([{ slug: 'mando-lg-akb75095308', title: 'Mando LG AKB75095308' }]));

        expect(productos[0].slug).toBe('mando-lg-akb75095308');
        expect(productos[0].availability).toBe(AVAILABILITY.IN_STOCK);
    });

    it('never loses a slug, whatever the feed says', () => {
        const snapshot = [
            snapshotProduct(),
            snapshotProduct({ id: 2, slug: 'mando-chromecast', titulo: 'Mando para Chromecast' }),
        ];
        const registry: CatalogRegistry = {
            ...emptyRegistry,
            retired: [{ slug: 'mando-lg-mr500g', titulo: 'Mando LG MR500G', categoria: 'LG' }],
        };
        const { productos } = run(snapshot, registry, feed([]));

        expect(productos.map(p => p.slug).sort()).toEqual(
            ['lg-akb75675304', 'mando-chromecast', 'mando-lg-mr500g']
        );
    });
});

describe('reconcileCatalog — degraded build', () => {
    it('behaves like the pre-sync static site when the feed is unavailable', () => {
        const registry: CatalogRegistry = {
            ...emptyRegistry,
            retired: [{ slug: 'mando-lg-mr500g', titulo: 'Mando LG MR500G', categoria: 'LG' }],
        };
        const { productos, report } = run([snapshotProduct()], registry, null);

        expect(report.degraded).toBe(true);
        // Crucially it does NOT blank every buy button because of a network blip.
        expect(productos.find(p => p.slug === 'lg-akb75675304')?.availability).toBe(AVAILABILITY.IN_STOCK);
        expect(productos.find(p => p.slug === 'mando-lg-mr500g')?.availability).toBe(AVAILABILITY.ARCHIVED);
        expect(report.unmatchedLocal).toEqual([]);
    });
});

describe('sortForDisplay', () => {
    it('puts buyable products first and retired ones last', () => {
        const base = { fewyaUrl: SHOP_URL, fewyaSlug: null, matchedBy: null, created_at: '', imagenes: [], categoria: null, descripcion: null, precio: 1, activo: true, id: 1 };
        const sorted = sortForDisplay([
            { ...base, slug: 'c', titulo: 'C', destacado: false, availability: AVAILABILITY.ARCHIVED },
            { ...base, slug: 'b', titulo: 'B', destacado: false, availability: AVAILABILITY.OUT_OF_STOCK },
            { ...base, slug: 'a', titulo: 'A', destacado: false, availability: AVAILABILITY.IN_STOCK },
            { ...base, slug: 'd', titulo: 'D', destacado: true, availability: AVAILABILITY.IN_STOCK },
        ]);
        expect(sorted.map(p => p.slug)).toEqual(['d', 'a', 'b', 'c']);
    });
});
