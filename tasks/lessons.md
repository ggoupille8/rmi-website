# Lessons & Known Issues

## Astro 4 → 5 Upgrade (2026-03-03)

### What worked
- The upgrade was straightforward — the RMI site doesn't use content collections, MDX, or server islands, which are the major breaking change areas.
- `npx @astrojs/upgrade` equivalent manual install resolved cleanly: `astro@5.18.0`, `@astrojs/react@4.4.2`, `@astrojs/vercel@9.0.4`, `@astrojs/sitemap@3.7.0`, `@astrojs/tailwind@6.0.2`.
- `@astrojs/tailwind@6.0.2` still uses Tailwind CSS v3 — no Tailwind v4 migration needed.

### Breaking changes encountered
1. **`output: "hybrid"` removed** — Astro 5 merges hybrid and static modes. Simply delete the line.
2. **Vercel adapter import path** — `@astrojs/vercel/serverless` → `@astrojs/vercel`.
3. **`runtime` option removed** — The `vercel({ runtime: "nodejs20.x" })` option no longer exists in v9. Just use `vercel()`.

### Pre-existing issues surfaced by `astro check`
- `backgroundImage` prop passed to HeroFullWidth but not in its interface (removed unused prop).
- `webkitBackdropFilter` vendor prefix not on CSSStyleDeclaration type (fixed with double cast through `unknown`).
- 18 hints (unused variables) — all pre-existing, not introduced by the upgrade.

### npm audit — Remaining Vulnerabilities (post-upgrade)

The Astro 4 → 5 upgrade resolved the original 5 Astro-pinned vulnerabilities (astro, esbuild, vite, @astrojs/vercel, @astrojs/react).

3 new vulnerabilities remain in `path-to-regexp` via `@vercel/routing-utils` via `@astrojs/vercel@9.0.4`. These cannot be fixed without `npm audit fix --force` (which would downgrade `@astrojs/vercel` to 8.0.4).

| Package | Severity | Issue |
|---------|----------|-------|
| **path-to-regexp** 4.0.0–6.2.2 | high | Backtracking regular expressions (ReDoS) |
| **@vercel/routing-utils** <=3.1.0 or >=5.0.0 | high | Depends on vulnerable path-to-regexp |
| **@astrojs/vercel** >=8.0.5 | high | Depends on vulnerable @vercel/routing-utils |

**Risk:** Low for this project. `path-to-regexp` ReDoS requires attacker-controlled route patterns, which don't exist in this static site with fixed routes. The vulnerability is in a build-time/deployment dependency, not in runtime code served to users.

### Node.js engine warnings
- `chokidar@5.0.0` and `readdirp@5.0.0` require Node >= 20.19.0, but we run 20.18.1. These are warnings only — no functional impact observed. Consider updating Node.js to 20.19+ when convenient.
