# RMI Development Workflow

---

## Spec-Driven Development

Every task starts with a spec. No exceptions.

### Flow

1. Describe the change to Claude.ai in plain English
2. Claude.ai generates a filled CURRENT_TASK.md spec
3. Copy the spec output
4. Press hotkey (Win+T) → writes clipboard to docs/CURRENT_TASK.md
5. Open Claude Code → it reads CLAUDE.md + CURRENT_TASK.md automatically
6. Claude Code works until every checklist item is verified complete
7. Review completion report and screenshots
8. Merge to main

### Hotkeys

| Hotkey | Action                                          |
| ------ | ----------------------------------------------- |
| Win+T  | Paste clipboard → docs/CURRENT_TASK.md          |
| Win+O  | Open docs/CURRENT_TASK.md in Notepad++          |
| Win+S  | Capture screenshots → docs/screenshots/current/ |

---

## Git Practices

```
# Feature branch workflow
git checkout -b feat/description-of-change
# ... implement and test ...
git add .
git commit -m "feat: description of what changed and why"
git checkout main
git merge feat/description-of-change
git push origin main
```

### Commit Message Prefixes

| Prefix  | Usage                          |
| ------- | ------------------------------ |
| feat:   | New feature or enhancement     |
| fix:    | Bug fix                        |
| style:  | Visual/CSS changes only        |
| test:   | Test additions or changes      |
| docs:   | Documentation only             |
| chore:  | Cleanup, dependency updates    |
| perf:   | Performance improvements       |

### Rules

- Never commit directly to main without testing
- Never commit with failing build or tests
- Commit messages must be descriptive enough to understand without reading the diff
- One logical change per commit

---

## Testing Protocol

### Before Every Commit

1. `npm run build` — must pass with zero errors
2. `npm run test` — must pass with zero failures
3. Visual screenshots captured if UI changed
4. Contact form tested if backend changed

### After UI Changes

1. Run `npm run test:visual:update` to update baselines
2. Review baseline changes — confirm they match intent
3. Commit baseline updates separately with message `test: update visual baselines for [component]`

### Breakpoints to Verify

320px, 375px, 414px (mobile) — 768px (tablet) — 1024px, 1280px (desktop)
Test both portrait and landscape on mobile sizes.

---

## Screenshot Workflow

### Automated (Claude Code runs this)

```powershell
powershell scripts/screenshots.ps1
```

Captures: all breakpoints × all changed components
Saves to: docs/screenshots/current/
Compares against: docs/screenshots/baseline/

### Baseline Updates

Only update baselines when CURRENT_TASK.md contains:
- `UPDATE_BASELINES: true`
- `BASELINE_COMPONENTS: [list of specific components]`

Never update all baselines at once. Always component-specific.

### Human Review

Press Win+S to capture screenshots, then drag from docs/screenshots/current/ into Claude.ai for visual analysis.

---

## Spec Template Usage

When starting a new task, tell Claude.ai:
"Generate a CURRENT_TASK.md spec for: [plain English description]"

Claude.ai will use the appropriate template from docs/templates/ and output
a filled spec ready to paste. Use Win+T to write it to the file.

Available templates:
- `docs/templates/ui-change.md` — Visual/CSS changes
- `docs/templates/bug-fix.md` — Bug fixes (test-first)
- `docs/templates/new-component.md` — New React/Astro component
- `docs/templates/feature.md` — New feature (end-to-end)
- `docs/templates/backend-change.md` — API/database changes

---

## CHANGELOG Format

Each entry written by Claude Code after task completion:

```
## [DATE] — [Task Type] — [Brief Title]
**Objective:** What was changed
**Files modified:** Exact list
**Build:** PASSED — [0 errors, 0 warnings]
**Tests:** PASSED — [X/X passing]
**Screenshots:** Captured to docs/screenshots/current/
**Notes:** Anything unexpected encountered
```
