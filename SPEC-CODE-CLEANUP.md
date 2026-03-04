# SPEC: Code Cleanup & Technical Debt

**Spec Version:** 1.0
**Date:** March 4, 2026
**Execution:** Claude Code autonomous

---

## CONTEXT

After multiple sprint rounds, there's accumulated dead code, unused files, and inconsistencies. This spec cleans up the codebase without changing any user-visible behavior.

**DO NOT MODIFY:** Any user-visible behavior, content, layout, or styling.

---

## TASK 1: Remove Unused Components

### Approach
1. Check if these files exist and are imported anywhere:
   - `frontend/src/components/landing/ValueProps.tsx`
   - `frontend/src/components/landing/StatsBar.tsx`
2. Search the entire codebase for imports of these files: `grep -r "ValueProps\|StatsBar" frontend/src/`
3. If they are not imported anywhere, delete them.
4. Run `npm run build` to confirm nothing breaks.

### Verification
- `npm run build` passes.
- Dead component files are removed.
- No dangling imports.

---

## TASK 2: Remove Broken Service Image Files

### Approach
1. Check if these image files exist on disk (they were referenced by services that now have empty image arrays):
   - `frontend/public/images/services/plan-spec-1.jpg`
   - `frontend/public/images/services/plan-spec-2.jpg`
   - `frontend/public/images/services/emergency-response-1.jpg`
   - `frontend/public/images/services/emergency-response-2.jpg`
2. If they exist, delete them (they were placeholder references and never had real image data).
3. If they don't exist, no action needed.
4. Search the codebase to confirm no file references these paths: `grep -r "plan-spec-\|emergency-response-" frontend/`

### Verification
- `npm run build` passes.
- No references to non-existent image files in the codebase.

---

## TASK 3: Consolidate Service Data

### Approach
1. Check where service data lives — is it in `site.ts`, inline in `Services.tsx`, or split across files?
2. If service definitions are inline in `Services.tsx`, consider whether they should be in `site.ts` for centralized content management. If they're already in `site.ts`, confirm all 9 services are defined there.
3. Verify each service has consistent data shape:
   - `title`: string
   - `description`: string
   - `icon`: component/string
   - `images`: string[] (can be empty for services without photos)
4. Add TypeScript interface if not already present:
   ```typescript
   interface ServiceDefinition {
     title: string;
     description: string;
     icon: string;
     images: { src: string; alt: string }[];
   }
   ```

### Verification
- `npm run build` passes.
- All 9 services have consistent data shape.
- TypeScript interface exists for service data.

---

## TASK 4: Clean Up tasks/ Directory

### Approach
1. Review `tasks/todo.md` — consolidate completed sprint summaries into a single "Completed Sprints" section at the bottom.
2. Move any active/pending items to the top under "Current" heading.
3. Review `tasks/lessons.md` — remove duplicate lessons, consolidate related items.
4. Keep both files clean and scannable.

### Verification
- `tasks/todo.md` has clear Current vs Completed sections.
- `tasks/lessons.md` has no duplicates.

---

## TASK 5: Verify All Tests Pass and Clean Up Test Files

### Approach
1. Run the full test suite: `npm run test`
2. If any tests are skipped or marked `.todo`, evaluate if they should be implemented or removed.
3. Check for any test files that test removed components (ValueProps, StatsBar).
4. Remove orphaned test files.
5. Run `npm run test:visual:update` to ensure visual baselines match current state.

### Verification
- `npm run test` passes with 0 failures and 0 skipped.
- No test files reference removed components.
- Visual baselines are up to date.

---

## TASK 6: NPM Audit and Dependency Check

### Approach
1. Run `npm audit` and document the findings.
2. If there are vulnerabilities in direct dependencies (not transitive), attempt to fix:
   ```bash
   npm audit fix
   ```
3. Do NOT run `npm audit fix --force` (can introduce breaking changes).
4. Run `npm outdated` and document any major version updates available.
5. If any dependencies are outdated by 2+ major versions, flag them but do NOT update (save for a dedicated upgrade sprint).
6. Add findings to `tasks/todo.md` under a "Dependencies" section.

### Verification
- `npm run build` passes after any fixes.
- Audit findings documented in `tasks/todo.md`.
- No forced dependency updates.

---

## EXECUTION ORDER
1. Task 1 (remove unused components)
2. Task 2 (remove broken images)
3. Task 5 (test cleanup)
4. Task 3 (consolidate service data)
5. Task 4 (clean tasks/)
6. Task 6 (npm audit)

## GIT WORKFLOW
1. `git checkout main && git pull origin main`
2. `git checkout -b chore/code-cleanup`
3. Make all changes, `npm run build`, `npm run test`
4. `git add . && git commit -m "chore: remove dead code, clean tests, consolidate service data, npm audit"`
5. `git push origin chore/code-cleanup`
6. **Do NOT merge to main.**

## DEFINITION OF DONE
- [ ] Unused components removed (ValueProps, StatsBar if present)
- [ ] No references to broken image files
- [ ] Service data has consistent TypeScript interface
- [ ] tasks/todo.md and tasks/lessons.md cleaned up
- [ ] All tests pass, no orphaned test files
- [ ] NPM audit findings documented
- [ ] `npm run build` passes
- [ ] Branch pushed, NOT merged
- [ ] Summary written to `tasks/todo.md`
