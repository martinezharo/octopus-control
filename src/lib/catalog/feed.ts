import type { FewyaCatalog } from './types';
import { validateCatalogFeed } from './validation.mjs';

/**
 * Fetches the Fewya public catalog feed at build time.
 *
 * Failure is never fatal: the build falls back to the committed cache
 * (`src/data/fewya-catalog.json`) and, failing that, to the frozen snapshot.
 * A deploy must never be able to blank the storefront because of a network
 * blip on the Cloudflare Pages builder.
 */

const FETCH_TIMEOUT_MS = 15_000;

export function feedUrl(baseUrl: string, shopSlug: string): string {
    return `${baseUrl.replace(/\/+$/, '')}/api/public/shops/${encodeURIComponent(shopSlug)}/catalog.json`;
}

/**
 * Shared with `scripts/sync-catalog.mjs`, which must refuse to cache exactly
 * what the build refuses to read. The two drifting apart is how a deploy ends
 * up running against a cache the build would have thrown away.
 */
function isUsable(payload: unknown): payload is FewyaCatalog {
    return validateCatalogFeed(payload).ok;
}

export async function fetchFewyaCatalog(baseUrl: string, shopSlug: string): Promise<FewyaCatalog | null> {
    const url = feedUrl(baseUrl, shopSlug);
    try {
        const response = await fetch(url, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });

        if (!response.ok) {
            console.warn(`[catalog] Fewya feed responded ${response.status} for ${url}`);
            return null;
        }

        const payload = await response.json();
        if (!isUsable(payload)) {
            console.warn(`[catalog] Fewya feed at ${url} was empty or malformed; ignoring it`);
            return null;
        }

        return payload;
    } catch (error) {
        console.warn(`[catalog] Could not reach the Fewya feed at ${url}:`, (error as Error).message);
        return null;
    }
}

/**
 * Last successful sync, committed to the repo by `pnpm sync:catalog`.
 * Optional by design — `import.meta.glob` resolves to an empty map when the
 * file does not exist, so a fresh clone still builds.
 */
export function loadCachedCatalog(): FewyaCatalog | null {
    const modules = import.meta.glob<{ default: unknown }>('../../data/fewya-catalog.json', { eager: true });
    const cached = Object.values(modules)[0]?.default;
    return isUsable(cached) ? cached : null;
}
