import { AVAILABILITY, type Availability, type CatalogRegistry, type FewyaCatalog, type FewyaCatalogProduct, type Producto, type SnapshotProducto } from './types';
import { matchProduct, type MatchCandidate } from './matching';
import { canonicalCategoria } from './brands';

/**
 * Merges the three catalog sources into the list of products this site renders:
 *
 *  1. `productos.json`   — frozen snapshot. Owns the URL space and the editorial
 *                          fields Fewya knows nothing about (`destacado`).
 *  2. `catalog-registry` — manual slug pins + retired URLs kept alive on purpose.
 *  3. the Fewya feed     — live content, price and stock.
 *
 * Invariant: **the output always contains every slug present in the snapshot and
 * in the retired list.** A product missing from Fewya loses its buy button, never
 * its page.
 */

export interface ReconcileOptions {
    snapshot: SnapshotProducto[];
    registry: CatalogRegistry;
    /** null when the feed could not be fetched and no cache was available. */
    feed: FewyaCatalog | null;
    shopUrl: string;
}

export interface UnmatchedLocal {
    slug: string;
    titulo: string;
}

export interface SyncReport {
    /** True when running without any Fewya data at all (degraded build). */
    degraded: boolean;
    generatedAt: string | null;
    counts: Record<Availability, number>;
    /** Snapshot products with no Fewya counterpart — candidates for a manual pin. */
    unmatchedLocal: UnmatchedLocal[];
    /** Fewya products that became new pages on this site. */
    newFromFewya: string[];
    matchedBy: Record<string, number>;
}

type Candidate = MatchCandidate & { product: FewyaCatalogProduct };

/** Fewya's own `category` is marketplace-wide ("tecnologia"); this site filters by brand. */
function categoriaFor(fewya: FewyaCatalogProduct | null, fallback: string | null): string | null {
    return canonicalCategoria(fewya?.brand) ?? canonicalCategoria(fallback);
}

function retiredToSnapshot(registry: CatalogRegistry): SnapshotProducto[] {
    return registry.retired.map((entry, i) => ({
        id: `retired-${i}` as unknown as number,
        created_at: '',
        titulo: entry.titulo,
        slug: entry.slug,
        descripcion: null,
        precio: null,
        categoria: entry.categoria,
        imagenes: [],
        destacado: false,
        activo: false,
    }));
}

export function reconcileCatalog({ snapshot, registry, feed, shopUrl }: ReconcileOptions): {
    productos: Producto[];
    report: SyncReport;
} {
    const retired = retiredToSnapshot(registry);
    const retiredSlugs = new Set(retired.map(r => r.slug));
    const locals = [...snapshot, ...retired.filter(r => !snapshot.some(s => s.slug === r.slug))];

    const candidates: Candidate[] = (feed?.products ?? []).map(p => ({
        slug: p.slug,
        title: p.title,
        product: p,
    }));

    const productos: Producto[] = [];
    const unmatchedLocal: UnmatchedLocal[] = [];
    const matchedBy: Record<string, number> = {};
    const consumed = new Set<string>();

    for (const local of locals) {
        const match = feed
            ? matchProduct({ slug: local.slug, title: local.titulo }, candidates, registry.overrides)
            : null;

        if (match) {
            consumed.add(match.candidate.slug);
            matchedBy[match.strategy] = (matchedBy[match.strategy] ?? 0) + 1;
            const f = match.candidate.product;

            productos.push({
                id: local.id,
                // Mirrored from Fewya — this is the whole point of the sync.
                titulo: f.title,
                slug: local.slug, // NEVER taken from Fewya: our URLs are immutable.
                descripcion: f.description ?? local.descripcion,
                precio: f.price,
                categoria: categoriaFor(f, local.categoria),
                imagenes: f.images.length > 0 ? f.images : (local.imagenes ?? []),
                destacado: local.destacado,
                activo: true,
                created_at: local.created_at || f.created_at,
                availability: f.in_stock ? AVAILABILITY.IN_STOCK : AVAILABILITY.OUT_OF_STOCK,
                fewyaUrl: f.url,
                fewyaSlug: f.slug,
                matchedBy: match.strategy,
            });
            continue;
        }

        // No counterpart. Decide between "temporarily withdrawn" and "retired".
        const isRetired = retiredSlugs.has(local.slug);
        let availability: Availability;
        if (!feed) {
            // Degraded build (feed unreachable and no cache): behave exactly like
            // the pre-sync static site instead of blanking every buy button.
            availability = isRetired ? AVAILABILITY.ARCHIVED : AVAILABILITY.IN_STOCK;
        } else {
            availability = isRetired ? AVAILABILITY.ARCHIVED : AVAILABILITY.UNLISTED;
            if (!isRetired) unmatchedLocal.push({ slug: local.slug, titulo: local.titulo });
        }

        productos.push({
            id: local.id,
            titulo: local.titulo,
            slug: local.slug,
            descripcion: local.descripcion,
            precio: local.precio,
            categoria: canonicalCategoria(local.categoria),
            imagenes: local.imagenes ?? [],
            destacado: local.destacado && availability !== AVAILABILITY.ARCHIVED,
            activo: local.activo,
            created_at: local.created_at,
            availability,
            fewyaUrl: shopUrl,
            fewyaSlug: null,
            matchedBy: null,
        });
    }

    // Products created on Fewya after the snapshot: publish them here too.
    const newFromFewya: string[] = [];
    for (const candidate of candidates) {
        if (consumed.has(candidate.slug)) continue;
        const f = candidate.product;
        newFromFewya.push(f.slug);
        matchedBy['fewya-only'] = (matchedBy['fewya-only'] ?? 0) + 1;

        productos.push({
            id: f.id,
            titulo: f.title,
            slug: f.slug,
            descripcion: f.description,
            precio: f.price,
            categoria: categoriaFor(f, null),
            imagenes: f.images,
            destacado: false,
            activo: true,
            created_at: f.created_at,
            availability: f.in_stock ? AVAILABILITY.IN_STOCK : AVAILABILITY.OUT_OF_STOCK,
            fewyaUrl: f.url,
            fewyaSlug: f.slug,
            matchedBy: 'fewya-only',
        });
    }

    const counts = {
        [AVAILABILITY.IN_STOCK]: 0,
        [AVAILABILITY.OUT_OF_STOCK]: 0,
        [AVAILABILITY.UNLISTED]: 0,
        [AVAILABILITY.ARCHIVED]: 0,
    } as Record<Availability, number>;
    for (const p of productos) counts[p.availability] += 1;

    return {
        productos,
        report: {
            degraded: !feed,
            generatedAt: feed?.generated_at ?? null,
            counts,
            unmatchedLocal,
            newFromFewya,
            matchedBy,
        },
    };
}

/**
 * Display order: buyable products first (in stock, then out of stock), retired
 * ones last. Within a group, featured first and then alphabetical, so the grid
 * never leads with something nobody can buy.
 */
const ORDER: Record<Availability, number> = {
    [AVAILABILITY.IN_STOCK]: 0,
    [AVAILABILITY.OUT_OF_STOCK]: 1,
    [AVAILABILITY.UNLISTED]: 2,
    [AVAILABILITY.ARCHIVED]: 3,
};

export function sortForDisplay(productos: Producto[]): Producto[] {
    return [...productos].sort((a, b) =>
        ORDER[a.availability] - ORDER[b.availability] ||
        Number(b.destacado) - Number(a.destacado) ||
        a.titulo.localeCompare(b.titulo, 'es')
    );
}
