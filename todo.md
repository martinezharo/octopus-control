# Octopus Control — TODO

## Remaining from the 2026-07-31 testing pass

The `--check` feed guard and the `astro check` build gate are done (PR #3).
Still open:

- [x] **Build smoke test.** The built `dist/` asserts one page per
      product, withdrawn products keeping a URL that does not 404, and the
      sitemap containing only `isIndexable` entries. The build is static, so
      this is a matter of reading `dist/` after `pnpm build` — no browser needed.
- [x] **ESLint.** The flat config and lint script are part of the build gate,
      next to `astro check` and the static build smoke suite.
