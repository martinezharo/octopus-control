import productosData from '../data/productos.json';

const STORAGE_BASE_URL = 'https://fhuujhrlmdfnpnnucxfv.supabase.co/storage/v1/object/public/productos/';

export interface Producto {
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

const productos: Producto[] = productosData as Producto[];

export async function getProductos(): Promise<Producto[]> {
    return productos.filter(p => p.activo).sort((a, b) => b.titulo.localeCompare(a.titulo, 'es'));
}

export async function getProductoBySlug(slug: string): Promise<Producto | null> {
    return productos.find(p => p.slug === slug && p.activo) ?? null;
}

export async function getProductosDestacados(): Promise<Producto[]> {
    return productos
        .filter(p => p.activo && p.destacado)
        .sort((a, b) => b.titulo.localeCompare(a.titulo, 'es'));
}

export async function getCategorias(): Promise<string[]> {
    const categorias = [...new Set(
        productos
            .filter(p => p.activo && p.categoria)
            .map(p => p.categoria as string)
    )];
    return categorias.sort();
}

export function getImageUrl(imagePath: string): string {
    if (!imagePath) return '/placeholder-product.svg';
    if (imagePath.startsWith('http')) return imagePath;
    return `${STORAGE_BASE_URL}${encodeURIComponent(imagePath)}`;
}

export function formatPrice(precio: number | null): string {
    if (precio === null) return 'Consultar';
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(precio);
}
