import type { APIRoute } from 'astro';
import { getProductos } from '../lib/supabase';

const pages = [
    '',
    'contacto',
    'devoluciones',
    'faq',
    'sobre-nosotros',
    'products',
    'legal/aviso-legal',
    'legal/cookies',
    'legal/privacidad',
    'legal/terminos',
];

const site = 'https://octopuscontrol.com';

export const GET: APIRoute = async () => {
    const productos = await getProductos();

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages.map((page) => `
  <url>
    <loc>${site}/${page ? `${page}/` : ''}</loc>
    <changefreq>weekly</changefreq>
    <priority>${page === '' ? '1.0' : '0.8'}</priority>
  </url>
  `).join('')}
  ${productos.map((producto) => `
  <url>
    <loc>${site}/products/${producto.slug}/</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  `).join('')}
</urlset>`;

    return new Response(sitemap, {
        headers: {
            'Content-Type': 'application/xml',
        },
    });
};
