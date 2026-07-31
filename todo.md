# Octopus Control — TODO

## Remaining from the 2026-07-31 testing pass

The `--check` feed guard and the `astro check` build gate are done (PR #3).
Still open:

- [ ] **Build smoke test.** Assert against the built `dist/`: one page per
      product, withdrawn products keeping a URL that does not 404, and the
      sitemap containing only `isIndexable` entries. The build is static, so
      this is a matter of reading `dist/` after `pnpm build` — no browser needed.
- [ ] **ESLint.** There is no config in the repo at all. Adding one comes with
      its own diff of fixes, which is why it was kept out of PR #3; once it
      exists it belongs in the build next to `astro check`.
