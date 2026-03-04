# SPEC: Astro 4 → 5 Major Framework Upgrade

## CONTEXT

We're upgrading from Astro 4 to Astro 5 (latest stable, currently 5.18.x) while the project is small — a single landing page with ~10 components, no content collections, no MDX, no complex routing. This is the ideal time to do it before Phase 2/3 add complexity.

**Why now:** 5 npm vulnerabilities (1 high in astro itself, 4 moderate in esbuild/vite/@astrojs/vercel/@astrojs/react) are all pinned to Astro 4 and cannot be resolved without this upgrade.

**Risk assessment:** LOW. The RMI site uses Astro primarily as a static site generator with React islands. It does NOT use content collections, MDX, Shiki syntax highlighting, the Squoosh image service, or Lit components — which are the major breaking change areas in Astro 5. The upgrade should be straightforward.

---

## PRE-FLIGHT: Understand Current State

Before touching anything, run these checks and record the results:

```bash
# Record current versions
cat frontend/package.json | grep -E '"astro"|"@astrojs|"react"|"tailwind"'

# Record current astro config
cat frontend/astro.config.mjs

# Check if content collections exist (should NOT exist for this project)
ls frontend/src/content/config.ts 2>/dev/null && echo "CONTENT COLLECTIONS FOUND - HANDLE CAREFULLY" || echo "No content collections - good"

# Check for output mode in config
grep -n "output:" frontend/astro.config.mjs

# Check Vercel adapter import path
grep -n "vercel" frontend/astro.config.mjs

# Check for any slug references (Astro 5 changes slug → id)
grep -rn "\.slug" frontend/src/ --include="*.ts" --include="*.tsx" --include="*.astro"

# Verify clean git state
git status
```

Record all output. If anything unexpected shows up (content collections, slug usage, etc.), STOP and document what you found before proceeding.

---

## TASK 1: Create Upgrade Branch and Backup

### Approach
```bash
git checkout main
git pull origin main
git checkout -b feat/astro-5-upgrade
```

No verification needed — just confirm the branch was created.

---

## TASK 2: Run Astro Upgrade Tool

### Approach

The official upgrade tool handles the core package bumps:

```bash
cd frontend
npx @astrojs/upgrade
```

This will show which packages need major version bumps. Accept all upgrades. The tool will update:
- `astro` → 5.x
- `@astrojs/vercel` → 8.x or 9.x
- `@astrojs/react` → 4.x
- `@astrojs/sitemap` — may or may not need a bump
- `@astrojs/check` — may or may not need a bump

After the tool runs:

```bash
# Clean install
rm -rf node_modules package-lock.json
cd ..
npm install
```

### Verification
```bash
cd frontend
npx astro --version
# Should show 5.x
```

---

## TASK 3: Fix Known Breaking Changes

Based on the Astro 5 migration guide, check and fix each of these. Most will likely be no-ops for this project, but verify each one.

### 3a: Output Mode

Astro 5 merges `output: 'hybrid'` and `output: 'static'` into a single `'static'` mode that works like the old hybrid. If `astro.config.mjs` has `output: 'hybrid'`, remove it. If it has `output: 'static'` or no output setting, no change needed.

```bash
grep -n "output:" frontend/astro.config.mjs
```

**Action:** Remove `output: 'hybrid'` if present. Leave `output: 'static'` or `output: 'server'` as-is.

### 3b: Vercel Adapter Import Path

Astro 5's Vercel adapter changed its import:

```diff
- import vercel from "@astrojs/vercel/serverless"
+ import vercel from "@astrojs/vercel"
```

Check current import and update if needed:
```bash
grep -n "vercel" frontend/astro.config.mjs
```

### 3c: Content Collections (likely no-op)

This project uses `frontend/src/content/site.ts` as a plain TypeScript module — NOT as an Astro content collection. Verify there's no `frontend/src/content/config.ts` file:

```bash
ls frontend/src/content/config.ts 2>/dev/null
```

If it doesn't exist, skip this step entirely.

### 3d: TypeScript Config

Astro 5 defaults to "strict" TypeScript. Check `tsconfig.json` for any Astro-specific extends that might need updating:

```bash
cat frontend/tsconfig.json
```

If it extends `astro/tsconfigs/strict` or similar, verify the path is still valid after the upgrade.

### 3e: Deprecated Experimental Flags

Remove any experimental flags that are now stable or removed in Astro 5. Common ones:
- `experimental: { svg: true }` — now stable, remove the flag
- Any other `experimental` entries in `astro.config.mjs`

```bash
grep -n "experimental" frontend/astro.config.mjs
```

### Verification (all 3x sub-tasks)
```bash
cd frontend
npm run build
```

Build must pass. If it fails, read the error message carefully — it will tell you exactly which breaking change you hit.

---

## TASK 4: Verify Build and Fix Any Build Errors

### Approach

Run a full build from the project root:

```bash
npm run build
```

If it fails, the error messages from Astro 5 are generally clear about what needs fixing. Common issues and fixes:

| Error | Fix |
|---|---|
| `Cannot find module '@astrojs/vercel/serverless'` | Change import to `@astrojs/vercel` |
| `output: 'hybrid' is not a valid option` | Remove `output: 'hybrid'` from config |
| `content collection X uses legacy API` | Move config, add loader (unlikely for this project) |
| TypeScript errors about `Astro.props` | Check component prop types |
| `squooshImageService is not exported` | Remove squoosh references, use Sharp (default) |

Fix each error, then rebuild. Repeat until `npm run build` passes.

### Verification
```bash
npm run build
echo $?
# Must be 0
```

---

## TASK 5: Run npm audit to Verify Vulnerabilities Resolved

### Approach

```bash
npm audit
```

The 5 Astro-pinned vulnerabilities from before should now be resolved:
- astro <=5.15.8 (high)
- esbuild <=0.24.2 (moderate)
- vite (moderate)
- @astrojs/vercel (moderate)
- @astrojs/react (moderate)

### Verification

`npm audit` should show significantly fewer (ideally zero) vulnerabilities. Document any remaining ones.

---

## TASK 6: Verify Site Functionality

### Approach

Start the dev server and check key functionality:

```bash
npm run dev:all &
sleep 5

# Check frontend loads
curl -s http://localhost:4321 | head -20

# Check for the key content
curl -s http://localhost:4321 | grep -c "Resource Mechanical Insulation"

# Check backend health
curl -s http://localhost:5001/healthz

# Kill dev server
kill %1
```

### Verification

1. Frontend returns HTML with "Resource Mechanical Insulation"
2. Backend healthcheck returns 200
3. No console errors during startup

---

## TASK 7: Run TypeScript Check

### Approach

```bash
cd frontend
npx astro check
```

Fix any type errors that Astro 5's stricter checking surfaces. These are often:
- `Astro.props` type changes
- Component prop type mismatches
- Import path changes

Also run:
```bash
npx tsc --noEmit
```

### Verification

Both `astro check` and `tsc --noEmit` must pass with zero errors.

---

## TASK 8: Run Existing Tests

### Approach

```bash
npm run test 2>&1 | tail -30
```

If tests fail due to visual regression (expected — Astro 5 might produce slightly different HTML output), update baselines:

```bash
npm run test:visual:update
```

Then re-run:
```bash
npm run test
```

**Important:** If tests fail for functional reasons (not just screenshot diffs), investigate and fix the root cause. Don't just update baselines for non-visual failures.

### Verification

All tests pass (functional tests without baseline changes, visual tests with updated baselines if needed).

---

## TASK 9: Document and Commit

### Approach

1. Update `tasks/lessons.md` with any gotchas encountered during the upgrade
2. Update `tasks/todo.md` with a summary of what was done
3. Commit with clear messages:

```bash
git add -A
git commit -m "feat: upgrade Astro 4 → 5 (resolve 5 security vulnerabilities)

- Upgraded astro to 5.x, @astrojs/vercel, @astrojs/react, @astrojs/sitemap
- Fixed breaking changes: [list what was actually needed]
- All 5 Astro-pinned npm vulnerabilities resolved
- Build passing, TypeScript clean, tests passing"
```

4. Push the branch:
```bash
git push origin feat/astro-5-upgrade
```

### Verification

Branch pushed, PR ready for Graham to review.

---

## EXECUTION ORDER

1. Pre-flight checks (understand current state)
2. Create branch
3. Run upgrade tool + clean install
4. Fix known breaking changes (output mode, vercel import, etc.)
5. Build and fix any errors (iterate until clean)
6. Run npm audit (verify vulnerabilities resolved)
7. Verify site functionality (dev server, curl checks)
8. TypeScript check (astro check + tsc)
9. Run tests (update visual baselines if needed)
10. Document and commit

**After each numbered step, verify before moving on.** If something breaks, fix it before proceeding.

---

## WHAT NOT TO CHANGE

- **Do NOT upgrade Tailwind to v4** — that's a separate, larger migration. Stay on Tailwind v3.
- **Do NOT upgrade React to v19** — keep React 18 for now unless Astro 5 requires it.
- **Do NOT refactor any components** — this is a framework upgrade only, not a rewrite.
- **Do NOT change any site content, copy, or layout.**
- **Do NOT change the build output or deployment configuration** beyond what Astro 5 requires.

---

## GIT WORKFLOW

- **Branch:** `feat/astro-5-upgrade`
- **Merge policy:** Do NOT merge to main. Push branch, create PR for Graham to review.

---

## ROLLBACK PLAN

If the upgrade goes sideways:

```bash
git checkout main
git branch -D feat/astro-5-upgrade
```

The main branch remains untouched on Astro 4. No risk to production.

---

## DEFINITION OF DONE

- [ ] Astro upgraded to 5.x (latest stable)
- [ ] All Astro integrations upgraded to compatible versions
- [ ] `npm run build` passes with zero errors
- [ ] `npx astro check` passes with zero errors
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm audit` shows the 5 Astro-pinned vulnerabilities resolved
- [ ] Dev server starts and serves the site correctly
- [ ] Test suite passes (visual baselines updated if needed)
- [ ] Changes documented in tasks/lessons.md and tasks/todo.md
- [ ] All changes on `feat/astro-5-upgrade` branch, NOT merged to main
