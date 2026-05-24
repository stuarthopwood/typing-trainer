# Quickstart: Zen Mode

## Prerequisites

- Node 24 LTS, `npm ci`
- `.env.local` with `BLOB_READ_WRITE_TOKEN`, `PROGRESS_API_KEY`, `NEXT_PUBLIC_PROGRESS_API_KEY`, `ANTHROPIC_API_KEY`
- Existing PIN with sessions (for stats integration testing)

## Verify Before Implementation

```bash
# Confirm existing modes work
npm run dev
# → Navigate to localhost:3000, select Drill, type a session, verify completion

# Confirm AI tips work (same Anthropic pattern we're reusing)
# → Complete a session with 5+ errors, tip toast should appear
```

## After Implementation

### 1. Mode Selection

```
Navigate to localhost:3000
→ Mode selector shows 3 buttons: Drill | Passage | Zen
→ Without NEXT_PUBLIC_PROGRESS_API_KEY in .env.local: Zen button is hidden
→ With the key: Zen button visible
→ Click Zen → topic prompt appears above typing area
```

### 2. Topic Generation

```
→ Topic: "Describe your morning routine" (or similar)
→ Click "New Topic" → new topic appears, typing area clears
→ Verify: each topic is different, 5-10 words, open-ended question
```

### 3. Free Typing

```
→ Start typing in the zen typing area
→ Current line: large white text
→ Previous lines: fade to lower opacity
→ Below: scrollable response panel shows full text
→ Live stats: WPM + time + word count (no accuracy, no combo)
→ Done button: disabled until 20+ words
```

### 4. Spell-Check

```
→ Type "teh quikc brown fox jumps ovr the lazy dog"
→ After 5 words OR 1.5s pause: red underlines appear on misspelled words
→ Verify: "teh", "quikc", "ovr" get red underlines
→ Correctly spelled words: no underline
→ Response panel also shows underlines
```

### 5. Session Completion

```
→ Type 20+ words → Done button enables
→ Click Done
→ Final spell-check runs on any unchecked words
→ Session summary shows: WPM, time, word count, accuracy (spelling-based)
→ XP awarded, streak counted
```

### 6. Session Recording

```bash
# Verify session recorded with zen mode
curl -s "http://localhost:3000/api/sessions" \
  -H "x-api-key: $API_KEY" -H "x-user-pin: 6767" | jq '.sessions[0]'

# Verify zen session NOT counted in drill progress
# → Stats page: bestWpm should not change if zen WPM was higher
# → Drill level progress: unchanged
```

### 7. Password Manager Suppression

```
→ Open zen typing area
→ Verify: no 1Password/LastPass/Dashlane dropdown appears
→ Verify: no autofill suggestions on the textarea
```

### 8. Cancel Session

```
→ Start typing in zen mode
→ Click "New Topic" while typing
→ Session is cancelled (no data recorded)
→ New topic appears, typing area is empty
```

## Test Suite

```bash
npm test -- tests/zen.test.ts
npm test -- --coverage  # verify 80%+ on lib/zen.ts, components/ZenTypingArea.tsx
```

## Build & Deploy

```bash
npm run lint && npm test && npx tsc --noEmit && npm run build
git push origin 011-zen-mode
# PR to master, Vercel preview deploys
```
