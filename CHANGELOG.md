# Changelog

All notable changes to NeuralKeys are recorded here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.0] — 2026-05-21

### Added
- Session deletion UI on the stats page: trash icon on each session row (visible on hover/focus), optimistic removal with 5-second undo toast, hard-delete from Blob + localStorage after undo window expires.
- UndoToast component: reusable countdown toast with Undo button, keyboard-operable, screen-reader announced.
- Stats recalculation after deletion: bestWpm, bestAccuracy, totalSessions, totalCharsTyped recomputed from remaining sessions.

## [1.3.0] — 2026-05-21

### Added
- Per-session Blob storage: each completed session is now stored as an individual blob at `neuralkeys/sessions/{pin}/{session-id}.json`. Enables granular access, deletion, and future sharing/deep-linking.
- New `/api/sessions` endpoint: list all sessions (paginated), fetch by ID, delete by ID, migrate legacy `allSessions`.
- Stats page now aggregates from individual session blobs via the new sessions API.
- Automatic migration: on first stats-page load, legacy `allSessions` entries are backfilled as individual blobs and cleared from the progress summary.

### Changed
- `PUT /api/progress` no longer appends to an `allSessions` array. The progress blob is now a lightweight summary (<10KB regardless of session count).
- Stats page uses `loadAllSessions()` from `lib/sessions.ts` instead of `loadFullHistory()` from `lib/progress.ts`.

### Removed
- `loadFullHistory()` function from `lib/progress.ts` (replaced by session blob listing).
- `?full=true` query parameter from `GET /api/progress` (no longer returns `allSessions`).

## [1.2.3] — 2026-05-21

### Fixed
- WCAG 2.1 AA compliance: PinEntry focus ring, prefers-reduced-motion global suppression, chart contrast (neutral-500 → neutral-400), chart heading hierarchy (h2 → h3), scrollable-list keyboard focus, TypingArea escape hint, tap targets ≥44px, TipBox/StatsDisplay live regions, TipItem keyboard operability, PracticeHeatmap aria-label.
- Drill-level buttons now highlight the active level during typing and after unlock/demotion.
- Keystroke hot-path performance: event listener re-registration eliminated (positionRef + activeKeyRef), StatsDisplay memoized, fetchTip deferred off keystroke frame, shakeError timeout stacking fixed.

## [1.2.2] — 2026-05-20

### Fixed
- Vercel Blob sync was silently failing for ~5 days because `put()` was missing `allowOverwrite: true`. Every sync after the first write threw 500.
- `syncToRemote` now returns a `SyncStatus` discriminated union and surfaces failures via a red toast.

## [1.2.0] — 2026-05-20

### Added
- This `CHANGELOG.md`. Going forward every PR updates it and merges to `master` are tagged `vX.Y.Z`.
- Drill mode opens on the highest unlocked level instead of always starting at `home-row`.
- Adaptive drill demotion: two consecutive sub-70% sessions on a drill level re-lock it and drop the user to the previous level, with an inline amber toast explaining why.

## [1.1.1] — 2026-05-20

### Changed
- Softened the cursor-following glow spotlight (lower alpha, broader fade, more blur).
- Thickened the glow border ring from 1px to 2px.
- Difficulty selector now renders only in passage mode, with the active tier labelled inline.
- Lifted weak text colours across the header, mode/level selectors, level-progress dots, XP chip, version stamp, and stats panels for better contrast.

### Fixed
- Body solid background was overpainting the animated ambient gradient; the gradient is now visible and its alpha was raised so it actually shows.
- Locked drill-level pills no longer glow on hover.

## [1.1.0] — 2026-05-20

### Added
- Cursor-following multicolour glow borders (green/cyan/indigo conic gradient) on stats panels, the typing area, the tip toast, and mode/level/category buttons.
- Animated radial-gradient ambient background.
- Reusable `<GlowBorder>` wrapper component.

### Changed
- Bumped pending-character text contrast in the typing area.

### Fixed
- Sound toggle was triggering a full re-render storm (~1s INP); `TypingArea` is now memoized and the sound flag is held in a ref.

## [1.0.9] — 2026-05-19

### Fixed
- Sound-toggle re-render storm; memoized `TypingArea` and stabilised `handleKeyPress`.

## [1.0.8] — 2026-05-18

### Changed
- Progress is cached in state instead of being read from `localStorage` on every render.

## [1.0.7] — 2026-05-17

### Added
- Drill targets are filtered to the current drill level only.

### Changed
- Tip toast moved out of the typing area's flow so it no longer shifts layout.

## [1.0.6] — 2026-05-15

### Changed
- Scaled all text down ~20% on 1080p and smaller displays.
- Trimmed `CLAUDE.md` to essentials.

## [1.0.5] — 2026-05-14

### Changed
- Further trimmed `CLAUDE.md`.

## [1.0.4] — 2026-05-13

### Added
- Adaptive drills: weaker hand gets prioritised when generating drill text.
- Hand analytics + new dashboard panels.

### Changed
- Scaled all text 20% via root font-size.

## [1.0.3] — 2026-05-12

### Added
- Adaptive drills prioritise the weaker hand based on session analytics.

## [1.0.2] — 2026-05-11

### Changed
- Typing text size increased ~20%.

## [1.0.1] — 2026-05-10

### Fixed
- Raw JSON occasionally rendered in the tip box.

## [1.0.0] — 2026-05-09

### Added
- Semver version display in the bottom-right corner.
- Stats dashboard, adaptive drills, hand analytics, AI tips via Claude Haiku, PIN profiles, XP/achievements, error heatmap keyboard, visual keyboard, progressive level unlocking, cloud persistence (Vercel Blob), passages library, drill mode, celebrations, and the core typing engine.

[Unreleased]: https://github.com/stuarthopwood/typing-trainer/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/stuarthopwood/typing-trainer/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/stuarthopwood/typing-trainer/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/stuarthopwood/typing-trainer/compare/v1.0.9...v1.1.0
[1.0.9]: https://github.com/stuarthopwood/typing-trainer/compare/v1.0.8...v1.0.9
[1.0.8]: https://github.com/stuarthopwood/typing-trainer/compare/v1.0.7...v1.0.8
[1.0.7]: https://github.com/stuarthopwood/typing-trainer/compare/v1.0.6...v1.0.7
[1.0.6]: https://github.com/stuarthopwood/typing-trainer/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/stuarthopwood/typing-trainer/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/stuarthopwood/typing-trainer/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/stuarthopwood/typing-trainer/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/stuarthopwood/typing-trainer/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/stuarthopwood/typing-trainer/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/stuarthopwood/typing-trainer/releases/tag/v1.0.0
