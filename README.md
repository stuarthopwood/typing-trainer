# NeuralKeys

Build neural pathways through keystroke repetition. A backendless typing trainer with progressive drills, curated passages, and AI coaching — dark-themed, zero-latency, mobile-friendly.

**Live:** [typing-trainer-one.vercel.app](https://typing-trainer-one.vercel.app)

## Quick Start

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 161 tests (Vitest, BDD-style)
npm run build    # Production build
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript strict) |
| Styling | Tailwind CSS v4 (dark-first) |
| Testing | Vitest + Testing Library (161 tests, 80%+ coverage) |
| Storage | localStorage (primary) + Vercel Blob (cross-device sync) |
| AI | Anthropic Claude Haiku (typing tips) |
| CI/CD | GitHub Actions + Vercel (auto-deploy on merge to master) |

## Features

- **Progressive drills** — 6 levels (home-row → full keyboard) with word-bank-based exercises
- **80+ passages** — sci-fi, fantasy, movies, code, philosophy — filterable by difficulty and category
- **Adaptive targeting** — 40% of drill words biased toward your error-prone keys
- **AI coaching tips** — pattern detection (hand imbalance, slow bigrams, fatigue) → actionable feedback
- **Visual keyboard** — Keychron K2 layout with live key highlighting and error heatmap
- **XP & achievements** — 20-level progression, milestone unlocks, streak tracking
- **Per-session storage** — individual session blobs with granular fetch/delete/list
- **Session deletion** — undo-toast pattern (5s undo window, optimistic UI)
- **Cross-device sync** — PIN-based profiles, automatic merge on load
- **Zero-latency keystrokes** — memoized rendering, ref-based keystroke array, stable event listeners

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System overview, data flow, storage model, performance |
| [API Reference](docs/api.md) | All endpoints, auth, request/response shapes |
| [Development Guide](docs/development.md) | Setup, testing, quality gate, git workflow, conventions |
| [Features](docs/features.md) | Comprehensive feature descriptions |
| [Changelog](CHANGELOG.md) | Version history (Keep a Changelog format) |
| [Constitution](.specify/memory/constitution.md) | Non-negotiable project principles |

## Architecture

```
Browser (localStorage = source of truth)
  ↕ sync
Vercel Blob (backup, cross-device)
  ↕ API routes
Vercel Functions (progress, sessions, tips)
```

See [docs/architecture.md](docs/architecture.md) for data flow diagrams and performance architecture.

## Contributing

1. Create a feature branch via `/speckit-specify`
2. Follow the [development guide](docs/development.md)
3. Run the full quality gate (Phase 1 + Phase 2) before push
4. Open a PR to `master` with a `vX.Y.Z` title suffix
5. Update `CHANGELOG.md`

## License

Private repository. Stuart Hopwood.
