---
name: quality-gate
description: Run a full quality gate — automated checks plus all review sub-agents. Iterates until no Critical/High/Medium issues remain. Use after completing code changes or when asked to review quality.
---

Run the full quality gate for NeuralKeys. This is an iterative process — cycle until clean.

## Process (per cycle)

### Step 1: Automated Checks
Run these sequentially — all must pass before proceeding:
1. `npm run lint` — zero lint errors
2. `npm test -- --coverage` — all tests pass; coverage ≥80% on touched `lib/**` and `components/**` files (Constitution Principle II)
3. `npx tsc --noEmit` — zero type errors
4. `npm run build` — clean production build

If any fail, fix immediately and re-run before proceeding.

### Step 2: Sub-Agent Reviews
Spawn ALL FOUR mandatory review sub-agents IN PARALLEL using the Agent tool (single message, four tool calls):
- `subagent_type: test-engineer` — test gaps, BDD adherence, complexity, coverage
- `subagent_type: code-reviewer` — overall code quality, SOLID/DRY/YAGNI/KISS, refactoring
- `subagent_type: accessibility-auditor` — WCAG, keyboard nav, focus, contrast, screen reader
- `subagent_type: security-auditor` — secrets, XSS, injection, deps, Blob token exposure

Optionally also spawn (advisory):
- `subagent_type: performance-auditor` — re-renders, bundle size, INP
- `subagent_type: ux-reviewer` — consistency and usability

Each agent reports findings with severity: Critical / High / Medium / Low and a final `VERDICT: PASS | FAIL` line.

### Step 3: Triage & Fix
1. Collect all findings from all agents
2. Filter to Critical, High, and Medium severity only
3. Implement fixes for all of them
4. Write tests for any new code if appropriate

### Step 4: Iterate
If fixes were made in Step 3, return to Step 1 (new cycle).
Maximum 3 cycles. If issues persist after 3 cycles, report remaining issues to the user.

### Step 5: Report
When only Low-severity findings remain (or after 3 cycles):
- Report what was fixed across all cycles
- List any remaining Low findings as advisory
- Declare quality gate PASSED or FAILED

## Severity Definitions

| Level | Definition | Action |
|-------|-----------|--------|
| Critical | Security vulns, data loss, crashes, broken core functionality | MUST fix |
| High | Significant bugs, major a11y failures, untested critical paths | MUST fix |
| Medium | Minor bugs, missing tests for non-critical code, readability issues | MUST fix |
| Low | Style preferences, micro-optimisations, nice-to-haves | Report only |
