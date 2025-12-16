# RMI Project Rules

This file contains the complete operating rules for this project. Always follow these rules when making changes.

## Primary Objective

Ship a clean, fast landing site that drives inbound leads primarily through email.

Keep dev stable: `npm run dev` works and `npm run build` stays green.

No scope creep. Small, verifiable diffs.

## Non-Negotiables

- Do not change API contracts (routes, request/response shapes, behavior) unless explicitly requested.
- Do not introduce new frameworks/UI kits/state managers unless explicitly requested.
- Do not break dark mode. Every new UI must include dark-mode styling.
- Email CTA is primary. Phone is secondary and never the only contact method.
- No "later." If you claim it's done, it must be done, tested, and summarized now.

## Single Source of Truth for Company Content

All company constants must come from `src/content/site.ts` (or the designated content module).

Never hardcode duplicates anywhere (components/pages/config):

- Company name: Resource Mechanical Insulation, LLC
- Email: ggoupille@rmi-llc.net
- Phone: 419-705-6153
- Service area phrasing: "Michigan and surrounding areas."
- Address: 11677 Wayne Road, Suite 112, Romulus, MI 48174

When copy changes are requested:

1. Update the content source first
2. Update consumers second
3. Remove any duplicates

## Conversion and UX Rules

Every section must have one purpose: conversion, trust, or clarity.

Avoid repeated CTAs in every card. Preferred:

- One CTA near section header or after grid
- One strong CTA near the bottom

Encourage email as the fastest route. Phone stays secondary.

The page must explicitly show the company name in visible UI (header and/or hero).

## Homepage Section Policy

Keep only sections that support conversion:

- Hero
- Services & Systems (tight and readable)
- Safety & Performance (clean OSHA summary)
- Materials & Pipe Supports (only if it supports an actual sales path)
- Request a Quote
- Footer

Remove filler:

- FAQ section: remove and delete related components/imports/content
- "Why Choose Resource Mechanical Insulation": remove and delete related components/imports/content

## Design and Readability

Maintain consistent vertical rhythm (padding/spacing/max widths).

Never ship unreadable text:

- No low-contrast gray-on-dark
- Bullets/tags readable without squinting

Icons must be semantically consistent:

- Prefer lucide-react
- No random/unrelated icons

Copy limits:

- Cards/sections: 1 short paragraph + 2–4 bullets max (unless explicitly required)

## Accessibility Baseline

- Preserve keyboard navigation and visible focus states.
- Use semantic HTML; ARIA only when needed.
- Forms must have labels and clear error states.
- Do not hide essential info behind hover-only interactions.

## Performance and Technical Constraints

- Prefer Astro rendering over extra client JS.
- Do not add large dependencies without explicit approval.
- Prefer reuse over near-duplicate components.
- No reformatting unrelated files.

## Diff Hygiene and Cleanup

Minimal diffs; changes scoped to the request.

If removing a section/component:

- Remove imports/exports/usages
- Delete dead files/content
- Ensure build and visual tests pass

## Required Verification Before Claiming "Done"

For any UI/layout/copy change:

```
npm run build
npm run test:visual
```

If the visual change is intentional:

```
npm run test:visual:update
npm run test:visual
```

For runtime/infra-related changes:

```
npm run test:runtime
```

For end-to-end sanity checks:

```
npm run smoke
```

Snapshot rule: Never update snapshots unless you can clearly state what changed and why it's intentional.

Windows rule: Do not use `&&` in instructions. Use separate commands on separate lines.

## Output Expectations for Every Response

Every response must include:

- What changed (bullets)
- Files modified (list)
- Commands run + PASS/FAIL
- Snapshot updates and justification (if any)
- Only critical follow-ups (no brainstorming)

## Visual Iteration Workflow

Use Playwright visual baselines as the primary feedback loop.

When requesting UI changes, reference:

- viewport (mobile/tablet/desktop)
- mode (light/dark)
- section name

Acceptance = passes `npm run test:visual` and matches agreed hierarchy/readability goals.
