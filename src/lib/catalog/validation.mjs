/**
 * The one place that decides whether a Fewya catalog feed is usable.
 *
 * Two callers need this answer and must not be allowed to disagree about it:
 * the build (`feed.ts`), which falls back to the committed cache when the feed
 * is bad, and `scripts/sync-catalog.mjs`, which refuses to overwrite that cache
 * with a bad one. If the script were laxer than the build, a deploy could go out
 * against a cache the build itself would have rejected; if it were stricter, a
 * feed the build is perfectly happy with could not be committed.
 *
 * Plain JavaScript with JSDoc types rather than TypeScript, because the sync
 * script runs under bare `node` and has to import it without a build step.
 *
 * @typedef {{ ok: true }} Valid
 * @typedef {{ ok: false, reason: string }} Invalid
 * @typedef {Valid | Invalid} FeedVerdict
 */

/**
 * Checks a decoded feed payload.
 *
 * `expectedSlug` is optional: the build takes whatever the configured feed URL
 * returns, while the sync script knows which shop it asked for and can catch a
 * feed pointed at the wrong one.
 *
 * @param {unknown} payload
 * @param {string} [expectedSlug]
 * @returns {FeedVerdict}
 */
export function validateCatalogFeed(payload, expectedSlug) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return { ok: false, reason: 'The feed did not return a JSON object' };
    }

    const catalog = /** @type {{ products?: unknown, shop?: { slug?: unknown } }} */ (payload);

    if (!Array.isArray(catalog.products)) {
        return { ok: false, reason: 'The feed has no "products" array' };
    }

    // An empty catalog is a failed sync, not "everything was withdrawn". A bad
    // deploy on the Fewya side must never be able to unlist this whole site,
    // and overwriting a good cache with an empty one would do exactly that on
    // the next build that cannot reach the network.
    if (catalog.products.length === 0) {
        return { ok: false, reason: 'The feed returned zero products' };
    }

    if (typeof catalog.shop?.slug !== 'string' || catalog.shop.slug === '') {
        return { ok: false, reason: 'The feed does not say which shop it is for' };
    }

    if (expectedSlug !== undefined && catalog.shop.slug !== expectedSlug) {
        return {
            ok: false,
            reason: `The feed is for shop "${catalog.shop.slug}", expected "${expectedSlug}"`,
        };
    }

    return { ok: true };
}

/**
 * `generated_at` changes on every request, so it is ignored when deciding
 * whether the committed cache is stale — otherwise every sync would produce a
 * diff and `--check` would fail on a catalog that has not actually changed.
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export function isSameCatalog(a, b) {
    return JSON.stringify(stripVolatile(a)) === JSON.stringify(stripVolatile(b));
}

/**
 * @param {unknown} catalog
 * @returns {unknown}
 */
function stripVolatile(catalog) {
    if (!catalog || typeof catalog !== 'object') return catalog;
    const { generated_at: _ignored, ...rest } = /** @type {Record<string, unknown>} */ (catalog);
    return rest;
}
