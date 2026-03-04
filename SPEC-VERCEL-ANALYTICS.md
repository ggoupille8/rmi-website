# SPEC: Enable Vercel Analytics & Speed Insights

## CONTEXT

The RMI website (rmi-llc.net) is deployed on Vercel Hobby (free) but has two free Vercel features disabled: **Analytics** (visitor/pageview tracking) and **Speed Insights** (real Core Web Vitals from actual users). Both are free on Hobby tier with 10K data points/month included.

Enabling these will:
- Provide real visitor data alongside GA4
- Feed Core Web Vitals data to Google Search Console (which currently shows "not enough data")
- Give performance metrics (FCP, LCP, INP, CLS) from real user sessions
- Zero cost, minimal code change

The project uses **Astro 4** with React islands. Vercel auto-detected the Astro framework on the Analytics setup page.

## TASK 1: Install Vercel Packages

### Problem
`@vercel/analytics` and `@vercel/speed-insights` are not installed.

### Files
- `frontend/package.json`

### Approach
```bash
cd frontend
npm install @vercel/analytics @vercel/speed-insights
```

### Verification
- `package.json` includes both packages in `dependencies`
- `npm ls @vercel/analytics` and `npm ls @vercel/speed-insights` return versions without errors

## TASK 2: Add Analytics Component to Base Layout

### Problem
Vercel Analytics requires an `<Analytics />` Astro component in the base layout to track page views.

### Files
- `frontend/src/layouts/BaseLayout.astro`

### Approach
1. Import the Astro analytics component at the top of BaseLayout.astro:
   ```astro
   ---
   import { Analytics } from '@vercel/analytics/astro';
   ---
   ```
2. Add `<Analytics />` just before the closing `</body>` tag (after all other scripts/components).

### What NOT to Change
- Do not modify any existing content, scripts, or meta tags in BaseLayout.astro
- Do not add any configuration options — the defaults are correct
- Do not touch any other layout or page files

### Verification
- `npm run build` passes without errors
- The built HTML output includes the Vercel analytics script tag
- No TypeScript errors

## TASK 3: Add Speed Insights Component to Base Layout

### Problem
Vercel Speed Insights requires a `<SpeedInsights />` component to collect Core Web Vitals from real users.

### Files
- `frontend/src/layouts/BaseLayout.astro`

### Approach
1. Import the Astro speed insights component (add to existing imports):
   ```astro
   ---
   import { SpeedInsights } from '@vercel/speed-insights/astro';
   ---
   ```
2. Add `<SpeedInsights />` right after the `<Analytics />` component, just before `</body>`.

### What NOT to Change
- Same as Task 2 — only add the import and component, nothing else
- Do not remove or reorder existing elements

### Verification
- `npm run build` passes without errors
- The built HTML output includes both Vercel analytics and speed insights script tags
- No TypeScript errors

## TASK 4: Verify Production Build & Tests

### Problem
Need to confirm the additions don't break anything.

### Approach
1. Run `npm run build` from the project root — must pass
2. Run `npm run test` — all existing tests must still pass
3. If any visual regression tests fail due to the new script tags being injected, update baselines with `npm run test:visual:update`

### Verification
- Build: zero errors
- Tests: all passing (or baselines updated if visual-only changes)

## EXECUTION ORDER

1. **Task 1** — Install packages (dependency for everything else)
2. **Task 2** — Add Analytics component
3. **Task 3** — Add Speed Insights component
4. **Task 4** — Build verification and test suite

## GIT WORKFLOW

- **Branch:** `feat/vercel-analytics`
- **Commit message:** `feat: enable Vercel Analytics and Speed Insights`
- **Merge policy:** Do NOT merge to main. Push feature branch only. Graham will review and merge.

## DEFINITION OF DONE

- [ ] `@vercel/analytics` and `@vercel/speed-insights` in `frontend/package.json`
- [ ] `<Analytics />` component in BaseLayout.astro before `</body>`
- [ ] `<SpeedInsights />` component in BaseLayout.astro before `</body>`
- [ ] `npm run build` passes with zero errors
- [ ] `npm run test` passes (baselines updated if needed)
- [ ] All changes on `feat/vercel-analytics` branch, NOT merged to main
- [ ] Summary written to `tasks/todo.md`

## CLAUDE CODE PROMPT

```
Read the file `SPEC-VERCEL-ANALYTICS.md` in the project root directory. This is a detailed spec for enabling Vercel Analytics and Speed Insights on the Astro site. Execute all tasks in order, verify each passes its criteria, and follow the git workflow at the bottom (feature branch, do NOT merge to main). Write a summary of all changes to `tasks/todo.md` when complete.
```
