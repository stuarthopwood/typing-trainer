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
- Quality gate (lint + test + build) runs locally **before** push, never after.
- Never `--no-verify`, never `--no-gpg-sign`, never force-push `master`.

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
<!-- SPECKIT END -->
