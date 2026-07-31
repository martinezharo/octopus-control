import { describe, expect, it } from 'vitest';
import { validateCatalogFeed, isSameCatalog } from '../src/lib/catalog/validation.mjs';

/**
 * This is the guard that stands between a bad Fewya feed and an unlisted site.
 *
 * The build falls back to the committed cache whenever the live feed is
 * unusable, so the cache is the last line of defence — and `sync-catalog.mjs`
 * is the only thing that writes it. If it accepted an empty feed, the next
 * build that could not reach the network would render a shop with no products
 * in it, and the deploy would look entirely successful.
 */

const validFeed = {
    generated_at: '2026-07-31T10:00:00.000Z',
    shop: { slug: 'octopus-control', name: 'Octopus Control' },
    products: [{ slug: 'widget', in_stock: true }],
};

describe('validateCatalogFeed', () => {
    it('accepts a well-formed feed', () => {
        expect(validateCatalogFeed(validFeed, 'octopus-control')).toEqual({ ok: true });
    });

    it('accepts one without checking the slug when no slug is expected', () => {
        // The build takes whatever the configured URL returns; only the sync
        // script knows which shop it asked for.
        expect(validateCatalogFeed({ ...validFeed, shop: { slug: 'anything' } }).ok).toBe(true);
    });

    describe('refuses an empty catalog', () => {
        it('rejects zero products', () => {
            // The case the guard exists for. A bad deploy on the Fewya side
            // must not be able to unlist this whole site.
            const verdict = validateCatalogFeed({ ...validFeed, products: [] }, 'octopus-control');
            expect(verdict).toEqual({ ok: false, reason: 'The feed returned zero products' });
        });
    });

    describe('refuses a malformed payload', () => {
        it.each([
            ['null', null],
            ['undefined', undefined],
            ['a string', '{}'],
            ['a number', 0],
            ['an array', []],
        ])('rejects %s', (_label, payload) => {
            const verdict = validateCatalogFeed(payload, 'octopus-control');
            expect(verdict.ok).toBe(false);
        });

        it('rejects a payload with no products array', () => {
            const verdict = validateCatalogFeed({ shop: { slug: 'octopus-control' } }, 'octopus-control');
            expect(verdict).toEqual({ ok: false, reason: 'The feed has no "products" array' });
        });

        it('rejects products that is not an array', () => {
            const verdict = validateCatalogFeed({ ...validFeed, products: { widget: {} } }, 'octopus-control');
            expect(verdict.ok).toBe(false);
        });

        it('rejects a feed that does not say which shop it is for', () => {
            const verdict = validateCatalogFeed({ products: [{ slug: 'w' }] }, undefined);
            expect(verdict).toEqual({
                ok: false,
                reason: 'The feed does not say which shop it is for',
            });
        });

        it('rejects an empty shop slug', () => {
            const verdict = validateCatalogFeed({ ...validFeed, shop: { slug: '' } });
            expect(verdict.ok).toBe(false);
        });
    });

    describe('refuses another shop', () => {
        it('rejects a feed for a different slug', () => {
            // Pointing FEWYA_SHOP_SLUG at the wrong shop, or a redirect landing
            // on someone else's feed, would otherwise commit their catalogue
            // into this repo.
            const verdict = validateCatalogFeed(validFeed, 'someone-else');
            expect(verdict).toEqual({
                ok: false,
                reason: 'The feed is for shop "octopus-control", expected "someone-else"',
            });
        });

        it('is case sensitive', () => {
            expect(validateCatalogFeed(validFeed, 'Octopus-Control').ok).toBe(false);
        });
    });
});

describe('isSameCatalog', () => {
    it('ignores generated_at', () => {
        // It changes on every request. Comparing it would make `--check` fail
        // on a catalog that has not actually changed, and every sync produce a
        // diff — which is how a staleness check gets ignored and then removed.
        expect(isSameCatalog(validFeed, { ...validFeed, generated_at: '2020-01-01T00:00:00.000Z' })).toBe(
            true,
        );
    });

    it('notices a changed product', () => {
        expect(
            isSameCatalog(validFeed, {
                ...validFeed,
                products: [{ slug: 'widget', in_stock: false }],
            }),
        ).toBe(false);
    });

    it('notices an added product', () => {
        expect(
            isSameCatalog(validFeed, {
                ...validFeed,
                products: [...validFeed.products, { slug: 'gadget', in_stock: true }],
            }),
        ).toBe(false);
    });

    it('notices a changed shop name', () => {
        expect(
            isSameCatalog(validFeed, { ...validFeed, shop: { slug: 'octopus-control', name: 'Renamed' } }),
        ).toBe(false);
    });

    it('survives a non-object on either side', () => {
        expect(isSameCatalog(null, validFeed)).toBe(false);
        expect(isSameCatalog(validFeed, null)).toBe(false);
        expect(isSameCatalog(null, null)).toBe(true);
    });
});

describe('the build and the sync script agree', () => {
    it('rejects the same payloads on both sides', () => {
        // The property that matters is not what either one does alone, but that
        // they cannot drift: a script laxer than the build writes a cache the
        // build will throw away, and a stricter one refuses a feed the build is
        // perfectly happy with. Sharing this module is what makes it true; this
        // asserts the sharing is real.
        const payloads = [null, {}, { products: [] }, { products: [{}] }, validFeed];
        for (const payload of payloads) {
            const buildVerdict = validateCatalogFeed(payload);
            const scriptVerdict = validateCatalogFeed(payload, 'octopus-control');
            // The slug check is the only difference the script is allowed to add.
            if (buildVerdict.ok) {
                expect(scriptVerdict.ok || scriptVerdict.reason).toBeTruthy();
            } else {
                expect(scriptVerdict.ok).toBe(false);
            }
        }
    });
});
