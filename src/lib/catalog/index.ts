import { FEWYA_BASE_URL, FEWYA_SHOP_SLUG } from 'astro:env/server';
import snapshotData from '../../data/productos.json';
import registryData from '../../data/catalog-registry.json';
import { fetchFewyaCatalog, loadCachedCatalog } from './feed';
import { reconcileCatalog, sortForDisplay, type SyncReport } from './reconcile';
import { AVAILABILITY, isBrowsable, isBuyable, isIndexable, isSynced, schemaAvailability, type Availability, type CatalogRegistry, type Producto, type SnapshotProducto } from './types';

export { AVAILABILITY, isBrowsable, isBuyable, isIndexable, isSynced, schemaAvailability };
export type { Availability, Producto };

const snapshot = snapshotData as SnapshotProducto[];
const registry = registryData as CatalogRegistry;

export const shopUrl = `${FEWYA_BASE_URL.replace(/\/+$/, '')}/${FEWYA_SHOP_SLUG}`;

/**
 * The catalog is resolved once per build: fetch the live feed, fall back to the
 * committed cache, then to snapshot-only mode.
 */
let catalogPromise: Promise<{ productos: Producto[]; report: SyncReport }> | null = null;

async function resolveCatalog() {
    const live = await fetchFewyaCatalog(FEWYA_BASE_URL, FEWYA_SHOP_SLUG);
    const feed = live ?? loadCachedCatalog();

    if (!live && feed) {
        console.warn('[catalog] Using the committed Fewya cache; prices and stock may be stale.');
    }
    if (!feed) {
        console.warn('[catalog] No Fewya data available. Building from the frozen snapshot: every URL stays up, but stock is not synced.');
    }

    const result = reconcileCatalog({ snapshot, registry, feed, shopUrl });
    const { counts, unmatchedLocal, newFromFewya } = result.report;
    console.info(
        `[catalog] ${result.productos.length} products — ${counts[AVAILABILITY.IN_STOCK]} in stock, ` +
        `${counts[AVAILABILITY.OUT_OF_STOCK]} out of stock, ${counts[AVAILABILITY.UNLISTED]} unlisted, ` +
        `${counts[AVAILABILITY.ARCHIVED]} archived.`
    );
    if (unmatchedLocal.length > 0) {
        console.warn(
            `[catalog] ${unmatchedLocal.length} product(s) have no Fewya counterpart and lost their buy button. ` +
            `Pin them in src/data/catalog-registry.json if that is wrong:\n` +
            unmatchedLocal.map(p => `  - ${p.slug} (${p.titulo})`).join('\n')
        );
    }
    if (newFromFewya.length > 0) {
        console.info(`[catalog] ${newFromFewya.length} new product(s) published from Fewya: ${newFromFewya.join(', ')}`);
    }

    return { productos: sortForDisplay(result.productos), report: result.report };
}

function catalog() {
    catalogPromise ??= resolveCatalog();
    return catalogPromise;
}

/**
 * Every product with a page on this site, whatever its availability.
 * Use this only to enumerate URLs (static paths); for anything a visitor sees,
 * use `getProductosVisibles`.
 */
export async function getProductos(): Promise<Producto[]> {
    return (await catalog()).productos;
}

/** Products shown to visitors browsing the site. Excludes retired ones. */
export async function getProductosVisibles(): Promise<Producto[]> {
    return (await getProductos()).filter(p => isBrowsable(p.availability));
}

/** Only products that can be bought right now. */
export async function getProductosDisponibles(): Promise<Producto[]> {
    return (await getProductos()).filter(p => isBuyable(p.availability));
}

export async function getProductoBySlug(slug: string): Promise<Producto | null> {
    return (await getProductos()).find(p => p.slug === slug) ?? null;
}

/**
 * Homepage selection: hand-picked products first, topped up with whatever else
 * is in stock so the grid is never half empty after a sell-out.
 */
export async function getProductosDestacados(limit = 6): Promise<Producto[]> {
    const disponibles = await getProductosDisponibles();
    const destacados = disponibles.filter(p => p.destacado);
    const resto = disponibles.filter(p => !p.destacado);
    return [...destacados, ...resto].slice(0, limit);
}

/**
 * Categories with at least one product a visitor can actually reach.
 *
 * Built from the visible products only: Sony, CHiQ, JVC and Panasonic exist in
 * this catalog exclusively as retired models, so including them would offer
 * filters that always come back empty.
 */
export async function getCategorias(): Promise<string[]> {
    const productos = await getProductosVisibles();
    const categorias = new Set<string>();
    for (const p of productos) {
        if (p.categoria) categorias.add(p.categoria);
    }
    return [...categorias].sort((a, b) => a.localeCompare(b, 'es'));
}

/** Same-category products, buyable ones first. Used to give retired pages an exit. */
export async function getRelacionados(producto: Producto, limit = 3): Promise<Producto[]> {
    const productos = await getProductos();
    const sameCategory = productos.filter(p => p.slug !== producto.slug && p.categoria === producto.categoria);
    const pool = sameCategory.length > 0 ? sameCategory : productos.filter(p => p.slug !== producto.slug);
    return pool.filter(p => isBuyable(p.availability)).slice(0, limit);
}

export async function getSyncReport(): Promise<SyncReport> {
    return (await catalog()).report;
}

export function getImageUrl(imagePath: string): string {
    if (!imagePath) return '/placeholder-product.svg';
    if (imagePath.startsWith('http')) return imagePath;
    return imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
}

export function formatPrice(precio: number | null): string {
    if (precio === null) return 'Consultar';
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(precio);
}
