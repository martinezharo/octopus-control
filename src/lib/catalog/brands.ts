/**
 * Canonical category labels.
 *
 * Categories arrive from two places with different spellings: the frozen
 * snapshot wrote them by hand (`Lg`, `Fire TV`) while Fewya stores a free-text
 * `brand` (`LG`, `lg`). Without canonicalisation the filter panel would list
 * "Lg" and "LG" as two separate categories holding half the catalog each.
 */
const CANONICAL: Record<string, string> = {
    lg: 'LG',
    jvc: 'JVC',
    chiq: 'CHiQ',
    sony: 'Sony',
    samsung: 'Samsung',
    xiaomi: 'Xiaomi',
    philips: 'Philips',
    toshiba: 'Toshiba',
    hisense: 'Hisense',
    panasonic: 'Panasonic',
    tcl: 'TCL',
    hitachi: 'Hitachi',
    grundig: 'Grundig',
    chromecast: 'Chromecast',
    google: 'Chromecast',
    'fire tv': 'Fire TV',
    firetv: 'Fire TV',
    amazon: 'Fire TV',
    'amazon fire tv': 'Fire TV',
};

export function canonicalCategoria(raw: string | null | undefined): string | null {
    const value = raw?.trim();
    if (!value) return null;

    const known = CANONICAL[value.toLowerCase()];
    if (known) return known;

    // Unknown brand: title-case it so it at least renders consistently.
    return value
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
