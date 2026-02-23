# Template: Backend Change

> Copy to docs/CURRENT_TASK.md. Fill in all [BRACKETS].

---

## Task Header

Type: Backend Change
Priority: [High / Medium / Low]
Complexity: [Simple / Medium / Complex]
UPDATE_BASELINES: false
BASELINE_COMPONENTS: none
Created: [DATE]

---

## Objective

[What is changing in the backend. API endpoint, database schema, business logic.]

---

## Change Type

- [ ] New API endpoint
- [ ] Modify existing endpoint
- [ ] Database schema change (requires migration)
- [ ] Business logic change
- [ ] Dependency update

---

## Files

### Modify

- src/pages/api/[endpoint].ts
- [other backend files]

### Schema Changes (if applicable)

> If schema changes, list the exact change and migration name.
> Migration name: [descriptive-name]
> Change: [add column X to table Y / create table Z / etc]

### Never Touch

- src/components/ (backend task — no frontend changes)
- tests/visual/home.spec.ts-snapshots/
- Any file not listed above

---

## API Specification (if new/modified endpoint)

**Method:** [GET / POST / PUT / DELETE]
**Path:** /api/[path]
**Auth required:** [yes / no]

**Request body:**

```json
{
  "field": "type"
}
```

**Success response (200):**

```json
{
  "field": "value"
}
```

**Error responses:**

- 400: [validation failure description]
- 500: [server error description]

---

## Data Validation Rules

- [Every input field and its validation rule]
- Never trust incoming data — validate everything
- Flag mismatches — never auto-correct

---

## Acceptance Criteria

- [ ] Implemented — [ ] Verified: Endpoint returns correct response for valid input
- [ ] Implemented — [ ] Verified: Endpoint returns correct error for invalid input
- [ ] Implemented — [ ] Verified: Input validation covers all fields
- [ ] Implemented — [ ] Verified: No sensitive data logged
- [ ] Implemented — [ ] Verified: Health check still passes: GET /healthz → 200
- [ ] Implemented — [ ] Verified: npm run build passes
- [ ] Implemented — [ ] Verified: E2E test written and passing

---

## Constraints

- Never auto-correct data mismatches — flag for human review
- Always validate at API boundary before touching database
- Never log request bodies containing user data
- [Add task-specific constraints]

---

## Completion Report

[Claude Code fills in after verification]
