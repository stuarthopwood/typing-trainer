@AGENTS.md

# NeuralKeys

Web typing trainer — Stuart Hopwood. Repo: stuarthopwood/typing-trainer. Deployed on Vercel.

## Design rules

- SOLID, KISS, YAGNI
- Zero-latency keystrokes (memoized `Char`, `useRef` for keystroke array)
- Dark-first, mobile-friendly, no backend (localStorage + Blob)

## Git

- `master` = production, `dev` = preview
- All work on `dev` → PR → merge after CI green
- Branch protection enforces PR + CI on `master` (no direct push, no force push)
- Each PR gets a `v1.x.x` title suffix and matching label
- Every PR updates `CHANGELOG.md` under the matching version heading (Keep a Changelog format)
- After merge to `master`, tag the merge commit `vX.Y.Z` and push the tag

## Agent skills

- Issues: `docs/agents/issue-tracker.md`
- Triage: `docs/agents/triage-labels.md`
- Domain: `docs/agents/domain.md`

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->
