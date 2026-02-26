import type { APIRoute } from 'astro';

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

const productSlugs = [
    "mando-chiq-gcbltv02adbbt",
    "chr-funda-azul-lum",
    "mando-fire-tv",
    "mando-fire-tv-1era-generacion",
    "mando-amazon-fire-tv-2-gen",
    "mando-amazon-fire-tv",
    "ftv-3th-gen-funda-fucsia",
    "ftv-3th-gen-funda-morada",
    "ftv-3th-gen-funda-negra",
    "ftv-3th-gen-funda-rosa-lum",
    "ftv-3th-gen-funda-verde-lum",
    "mando-hisense-en2a30",
    "mando-hisense-en2b27",
    "mando-jvc-rm-c3338",
    "mando-akb69680403-lg",
    "mando-akb73715603-lg",
    "mando-akb73756504-lg",
    "mando-lg-akb74915324",
    "mando-lg-akb75095308",
    "mando-lg-akb75375604",
    "lg-akb75675304",
    "mando-lg-akb76037601",
    "mando-lg-magic-remote-an-mr600",
    "lg-funda-azul-lum",
    "lg-funda-negra",
    "lg-mr15-20-funda-azul-lum",
    "lg-mr15-20-funda-negra",
    "lg-mr15-20-funda-verde-lum",
    "mando-mr20ga-lg-magic",
    "lg-mr21-24-funda-verde-lum",
    "mando-mr22ga-lg",
    "mando-lg-mr24ga",
    "mando-lg-mr500g",
    "panasonic-n2qayb000572",
    "mando-philips-398gr08bephn0019cr",
    "mando-aa5900582a-samsung",
    "mando-aa59-00602a-samsung",
    "mando-samsung-bn59-01014a",
    "mando-bn59-01199f-samsung",
    "mando-bn59-01199g-samsung",
    "mando-blanco-bn59-01259b-samsung",
    "samsung-bn59-01259b-funda-azul-lum",
    "samsung-bn59-01259b-funda-negra",
    "samsung-bn59-01259b-funda-verde-lum",
    "mando-bn5901259b-samsung",
    "mando-bn59-01301a-samsung",
    "samsung-bn59-01358d",
    "mando-samsung-bn59-01385a-solar",
    "samsung-funda-verde-lum",
    "samsung-smtv-funda-azul-lum",
    "samsung-smtv-funda-verde-lum",
    "mando-a-distancia-compatible-sony-rm-ed052",
    "mando-sony-rm-ed054",
    "mando-sony-rmt-tx200e",
    "mando-toshiba-ct-90326",
    "mando-xiaomi-xmrm-006",
    "xiaomi-xmrm-006-funda-azul-lum",
    "mando-xmrm-010-xiaomi",
    "xiaomi-xmrm-19",
    "mando-chromecast"
];

const site = "https://octopuscontrol.com";

export const GET: APIRoute = async () => {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages.map((page) => `
  <url>
    <loc>${site}/${page}</loc>
    <changefreq>daily</changefreq>
    <priority>${page === '' ? '1.0' : '0.8'}</priority>
  </url>
  `).join('')}
  ${productSlugs.map((slug) => `
  <url>
    <loc>${site}/products/${slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  `).join('')}
</urlset>`;

    return new Response(sitemap, {
        headers: {
            "Content-Type": "application/xml",
        },
    });
};
