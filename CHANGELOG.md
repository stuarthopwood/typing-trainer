# Changelog

All notable changes to NeuralKeys are recorded here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- This `CHANGELOG.md`. Going forward every PR updates it and merges to `master` are tagged `vX.Y.Z`.

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

[Unreleased]: https://github.com/stuarthopwood/typing-trainer/compare/v1.1.1...HEAD
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
