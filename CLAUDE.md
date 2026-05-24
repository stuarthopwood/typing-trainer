@AGENTS.md

# NeuralKeys

Web typing trainer — Stuart Hopwood. Repo: stuarthopwood/typing-trainer. Deployed on Vercel.

## Design rules

- SOLID, KISS, YAGNI
- Zero-latency keystrokes (memoized `Char`, `useRef` for keystroke array)
- Dark-first, mobile-friendly, no backend (localStorage + Blob)

## Git

- `master` = production. There is no long-running `dev` branch.
- All work happens on a per-feature branch (`NNN-feature-name`, created by `/speckit-specify`) → PR direct to `master` → merge after CI green.
- Branch protection enforces PR + CI on `master` (no direct push, no force push).
- Each PR gets a `vX.Y.Z` title suffix and matching GitHub label.
- Every PR updates `CHANGELOG.md` under the matching version heading (Keep a Changelog format).
- After merge to `master`, tag the merge commit `vX.Y.Z` and push the tag.
- Quality gate (see below) runs locally **before** push, never after.
- Never `--no-verify`, never `--no-gpg-sign`, never force-push `master`.

## Quality gate (pre-push, MANDATORY)

Run BEFORE every push. Two phases — automated checks first, then a parallel sub-agent review fan-out. Do NOT push until both phases are clean.

### Phase 1 — Automated checks (sequential, all must pass)

1. `npm run lint`
2. `npm test -- --coverage`  (all tests pass; coverage on touched files in `lib/**` and `components/**` ≥ 80% per Constitution Principle II)
3. `npx tsc --noEmit`
4. `npm run build`

If any fail, fix the underlying issue and rerun. Do NOT proceed to Phase 2 with red automated checks.

### Phase 2 — Sub-agent review (parallel)

Spawn ALL FOUR review sub-agents in a single message (parallel) via the Agent tool, and wait for all of them to return:

- `subagent_type: test-engineer` — test gaps, BDD adherence, readability, complexity, coverage.
- `subagent_type: code-reviewer` — overall code quality, refactoring opportunities, SOLID/KISS/YAGNI/DRY.
- `subagent_type: accessibility-auditor` — WCAG, keyboard navigation, focus, contrast, screen reader.
- `subagent_type: security-auditor` — secrets, XSS, injection, dependency CVEs, Blob token exposure.

Each agent returns findings with severity (Critical / High / Medium / Low) and a one-line `VERDICT: PASS | FAIL` line.

### Triage rule

- Any **Critical** or **High** finding from any agent → MUST fix before push.
- **Medium** findings → fix in this PR if cheap; otherwise file as a follow-up issue and reference the issue in the PR description.
- **Low** findings → advisory; ignore unless trivially fixable.

After fixes, re-run Phase 1 + Phase 2 from the top. Maximum 3 cycles; if issues persist, escalate to Stuart with the remaining findings.

### Push gate

Push is allowed only when:
- All Phase 1 checks are green AND
- All four agents return `VERDICT: PASS` (or the only failures are Low-severity advisories explicitly accepted).

## Spec Kit workflow

This repo uses [GitHub Spec Kit](https://github.com/github/spec-kit) for spec-driven development. Drive every non-trivial feature through the pipeline rather than coding straight from a chat prompt.

1. `/speckit-constitution` — amend `.specify/memory/constitution.md` when project-wide principles change. Bump its semver (MAJOR for backward-incompatible principle removal/redef, MINOR for new principle, PATCH for clarifications) and write a Sync Impact Report.
2. `/speckit-specify "<one-liner>"` — creates a feature branch `NNN-short-name`, scaffolds `specs/NNN-short-name/spec.md` from the template, and sets `SPECIFY_FEATURE`. Fill in user stories (P1/P2/P3, independently testable), functional requirements (`FR-NNN MUST …`), success criteria (measurable, technology-agnostic), and assumptions. Cap `[NEEDS CLARIFICATION]` markers at 3.
3. `/speckit-clarify` *(optional)* — resolve ambiguities before planning.
4. `/speckit-plan` — generate `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, and `contracts/` from the spec. Do a Constitution Check; document any violation in Complexity Tracking.
5. `/speckit-tasks` — produce `tasks.md` grouped by user story (Setup → Foundational → US1 P1 MVP → US2 P2 → … → Polish). Tag `[P]` for parallelizable tasks, `[USx]` for story traceability. Tests are OPTIONAL unless the spec asks for them.
6. `/speckit-analyze` *(optional)* — sanity-check spec/plan/tasks coherence before implementing.
7. `/speckit-implement` — work through `tasks.md` in order, checking off as you go.

Spec-kit feature directories live under `specs/NNN-feature-name/`. The `dev` branch is retired; the spec-kit feature branch IS the working branch and the source for the PR.

## Agent skills

- Issues: `docs/agents/issue-tracker.md`
- Triage: `docs/agents/triage-labels.md`
- Domain: `docs/agents/domain.md`

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at `specs/012-xp-level-badges/plan.md`
<!-- SPECKIT END -->
