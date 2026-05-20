<!--
SYNC IMPACT REPORT
Version change: 0.0.0 (template) → 1.0.0
Modified principles: N/A (initial ratification)
Added sections:
  - Core Principles I–VII
  - Engineering Standards
  - Development Workflow
  - Governance
Removed sections: none
Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (Constitution Check unchanged-but-aligned; gates here cover BDD/coverage/zero-latency)
  - ✅ .specify/templates/spec-template.md (Given/When/Then already mandated in user stories — aligned)
  - ✅ .specify/templates/tasks-template.md (note: tests are MANDATORY for this project per Principle II, overriding the template's "OPTIONAL" guidance)
  - ⚠ .specify/templates/commands/*.md — none present in this project install; skipped
  - ✅ CLAUDE.md (already references the speckit pipeline; no further change needed for this amendment)
Follow-up TODOs: none
-->

# NeuralKeys Constitution

NeuralKeys is a browser-based, backendless typing trainer. This constitution
codifies the non‑negotiable principles every contributor (human or agent) MUST
follow. When this document conflicts with any other guidance — chat instruction,
PR template, README — this document wins until amended through Governance.

## Core Principles

### I. Zero-Latency Keystrokes (NON-NEGOTIABLE)

Keystroke handling MUST feel instantaneous on a mid-range laptop. Concretely:

- The active `Char` component MUST be memoized; rendering a single keystroke
  MUST NOT re-render the whole text body.
- The keystroke array MUST live in a `useRef`, never in React state, to avoid
  re-renders on every key down.
- No synchronous work over ~2 ms is permitted in the keystroke hot path —
  including no JSON.parse of large blobs, no localStorage writes, and no
  network calls. Persistence MUST be debounced or deferred (e.g., on session
  end / `requestIdleCallback`).
- New features MUST NOT regress this. PRs touching the typing surface MUST
  state in their description how they preserve zero-latency.

**Rationale:** the product *is* the typing feel. Any visible jitter destroys
the value proposition; this rule is enforced at the architectural level
because it cannot be retrofitted.

### II. BDD-Style Testing with High Coverage (NON-NEGOTIABLE)

All testing MUST be written in Behavior-Driven Development style and MUST hit
high coverage on testable code.

- Tests MUST be expressed as `describe(<behavior>) → it("should …", …)` with
  clear **Given / When / Then** structure inside each test (comments or
  `// Arrange / Act / Assert` style is acceptable, but the three phases MUST
  be visible).
- `it` descriptions MUST describe observable behavior in user/domain language
  (e.g. `"should re-lock a level after two consecutive sub-70% sessions"`),
  not implementation detail (e.g. `"calls demoteLevel()"`).
- Coverage on `lib/**` and `components/**` MUST be **between 80% and 100%**
  (lines AND branches). PRs that drop coverage below 80% on either dimension
  on touched files MUST be rejected.
- Pure logic in `lib/` MUST be exercised by unit tests. UI behavior in
  `components/` and `app/` MUST be exercised by component or integration tests
  (Vitest + Testing Library).
- User stories in specs use Given/When/Then acceptance scenarios; those
  scenarios MUST map 1:1 to executable BDD tests in the implementation phase.
- Tests MUST be written *alongside or before* the production change in the
  same PR. "Tests will follow in a follow-up" is not acceptable.

**Rationale:** we have no QA team and no staging environment. The test suite
is the only safety net. Phrasing tests in user-visible behavior keeps them
robust to refactors and makes the spec ↔ code traceability automatic.

### III. Spec-Driven Development

Every non-trivial change MUST flow through the spec-kit pipeline:
`/speckit-constitution` → `/speckit-specify` → `/speckit-plan` →
`/speckit-tasks` → `/speckit-implement`.

- Trivial changes (typo fixes, dependency bumps, version bumps, cosmetic CSS
  tweaks) MAY skip the pipeline.
- Anything that adds, removes, or alters user-visible behavior; changes data
  shape; or touches a core hot path (typing, scoring, persistence, sync) MUST
  have a `specs/NNN-feature-name/spec.md` before implementation begins.
- Specs MUST contain prioritized, independently testable user stories
  (P1/P2/P3) with Given/When/Then acceptance scenarios.

**Rationale:** prevents drive-by feature creep, keeps PRs focused, and
generates the BDD test backlog automatically.

### IV. SOLID, KISS, YAGNI

- **SOLID** — single-responsibility modules; small composable React
  components; pure functions in `lib/`; no god components.
- **KISS** — prefer the obvious solution. The codebase target is one
  experienced reader can hold the architecture in their head.
- **YAGNI** — no speculative abstractions, no half-finished implementations,
  no feature flags for hypothetical future requirements. Three similar lines
  beat a premature abstraction.

**Rationale:** this is a single-maintainer project. Every abstraction costs
maintenance forever; only pay the cost when the duplication actually hurts.

### V. Backendless by Default

NeuralKeys MUST remain runnable as a static-export-friendly Next.js app with
no first-party server dependencies beyond Vercel's edge.

- Primary persistence is `localStorage`.
- Cross-device sync uses Vercel Blob (PIN-keyed) only — no databases, no
  auth servers, no session stores.
- Outbound calls are limited to: (a) Vercel Blob for sync, (b) Anthropic API
  for AI tips, gated behind a user-supplied key. Both MUST degrade gracefully
  to local-only mode when offline or unconfigured.

**Rationale:** zero infra cost, zero ops burden, instant load. Adding a
backend is a constitution-level decision (MAJOR amendment).

### VI. Dark-First, Mobile-Friendly UX

- All new UI MUST look correct in dark mode at design time; light mode is a
  later concern.
- All new UI MUST be usable on a 375px-wide viewport. Tap targets ≥ 44 px.
- Tailwind v4 utility classes are the styling primitive; no CSS-in-JS, no
  ad-hoc stylesheets.

**Rationale:** the audience uses laptops and phones at night; getting the
default right once is cheaper than retrofitting.

### VII. SemVer + Changelog Discipline

- Versioning follows [SemVer](https://semver.org/): MAJOR for breaking
  user-visible behavior, MINOR for new features, PATCH for fixes.
- Every PR MUST update `CHANGELOG.md` under the matching version heading in
  [Keep a Changelog](https://keepachangelog.com/) format.
- Every PR title MUST end with a `vX.Y.Z` suffix and carry the matching
  GitHub label.
- Merges to `master` MUST be tagged `vX.Y.Z` on the merge commit and the tag
  pushed.

**Rationale:** the changelog is the only release-note source. Keeping it
current per-PR is the only way it stays accurate.

## Engineering Standards

- **Stack**: Next.js 16 (App Router), TypeScript strict, Tailwind CSS v4,
  Vitest + Testing Library. Node 24 LTS.
- **Hosting**: Vercel (Fluid Compute). `master` → production, feature
  branches → preview deployments.
- **Quality gate** (MUST pass locally before push, MUST pass in CI before
  merge):
  1. `npm run lint` — clean.
  2. `npm test -- --coverage` — all green; coverage on touched files in
     `lib/**` and `components/**` ≥ 80%.
  3. `npm run build` — clean.
- **Performance budgets**:
  - p95 keystroke-to-paint < 16 ms on a Lighthouse "mobile" profile.
  - Initial JS payload (gzipped) MUST stay under 250 KB without explicit
    waiver in the PR description and a Complexity Tracking entry.
- **Security**: never commit secrets. The Anthropic API key is user-supplied
  at runtime and stored in `localStorage`; the codebase MUST NOT ship a
  bundled key.
- **Accessibility**: keyboard-only operation MUST work for all interactive
  flows (the app is a keyboard trainer — this is table stakes). Focus rings
  MUST be visible; no `outline: none` without a replacement.

## Development Workflow

- **Branching**: `master` is production. There is no long-running `dev`
  branch. Each feature gets a spec-kit branch `NNN-feature-name` (created by
  `/speckit-specify`); the PR goes from that branch directly to `master`.
- **Pull requests** MUST:
  - Reference the spec at `specs/NNN-feature-name/`.
  - Include the BDD test additions for every functional requirement and
    acceptance scenario in the spec.
  - Update `CHANGELOG.md`.
  - Pass the full quality gate locally before push.
  - Carry the `vX.Y.Z` title suffix and label.
- **Code review**: a human review is required for changes to core hot paths
  (typing surface, scoring, persistence, sync) and for any constitution
  amendment. Other PRs MAY auto-merge once CI passes.
- **Constitution Check (planning gate)**: every `plan.md` MUST include an
  explicit Constitution Check section confirming compliance with Principles
  I, II, IV, and V or documenting a justified violation under Complexity
  Tracking.
- **Quality gate timing**: ALWAYS run lint + test + build BEFORE pushing.
  Pushing first and fixing in CI is forbidden.
- **Forbidden flags**: `--no-verify`, `--no-gpg-sign`, force-push to
  `master`. Unconditional. If a hook fails, fix the hook or the underlying
  problem.

## Governance

- This constitution supersedes all other guidance — chat instructions, PR
  templates, individual style preferences.
- Amendments MUST go through `/speckit-constitution`, which:
  - Bumps the version per the rules below.
  - Writes a Sync Impact Report at the top of this file.
  - Propagates updates to dependent templates and `CLAUDE.md`.
- Versioning of this document:
  - **MAJOR**: backward-incompatible removal or redefinition of a principle
    (e.g., introducing a backend, dropping BDD).
  - **MINOR**: new principle or materially expanded section.
  - **PATCH**: clarifications, wording, typo fixes.
- Compliance review: every PR description MUST either confirm "constitution:
  pass" or list the principles it intentionally violates with justification.
  CI MAY enforce this with a label/checklist gate.
- Runtime guidance for agents lives in `CLAUDE.md` and `AGENTS.md`; those
  files MUST stay consistent with this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-05-20 | **Last Amended**: 2026-05-20
