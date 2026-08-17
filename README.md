# Octopus Control

[Open the storefront](https://octopuscontrol.com)

Octopus Control is a static Astro storefront for remote controls and related
accessories. It publishes product pages, browsing and filtering, and links
buyable products to Fewya for checkout; payment is not handled in this repo.

## What is distinctive

- The build reads Fewya's public catalog for titles, descriptions, images,
  prices, and availability.
- The local snapshot and catalog registry own this site's URL space, so sold-out,
  unlisted, and intentionally retired product URLs can remain available instead
  of becoming 404s.
- The catalog supports category/brand filtering, availability filtering, and
  price/title sorting, with static product pages and responsive layouts.
- A failed Fewya request does not blank the site: the build falls back to the
  optional committed feed cache and then to the frozen local snapshot. In that
  degraded mode, stock and prices may be stale or unavailable.

## Stack

Astro with static output, TypeScript, vanilla CSS, Vitest, pnpm, and Cloudflare
Pages.

## Development

Requires Node.js and pnpm.

```sh
pnpm install
pnpm dev
pnpm check
pnpm lint
pnpm test
pnpm test:build-smoke
pnpm build
pnpm preview
```

`pnpm build` runs the Astro check, lint, static build, and build smoke tests.

## Catalog operations

The production feed defaults to `https://fewya.com` and the
`octopus-control` shop; no environment variables are required for the normal
build. To refresh or check the optional committed cache:

```sh
pnpm sync:catalog
pnpm sync:catalog --check
```

Use [`docs/catalog-sync.md`](docs/catalog-sync.md) before changing catalog
matching, snapshots, registry entries, or retired URLs.

## Deployment

```sh
pnpm deploy       # build, then deploy dist/ to Cloudflare Pages
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) and the [MIT license](LICENSE).
