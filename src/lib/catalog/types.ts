/**
 * Availability states a product page can be in.
 *
 * Every state renders a real page returning 200. A URL that has ever been
 * published is never deleted and never 301s to a listing — that is what cost
 * this site its rankings in the April 2026 migration.
 *
 * `ARCHIVED` is the one state that is neither browsable nor indexable: see
 * `isBrowsable` and `isIndexable` below for why.
 */
export const AVAILABILITY = {
    /** Mirrored from Fewya, units left. Buyable. */
    IN_STOCK: 'in_stock',
    /** Mirrored from Fewya, zero units. Page stays live, CTA disabled. */
    OUT_OF_STOCK: 'out_of_stock',
    /** Known to Fewya but absent from the current feed (seller deactivated it). */
    UNLISTED: 'unlisted',
    /** Retired product: no Fewya counterpart. URL preserved for its history. */
    ARCHIVED: 'archived',
} as const;

export type Availability = (typeof AVAILABILITY)[keyof typeof AVAILABILITY];

/** True when the product can actually be bought right now. */
export function isBuyable(availability: Availability): boolean {
    return availability === AVAILABILITY.IN_STOCK;
}

/** True when the product is mirrored from Fewya (in stock or not). */
export function isSynced(availability: Availability): boolean {
    return availability === AVAILABILITY.IN_STOCK || availability === AVAILABILITY.OUT_OF_STOCK;
}

/**
 * True when the product belongs in the site's browsing surfaces: the listing
 * grid, the category filter, related products, the homepage.
 *
 * Retired products are excluded. Their content did not survive the April 2026
 * migration — the snapshot was exported filtering on `activo`, so the rows that
 * were already inactive never made it into `productos.json` and only the title
 * and brand could be reconstructed from the slug. What is left is a shell with
 * no description, no price and a placeholder image, which is worth nothing to
 * someone browsing the shop.
 */
export function isBrowsable(availability: Availability): boolean {
    return availability !== AVAILABILITY.ARCHIVED;
}

/**
 * True when the page should be offered to search engines.
 *
 * Retired pages stay at 200 so no inbound link breaks, but they are marked
 * `noindex` and kept out of the sitemap: sixteen near-identical shells with no
 * content of their own are thin content, and asking Google to index them works
 * against the rest of the catalog.
 *
 * This is deliberately reversible. Recovering the original descriptions and
 * images (they may still exist in the retired Supabase project) is enough to
 * make these pages worth indexing again — drop the exclusion here and the URLs
 * come back with their history intact, having never returned a 404.
 */
export function isIndexable(availability: Availability): boolean {
    return availability !== AVAILABILITY.ARCHIVED;
}

/** schema.org availability URL for the product's state. */
export function schemaAvailability(availability: Availability): string {
    switch (availability) {
        case AVAILABILITY.IN_STOCK:
            return 'https://schema.org/InStock';
        case AVAILABILITY.OUT_OF_STOCK:
            return 'https://schema.org/OutOfStock';
        case AVAILABILITY.UNLISTED:
            return 'https://schema.org/OutOfStock';
        case AVAILABILITY.ARCHIVED:
            return 'https://schema.org/Discontinued';
    }
}

/** A product as rendered by the site, after merging the snapshot with Fewya. */
export interface Producto {
    id: number | string;
    titulo: string;
    slug: string;
    descripcion: string | null;
    precio: number | null;
    categoria: string | null;
    imagenes: string[];
    destacado: boolean;
    /** Kept for backwards compatibility with the legacy data file. */
    activo: boolean;
    created_at: string;

    availability: Availability;
    /** Deep link to the exact Fewya product page, or the shop when unmapped. */
    fewyaUrl: string;
    /** Slug on Fewya, when a counterpart was resolved. */
    fewyaSlug: string | null;
    /** How the Fewya counterpart was resolved. Surfaced by the sync report. */
    matchedBy: MatchStrategy | null;
}

export type MatchStrategy = 'override' | 'exact-slug' | 'model-code' | 'title-tokens' | 'fewya-only';

/** Shape of the public feed served by Fewya. */
export interface FewyaCatalogProduct {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    brand: string | null;
    category: string | null;
    images: string[];
    specifications: Record<string, unknown>;
    price: number;
    currency: string;
    in_stock: boolean;
    url: string;
    created_at: string;
}

export interface FewyaCatalog {
    version: number;
    generated_at: string;
    shop: { slug: string; name: string; url: string };
    products: FewyaCatalogProduct[];
}

/** Legacy snapshot entry (src/data/productos.json). */
export interface SnapshotProducto {
    id: number;
    created_at: string;
    titulo: string;
    slug: string;
    descripcion: string | null;
    precio: number | null;
    categoria: string | null;
    imagenes: string[] | null;
    destacado: boolean;
    activo: boolean;
}

/** Retired URL kept alive on purpose (src/data/catalog-registry.json). */
export interface RetiredEntry {
    slug: string;
    titulo: string;
    categoria: string | null;
    nota?: string;
}

export interface CatalogRegistry {
    shop: string;
    /** Manual pin, OC slug -> Fewya slug. Wins over every automatic strategy. */
    overrides: Record<string, string>;
    retired: RetiredEntry[];
}
