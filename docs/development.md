# Development Guide

## Prerequisites

- Node.js 24 LTS
- npm (comes with Node)
- Git

## Setup

```bash
git clone https://github.com/stuarthopwood/typing-trainer.git
cd typing-trainer
npm install
```

### Environment Variables

Copy `.env.local.example` (or create `.env.local`) with:

```bash
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."    # Vercel Blob SDK token
PROGRESS_API_KEY="your-api-key"                # Shared auth key for API routes
NEXT_PUBLIC_PROGRESS_API_KEY="same-key"        # Same key, exposed to client at build time
ANTHROPIC_API_KEY="sk-ant-..."                 # Claude API key for AI tips (optional)
```

Without these, the app runs in local-only mode (localStorage only, no sync, no AI tips).

## Development Server

```bash
npm run dev     # http://localhost:3000
```

## Testing

```bash
npm test              # Run all tests (161 tests, Vitest)
npm run test:watch    # Watch mode
```

Tests are BDD-style (`describe → it("should...")` with Given/When/Then structure). Constitution Principle II mandates 80-100% coverage on `lib/**` and `components/**`.

## Quality Gate (Pre-Push)

**Both phases must pass before pushing.** The gate iterates up to 4 times.

### Phase 1: Automated Checks (sequential)

```bash
npm run lint          # ESLint — zero errors
npm test              # All tests pass
npx tsc --noEmit     # Zero type errors
npm run build         # Clean production build
```

### Phase 2: Sub-Agent Reviews (parallel)

Four review agents spawned simultaneously via the Agent tool:

| Agent | Focus |
|-------|-------|
| `test-engineer` | Coverage gaps, BDD adherence, edge cases |
| `code-reviewer` | SOLID/DRY/YAGNI/KISS, TypeScript hygiene |
| `accessibility-auditor` | WCAG 2.1 AA, keyboard nav, focus, ARIA |
| `security-auditor` | Secrets, XSS, path traversal, PIN isolation |

### Triage

- **Critical/High** → MUST fix before push
- **Medium** → fix if cheap, otherwise file as follow-up issue
- **Low** → advisory, ignore unless trivially fixable

## Git Workflow

- `master` = production (auto-deploys to Vercel, branch-protected)
- No long-running `dev` branch
- Each feature gets a branch from `/speckit-specify` (e.g., `009-per-session-blob-storage`)
- PRs go directly from feature branch → `master`
- Every PR updates `CHANGELOG.md` and carries a `vX.Y.Z` title suffix

### Spec-Kit Pipeline

Non-trivial features flow through:

```
/speckit-specify → /speckit-plan → /speckit-tasks → /speckit-implement
```

Trivial changes (typo fixes, dependency bumps, cosmetic tweaks) may skip the pipeline.

## Project Conventions

### Code Style

- TypeScript strict mode
- Tailwind v4 utility classes (no CSS-in-JS)
- No comments unless the WHY is non-obvious
- Pure functions in `lib/`, React components in `components/`
- `memo()` on components that re-render unnecessarily

### Performance Rules (Constitution Principle I)

- The `Char` component MUST be memoized
- Keystroke array MUST live in `useRef`, not state
- No synchronous work > 2ms in the keystroke hot path
- No localStorage writes during typing
- Event listeners register once (use refs to avoid dep-array churn)

### Accessibility Rules (Constitution Principle VI)

- Dark-first (all UI must look correct on `#0d0d0d` background)
- Tap targets ≥ 44px on mobile
- Visible focus rings on all focusable elements
- `prefers-reduced-motion: reduce` suppresses all non-essential animation
- Keyboard-only operation for all interactive flows

### Versioning

- SemVer: MAJOR for breaking user-visible behavior, MINOR for new features, PATCH for fixes
- CHANGELOG.md in Keep a Changelog format
- After merge to master, tag `vX.Y.Z` and push the tag

## Useful Scripts

```bash
npm run dev              # Dev server
npm test                 # Run tests
npm run test:watch       # Watch mode
npm run lint             # ESLint
npm run build            # Production build
npm run version:patch    # Bump patch version
npm run version:minor    # Bump minor version
npm run version:major    # Bump major version
```

## Local-Only Ops Scripts (not committed)

Located in `/scripts/` (gitignored):

- `list-pins.mjs` — enumerate all PINs on Vercel Blob with headline stats
- `restore-pin.mjs` — write a localStorage snapshot directly to Blob
- `clean-pin.mjs` — remove sessions after a timestamp cutoff + recalculate stats
