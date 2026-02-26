import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

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

export async function getProductos(): Promise<Producto[]> {
    const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .order('titulo', { ascending: false });

    if (error) {
        console.error('Error fetching productos:', error);
        return [];
    }

    return data || [];
}

export async function getProductoBySlug(slug: string): Promise<Producto | null> {
    const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('slug', slug)
        .eq('activo', true)
        .single();

    if (error) {
        console.error('Error fetching producto:', error);
        return null;
    }

    return data;
}

export async function getProductosDestacados(): Promise<Producto[]> {
    const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .eq('destacado', true)
        .order('titulo', { ascending: false });

    if (error) {
        console.error('Error fetching productos destacados:', error);
        return [];
    }

    return data || [];
}

export async function getCategorias(): Promise<string[]> {
    const { data, error } = await supabase
        .from('productos')
        .select('categoria')
        .eq('activo', true)
        .not('categoria', 'is', null);

    if (error) {
        console.error('Error fetching categorias:', error);
        return [];
    }

    const categorias = [...new Set(data?.map(p => p.categoria).filter(Boolean) as string[])];
    return categorias.sort();
}

export function getImageUrl(imagePath: string): string {
    if (!imagePath) return '/placeholder-product.svg';

    // If it's already a full URL, return it
    if (imagePath.startsWith('http')) return imagePath;

    // Build Supabase storage URL
    return `${supabaseUrl}/storage/v1/object/public/productos/${encodeURIComponent(imagePath)}`;
}

export function formatPrice(precio: number | null): string {
    if (precio === null) return 'Consultar';
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(precio);
}
