import type { APIRoute } from 'astro';
import { AVAILABILITY, getProductos, type Availability } from '../lib/catalog';

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

/**
 * Retired products stay in the sitemap: their URLs are live, indexable and still
 * useful for identifying a model. They are simply ranked below the ones that can
 * be bought, and crawled less often since they no longer change.
 */
const PRODUCT_PRIORITY: Record<Availability, { priority: string; changefreq: string }> = {
    [AVAILABILITY.IN_STOCK]: { priority: '0.9', changefreq: 'weekly' },
    [AVAILABILITY.OUT_OF_STOCK]: { priority: '0.6', changefreq: 'weekly' },
    [AVAILABILITY.UNLISTED]: { priority: '0.4', changefreq: 'monthly' },
    [AVAILABILITY.ARCHIVED]: { priority: '0.3', changefreq: 'yearly' },
};

export const GET: APIRoute = async () => {
    const productos = await getProductos();

    const urls = [
        ...pages.map((page) => ({
            loc: `${site}/${page ? `${page}/` : ''}`,
            changefreq: 'weekly',
            priority: page === '' ? '1.0' : '0.8',
        })),
        ...productos.map((producto) => ({
            loc: `${site}/products/${producto.slug}/`,
            ...PRODUCT_PRIORITY[producto.availability],
        })),
    ];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(({ loc, changefreq, priority }) => `  <url>
    <loc>${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

    return new Response(sitemap, {
        headers: {
            'Content-Type': 'application/xml',
        },
    });
};
