/**
 * Slug reconciliation between this site and Fewya.
 *
 * The two catalogs grew apart: this site uses several slug conventions at once
 * (`lg-akb75675304`, `mando-lg-akb74915324`, `mando-akb69680403-lg`,
 * `mando-aa5900582a-samsung`) while Fewya slugs are generated from the product
 * title. Matching on slug equality alone would silently orphan most products,
 * so we derive comparable keys instead.
 *
 * Guiding rule: **a wrong match is worse than no match**. An unmatched product
 * keeps its snapshot content and its URL; a wrongly matched one shows another
 * product's price and images and sends buyers to the wrong listing. Every
 * heuristic here is therefore gated on the product kind, and any ambiguity
 * (two or more equally good candidates) is rejected rather than guessed.
 */

/** Words that carry no identity: pure noise for matching purposes. */
const STOPWORDS = new Set([
    'mando', 'mandos', 'control', 'remoto', 'remote', 'distancia',
    'para', 'de', 'del', 'la', 'el', 'los', 'las', 'con', 'y', 'a',
    'compatible', 'original', 'nuevo', 'nueva', 'estrenar',
    'tv', 'television', 'televisor', 'smart', 'smarttv', 'smtv',
]);

/**
 * Colours DO carry identity: a blue case and a green case of the same model are
 * different products. Gendered spellings collapse onto one family.
 *
 * `luminiscente` is deliberately NOT a colour: almost every case is luminescent,
 * so treating it as one would make green and blue look like a partial match.
 */
const COLOR_FAMILIES: Record<string, string> = {
    azul: 'azul',
    negra: 'negro', negro: 'negro',
    verde: 'verde',
    rosa: 'rosa',
    fucsia: 'fucsia',
    morada: 'morado', morado: 'morado',
    blanca: 'blanco', blanco: 'blanco',
    roja: 'rojo', rojo: 'rojo',
    gris: 'gris',
    amarilla: 'amarillo', amarillo: 'amarillo',
};

/** Token spelling variants normalised to one form. */
const SYNONYMS: Record<string, string> = {
    lum: 'luminiscente',
    luminiscentes: 'luminiscente',
    generacion: 'gen',
    gen: 'gen',
    '1era': '1',
    '1a': '1',
    '2a': '2',
    '3a': '3',
    '3th': '3',
    '1st': '1',
    '2nd': '2',
    amz: 'amazon',
    ftv: 'firetv',
    fire: 'fire',
};

/** Product families that must never be matched against each other. */
export type ProductKind = 'mando' | 'funda' | 'otro';

export function detectKind(text: string): ProductKind {
    const t = stripAccents(text.toLowerCase());
    if (/\bfunda/.test(t) || /(^|-)funda(-|$)/.test(t)) return 'funda';
    if (/\bmando|control remoto|(^|-)mando(-|$)/.test(t)) return 'mando';
    return 'otro';
}

export function stripAccents(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Splits any text (title or slug) into normalised, meaningful tokens. */
export function tokenize(text: string): string[] {
    return stripAccents(text.toLowerCase())
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .map(tok => SYNONYMS[tok] ?? tok)
        .filter(tok => !STOPWORDS.has(tok));
}

/**
 * Model-code fingerprint: the set of identifier-looking tokens in the text,
 * plus their concatenation.
 *
 * A model reference gets hyphenated inconsistently across the two catalogs
 * (`bn59-01259b`, `bn5901259b`, `aa59-00582a`, `aa5900582a`), so both the
 * fragments and the joined form are emitted and two products are considered
 * the same model when their fingerprints intersect. Using a set rather than a
 * single string keeps the comparison independent of word order, which matters
 * because this site writes both `mando-lg-akb74915324` and
 * `mando-akb69680403-lg`.
 *
 * Short pure-digit tokens ("2" from "2a generación") are excluded: they carry
 * no identity and would match everything.
 */
export function codeTokens(text: string): Set<string> {
    const codes = tokenize(text).filter(tok => (/\d/.test(tok) && /[a-z]/.test(tok)) || /^\d{3,}$/.test(tok));
    return new Set(codes);
}

/**
 * Single comparable string for a model reference: every distinct code fragment,
 * deduplicated, sorted and joined. Two products sharing only a family prefix
 * (`bn59` in both BN59-01358D and BN59-01259B) get different primary codes,
 * which is what keeps them apart.
 */
export function primaryCode(text: string): string {
    return [...codeTokens(text)].sort().join('');
}

/**
 * True when one model reference is a decomposition of the other.
 *
 * Plain intersection is not enough: AA59-00602A and AA59-00582A share the `aa59`
 * family prefix and would match, silently pointing a retired remote at a
 * different model. Requiring containment means the only accepted difference is
 * how the reference was split — `{aa5900582a, aa59, 00582a}` against
 * `{aa59, 00582a}` — never a differing fragment.
 */
function isDecompositionOf(a: Set<string>, b: Set<string>): boolean {
    if (a.size === 0 || b.size === 0) return false;
    const [small, large] = a.size <= b.size ? [a, b] : [b, a];
    for (const value of small) {
        if (!large.has(value)) return false;
    }
    return true;
}

/** Colour families mentioned in the text, order-independent. */
export function colorKey(text: string): Set<string> {
    const colors = tokenize(text)
        .map(tok => COLOR_FAMILIES[tok])
        .filter(Boolean);
    return new Set(colors);
}

/**
 * How two colour sets relate.
 *
 * `weak` (one side says nothing about colour) is not treated as a match on its
 * own: it only survives when no `strong` candidate exists, so an explicit
 * colour always wins over silence.
 */
type ColorCompat = 'strong' | 'weak' | 'incompatible';

function colorCompat(a: Set<string>, b: Set<string>): ColorCompat {
    if (a.size === 0 || b.size === 0) return 'weak';
    for (const color of a) {
        if (b.has(color)) return 'strong';
    }
    return 'incompatible';
}

/**
 * Order-independent token signature of a title.
 * Handles this site's inconsistent brand/model ordering
 * (`mando-lg-akb69680403` vs `mando-akb69680403-lg`).
 */
export function titleKey(text: string): string {
    return [...new Set(tokenize(text))].sort().join('-');
}

export interface MatchCandidate {
    slug: string;
    title: string;
}

export interface MatchInput {
    /** Slug on this site. */
    slug: string;
    /** Title on this site. */
    title: string;
}

export type MatchStrategy = 'override' | 'exact-slug' | 'model-code' | 'title-tokens';

export interface MatchResult<T extends MatchCandidate> {
    candidate: T;
    strategy: MatchStrategy;
}

/** Builds the comparable signature of a product from its slug and title. */
function signature(slug: string, title: string) {
    // Slug and title are both used: the slug may carry a model code the title
    // abbreviates, and vice versa.
    const combined = `${slug} ${title}`;
    return {
        kind: detectKind(combined),
        codes: codeTokens(combined),
        primary: primaryCode(combined),
        colors: colorKey(combined),
        titleTokens: titleKey(title),
    };
}

/**
 * Resolves one local product against the Fewya catalog.
 *
 * @param overrides Manual pins (local slug -> Fewya slug); always win.
 * @returns The match, or null when nothing matched or the result was ambiguous.
 */
export function matchProduct<T extends MatchCandidate>(
    local: MatchInput,
    candidates: T[],
    overrides: Record<string, string> = {}
): MatchResult<T> | null {
    // 1. Manual override — the escape hatch for anything the heuristics get wrong.
    const pinned = overrides[local.slug];
    if (pinned) {
        const candidate = candidates.find(c => c.slug === pinned);
        if (candidate) return { candidate, strategy: 'override' };
        // A pin pointing at a product that no longer exists must not silently
        // fall through to a fuzzy match on a different product.
        return null;
    }

    // 2. Exact slug — free and unambiguous.
    const exact = candidates.find(c => c.slug === local.slug);
    if (exact) return { candidate: exact, strategy: 'exact-slug' };

    const localSig = signature(local.slug, local.title);
    const sigs = new Map(candidates.map(c => [c, signature(c.slug, c.title)] as const));

    // A remote is never a case, and a blue case is never a green one.
    const sameFamily = candidates.filter(c => {
        const sig = sigs.get(c)!;
        return sig.kind === localSig.kind && colorCompat(localSig.colors, sig.colors) !== 'incompatible';
    });

    /**
     * Reduces a candidate list to a single answer, or gives up.
     *
     * Colour is only a tie-breaker here, never a pre-filter: the model code is a
     * far stronger identity signal, and filtering by colour first would let
     * "Funda Fire TV Negra" outrank "Funda LG MR15-20" for a product whose slug
     * happens to mention black.
     */
    const pick = (list: T[]): T | null => {
        if (list.length === 1) return list[0];
        if (list.length === 0) return null;
        const strong = list.filter(c => colorCompat(localSig.colors, sigs.get(c)!.colors) === 'strong');
        return strong.length === 1 ? strong[0] : null;
    };

    // 3. Model code. First on the full reference, then on any shared fragment —
    //    the two catalogs hyphenate model numbers differently, so the fragments
    //    are the fallback when the joined forms do not line up exactly.
    if (localSig.codes.size > 0) {
        const byPrimary = pick(sameFamily.filter(c => sigs.get(c)!.primary === localSig.primary));
        if (byPrimary) return { candidate: byPrimary, strategy: 'model-code' };

        const byFragment = pick(sameFamily.filter(c => isDecompositionOf(sigs.get(c)!.codes, localSig.codes)));
        if (byFragment) return { candidate: byFragment, strategy: 'model-code' };

        // A product with a model code that matched nothing must not fall through
        // to a loose title comparison: that is how a remote ends up pointing at
        // a different model of the same brand.
        return null;
    }

    // 4. Full token signature — catches products with no model code
    //    (generic "Mando para Chromecast") and reordered brand/model slugs.
    const byTitle = pick(sameFamily.filter(c => sigs.get(c)!.titleTokens === localSig.titleTokens));
    if (byTitle) return { candidate: byTitle, strategy: 'title-tokens' };

    return null;
}
