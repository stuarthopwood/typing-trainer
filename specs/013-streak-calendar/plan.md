# Implementation Plan: Streak Calendar

**Branch**: `013-streak-calendar` | **Date**: 2026-05-22 | **Spec**: [spec.md](./spec.md)

## Summary

GitHub-style activity heatmap + streak counters. Client-side aggregation from existing session data. No new APIs or dependencies.

## Technical Context

- Pure client-side feature; aggregates from `allSessions` already loaded on stats page
- New `lib/calendar.ts` for data aggregation + streak calculation
- New `components/StreakCalendar.tsx` for the grid + streak display
- Integrates into `app/stats/page.tsx`

## Constitution Check

| Principle | Compliance |
|-----------|-----------|
| I. Zero-Latency | PASS — stats page only, no typing surface impact |
| II. BDD Testing | PASS — streak logic unit-tested |
| IV. SOLID/KISS | PASS — single helper file + single component |
| V. Backendless | PASS — client-side aggregation only |
| VI. Dark-First/Mobile | PASS — horizontal scroll on mobile, dark palette |

## Files

| File | Purpose |
|------|---------|
| `lib/calendar.ts` | `buildCalendarData()`, `computeStreaks()` |
| `components/StreakCalendar.tsx` | Grid + streak display + tooltip |
| `app/stats/page.tsx` | Integration |
| `tests/calendar.test.ts` | BDD tests for streak logic |
