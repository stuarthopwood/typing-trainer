# Data Model: XP Level Badges

## Entities

### BadgeIconLayer

Represents a single FontAwesome layer within a badge icon composition.

| Field | Type | Description |
|-------|------|-------------|
| icon | IconDefinition | FA icon (imported from @fortawesome/free-solid-svg-icons) |
| transform | string? | FA transform string (e.g. "shrink-6 up-2") |
| color | string? | CSS colour value or CSS variable reference |
| opacity | number? | 0-1 for locked/faded layers |

### BadgeDefinition

Static configuration for a single badge. Defined once in `lib/badges.ts`.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Kebab-case identifier (e.g. "caveman", "hunt-and-pecker") |
| name | string | Display name (e.g. "Caveman") |
| subtitle | string | Snarky subtitle (e.g. "You discovered fire... and the keyboard") |
| level | number | XP level threshold (1-15) |
| layers | BadgeIconLayer[] | Ordered FA layers for the icon composition |

### BadgeProgress

Per-user persisted state for an earned badge.

| Field | Type | Description |
|-------|------|-------------|
| id | string | References BadgeDefinition.id |
| unlockedAt | string | ISO 8601 timestamp of when badge was earned |

## Storage

Stored within existing `ProgressData` in localStorage (`typing-trainer-progress` key):

```
ProgressData {
  ...existing fields...
  badges: BadgeProgress[]   // NEW — earned badges with timestamps
}
```

## Migration

On load, if `progress.badges` is `undefined`:
1. Initialize as empty array
2. Get current level from `getLevelFromXp(progress.xp)`
3. For each badge definition where `badge.level <= currentLevel`, push `{ id: badge.id, unlockedAt: new Date().toISOString() }`
4. Persist back to localStorage

## State Transitions

```
Badge: locked → unlocked (irreversible)

Trigger: session complete → XP awarded → level check
  IF newLevel > previousLevel
    FOR each badge where badge.level <= newLevel AND badge.id NOT IN progress.badges
      → push to progress.badges
      → fire toast + confetti
```

## Relationships

- BadgeDefinition (static, 15 entries) ← referenced by → BadgeProgress (dynamic, 0-15 entries per user)
- BadgeProgress lives inside ProgressData (same localStorage blob)
- Level thresholds derived from existing `getLevelFromXp()` — no duplication
