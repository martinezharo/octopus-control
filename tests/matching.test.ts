import { describe, it, expect } from 'vitest';
import { codeTokens, colorKey, detectKind, matchProduct, primaryCode, titleKey, tokenize } from '../src/lib/catalog/matching';
import snapshot from '../src/data/productos.json';

/**
 * These tests are built on the real catalog of octopuscontrol.com, because the
 * whole risk of this migration is that a slug fails to line up with Fewya and a
 * ranked URL silently loses its content.
 */

type Remote = { slug: string; title: string };

/** How Fewya slugifies: from the title, always `mando-<marca>-<modelo>`. */
function fewya(title: string): Remote {
    const slug = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    return { slug, title };
}

describe('tokenize', () => {
    it('drops noise words and normalises spelling variants', () => {
        expect(tokenize('Mando a distancia compatible LG')).toEqual(['lg']);
        expect(tokenize('Funda Mando LG Azul Luminiscente')).toEqual(['funda', 'lg', 'azul', 'luminiscente']);
        expect(tokenize('lg-mr15-20-funda-azul-lum')).toEqual(['lg', 'mr15', '20', 'funda', 'azul', 'luminiscente']);
    });
});

describe('detectKind', () => {
    it('separates remotes from cases', () => {
        expect(detectKind('Mando LG AKB75675304')).toBe('mando');
        expect(detectKind('lg-funda-azul-lum')).toBe('funda');
        expect(detectKind('Funda Mando LG Azul')).toBe('funda');
    });
});

describe('codeTokens', () => {
    it('makes hyphenation inside a model reference irrelevant', () => {
        expect(primaryCode('samsung-bn59-01358d')).toBe(primaryCode('Mando Samsung BN59-01358D'));
    });

    it('keeps model families with a shared prefix apart', () => {
        expect(primaryCode('Mando Samsung BN59-01358D')).not.toBe(primaryCode('Mando Samsung BN59-01259B'));
    });

    it('ignores short pure-digit tokens that carry no identity', () => {
        expect(codeTokens('Mando Fire TV 2a Generación').size).toBe(0);
    });
});

describe('matchProduct — real slugs against Fewya-style slugs', () => {
    it.each([
        // The one pairing verified against the live Fewya database.
        ['lg-akb75675304', 'Mando LG AKB75675304', 'Mando LG AKB75675304'],
        // Brand/model order flipped between the two catalogs.
        ['mando-akb69680403-lg', 'Mando LG AKB69680403', 'Mando LG AKB69680403'],
        ['mando-akb73756504-lg', 'Mando LG AKB73756504', 'Mando LG AKB73756504'],
        // Model code hyphenated on one side only.
        ['mando-aa5900582a-samsung', 'Mando Samsung AA59-00582A', 'Mando Samsung AA59-00582A'],
        ['samsung-bn59-01358d', 'Mando Samsung BN59-01358D', 'Mando Samsung BN59-01358D'],
        // Long alphanumeric references.
        ['mando-philips-398gr08bephn0019cr', 'Mando PHILIPS 398GR08BEPHN0019CR', 'Mando Philips 398GR08BEPHN0019CR'],
        ['mando-toshiba-ct-90326', 'Mando Toshiba CT-90326', 'Mando Toshiba CT-90326'],
        ['mando-hisense-en2a30', 'Mando Hisense EN2A30', 'Mando Hisense EN2A30'],
        // Extra descriptive words on the Fewya side.
        ['mando-lg-mr24ga', 'Mando LG MR24GA con Micrófono y Puntero', 'Mando LG MR24GA'],
        ['mando-lg-magic-remote-an-mr600', 'Mando LG AN-MR600 con Micrófono y Puntero', 'Mando LG AN-MR600'],
        ['mando-samsung-bn59-01385a-solar', 'Mando Samsung BN59-01385A Solar', 'Mando Samsung BN59-01385A Solar'],
    ])('matches %s', (slug, localTitle, remoteTitle) => {
        const catalog = [fewya(remoteTitle)];
        const result = matchProduct({ slug, title: localTitle }, catalog);
        expect(result?.candidate.title).toBe(remoteTitle);
    });

    it('matches products with no model code by their token signature', () => {
        const catalog = [fewya('Mando para Chromecast')];
        const result = matchProduct({ slug: 'mando-chromecast', title: 'Mando para Chromecast' }, catalog);
        expect(result?.strategy).toBe('title-tokens');
    });

    it('prefers an exact slug when both catalogs agree', () => {
        const catalog = [{ slug: 'mando-hisense-en2b27', title: 'Mando Hisense EN2B27' }];
        const result = matchProduct({ slug: 'mando-hisense-en2b27', title: 'Mando Hisense EN2B27' }, catalog);
        expect(result?.strategy).toBe('exact-slug');
    });
});

describe('matchProduct — refuses to guess', () => {
    const cases = [
        fewya('Mando Xiaomi XMRM-006'),
        fewya('Funda Mando XMRM-006 Azul Luminiscente'),
        fewya('Mando Samsung BN59-01259B Blanco'),
        fewya('Funda Samsung BN59-01259B Azul'),
        fewya('Funda Samsung BN59-01259B Verde Luminiscente'),
    ];

    it('never matches a remote to its case, despite the shared model code', () => {
        const remote = matchProduct({ slug: 'mando-xiaomi-xmrm-006', title: 'Mando Xiaomi XMRM-006' }, cases);
        expect(remote?.candidate.title).toBe('Mando Xiaomi XMRM-006');

        const cover = matchProduct(
            { slug: 'xiaomi-xmrm-006-funda-azul-lum', title: 'Funda Mando XMRM-006 Azul Luminiscente' },
            cases
        );
        expect(cover?.candidate.title).toBe('Funda Mando XMRM-006 Azul Luminiscente');
    });

    it('keeps colour variants of the same model apart', () => {
        const blue = matchProduct(
            { slug: 'samsung-bn59-01259b-funda-azul-lum', title: 'Funda Samsung BN59-01259B Azul' },
            cases
        );
        expect(blue?.candidate.title).toBe('Funda Samsung BN59-01259B Azul');

        const green = matchProduct(
            { slug: 'samsung-bn59-01259b-funda-verde-lum', title: 'Funda Samsung BN59-01259B Verde Luminiscente' },
            cases
        );
        expect(green?.candidate.title).toBe('Funda Samsung BN59-01259B Verde Luminiscente');
    });

    it('returns null instead of picking one of two equally plausible candidates', () => {
        const ambiguous = [fewya('Mando LG MR20GA'), fewya('Mando LG MR20GA Magic Remote')];
        const result = matchProduct({ slug: 'mando-mr20ga-lg-magic', title: 'Mando LG MR20GA con Micrófono y Puntero' }, ambiguous);
        expect(result).toBeNull();
    });

    it('does not match two models that only share a family prefix', () => {
        // Caught for real: the retired AA59-00602A was pairing with AA59-00582A
        // because both decompose to a fragment `aa59`. A retired product pointing
        // at a different model is exactly the failure this must never allow.
        const result = matchProduct(
            { slug: 'mando-aa59-00602a-samsung', title: 'Mando Samsung AA59-00602A' },
            [fewya('Mando Samsung AA59-00582A')]
        );
        expect(result).toBeNull();
    });

    it('still matches when only the hyphenation of the model differs', () => {
        const result = matchProduct(
            { slug: 'mando-aa5900582a-samsung', title: 'Mando Samsung AA59-00582A' },
            [fewya('Mando Samsung AA59-00582A')]
        );
        expect(result?.candidate.title).toBe('Mando Samsung AA59-00582A');
    });

    it('returns null when nothing resembles the product', () => {
        const result = matchProduct(
            { slug: 'mando-lg-akb75095308', title: 'Mando LG AKB75095308' },
            [fewya('Mando Samsung BN59-01358D')]
        );
        expect(result).toBeNull();
    });
});

describe('matchProduct — overrides', () => {
    const catalog = [fewya('Mando Xiaomi XMRM-19'), fewya('Mando Xiaomi XMRM-010')];

    it('honours a manual pin over every heuristic', () => {
        const result = matchProduct(
            { slug: 'xiaomi-xmrm-19', title: 'Mando Xiaomi XMRM-19' },
            catalog,
            { 'xiaomi-xmrm-19': 'mando-xiaomi-xmrm-010' }
        );
        expect(result?.strategy).toBe('override');
        expect(result?.candidate.title).toBe('Mando Xiaomi XMRM-010');
    });

    it('does not fall back to a fuzzy match when a pin points at a missing product', () => {
        const result = matchProduct(
            { slug: 'xiaomi-xmrm-19', title: 'Mando Xiaomi XMRM-19' },
            catalog,
            { 'xiaomi-xmrm-19': 'producto-que-ya-no-existe' }
        );
        expect(result).toBeNull();
    });
});

describe('the live catalog', () => {
    const productos = snapshot as { slug: string; titulo: string }[];

    it('has no duplicate slugs', () => {
        const slugs = productos.map(p => p.slug);
        expect(new Set(slugs).size).toBe(slugs.length);
    });

    it('resolves every product when Fewya mirrors it under its own convention', () => {
        // Simulates the realistic worst case: Fewya re-slugified every title.
        const catalog = productos.map(p => fewya(p.titulo));
        const unmatched = productos.filter(
            p => matchProduct({ slug: p.slug, title: p.titulo }, catalog) === null
        );

        expect(unmatched.map(p => p.slug)).toEqual([]);
    });

    it('maps every product to its own counterpart, never to a different one', () => {
        const catalog = productos.map(p => fewya(p.titulo));
        for (const p of productos) {
            const result = matchProduct({ slug: p.slug, title: p.titulo }, catalog);
            expect(result?.candidate.title, `${p.slug} matched the wrong product`).toBe(p.titulo);
        }
    });
});

describe('key helpers', () => {
    it('builds order-independent title signatures', () => {
        expect(titleKey('Mando LG AKB69680403')).toBe(titleKey('AKB69680403 LG Mando'));
    });

    it('reads the colour family regardless of spelling', () => {
        expect([...colorKey('funda-azul-lum')]).toEqual(['azul']);
        expect([...colorKey('Funda Mando Fire TV Negra')]).toEqual(['negro']);
    });
});
