# Lessons & Known Issues

## npm audit — Remaining Vulnerabilities (2026-03-03)

`npm audit fix` resolved 6 of 11 vulnerabilities (axios, devalue, diff, minimatch, rollup, tar).

5 vulnerabilities remain. All are in the **astro/esbuild/vite** dependency chain and require a major version bump (`astro@5.18.0`, `@astrojs/vercel@9.0.4`) that `npm audit fix --force` would install. These are **breaking changes** and should be handled as a planned framework upgrade, not a patch fix.

### Unfixable without breaking changes

| Package | Installed | Fixed In | Severity | Issue |
|---------|-----------|----------|----------|-------|
| **astro** | <=5.15.8 | 5.18.0 | **high** | 7 CVEs: X-Forwarded-Host reflection, URL manipulation bypass, reflected XSS (server islands), dev server file read, Cloudflare XSS, middleware auth bypass, double URL encoding bypass |
| **esbuild** | <=0.24.2 | >0.24.2 | moderate | Dev server allows any website to send requests and read responses |
| **vite** | 0.11.0–6.1.6 | >6.1.6 | moderate | Depends on vulnerable esbuild |
| **@astrojs/vercel** | <=8.0.8 | 9.0.4 | moderate | Depends on vulnerable astro + esbuild |
| **@astrojs/react** | 3.6.3-beta.0–3.7.0-beta.1 | >3.7.0 | moderate | Depends on vulnerable vite |

### Risk Assessment

- The **astro** CVEs around middleware auth bypass, URL manipulation, and XSS are mostly relevant to apps with server-side authentication middleware or the server islands feature. This site uses Astro in `hybrid` mode with simple API routes — no middleware-based auth, no server islands.
- The **esbuild** and **vite** issues only affect the dev server, not production builds.
- The **Cloudflare adapter XSS** is irrelevant (we deploy to Vercel, not Cloudflare).

### Recommended Action

Plan a dedicated Astro 5.18+ upgrade sprint:
1. Review Astro 5.16–5.18 changelogs for breaking changes
2. Update `astro`, `@astrojs/vercel`, `@astrojs/react` together
3. Run full test suite after upgrade
4. Verify Vercel deployment works with new adapter version
