# API Contract: Zen Mode Endpoints

## `POST /api/zen-topic`

Generate a topic prompt for free-typing.

**Auth**: `x-api-key` header (same as other routes)

**Request body**: (empty or optional difficulty hint)
```json
{}
```

**Response 200**:
```json
{
  "topic": "Describe your favourite meal to cook"
}
```

**Response 401**: Unauthorized
**Response 500**: AI provider unavailable

**Behaviour**: Calls Anthropic Claude Haiku with a system prompt requesting a single open-ended question (5-10 words). Returns the generated topic.

---

## `POST /api/zen-spellcheck`

Check a batch of words for spelling errors.

**Auth**: `x-api-key` header

**Request body**:
```json
{
  "words": ["teh", "quick", "brown"],
  "context": "The teh quick brown fox jumped"
}
```

- `words`: array of 1-5 words to check
- `context`: surrounding sentence fragment for disambiguation (up to ~50 chars)

**Response 200**:
```json
{
  "results": [
    { "word": "teh", "correct": false, "suggestion": "the", "index": 0 },
    { "word": "quick", "correct": true, "index": 1 },
    { "word": "brown", "correct": true, "index": 2 }
  ]
}
```

**Response 401**: Unauthorized
**Response 422**: Invalid request (empty words array, >5 words)
**Response 500**: AI provider unavailable
**Response 504**: AI timeout (>3 seconds)

**Behaviour**: Calls Anthropic Claude Haiku with the words + context, asking for a JSON array of results per word. Timeout at 3 seconds — returns 504 if exceeded.

---

## Modified: `PUT /api/progress`

No changes to the endpoint itself. Zen sessions are recorded as regular `EnrichedSessionSummary` objects with `modeDetails.type = "zen"` and `modeDetails.topic = "..."`. The existing session-blob write path handles them transparently.

---

## Client-Side Contracts

### `lib/zen.ts` exports

```typescript
fetchZenTopic(): Promise<string | null>
// Calls POST /api/zen-topic, returns topic text or null on failure

checkSpelling(words: string[], context: string): Promise<SpellCheckResult[]>
// Calls POST /api/zen-spellcheck, returns results or empty on failure/timeout

buildZenSessionStats(
  keyStrokes: KeyStroke[],
  text: string,
  spellResults: Map<number, SpellCheckResult>,
  topic: string
): { wpm: number; accuracy: number; wordCount: number; duration: number; misspelledWords: string[] }
// Computes zen session metrics from collected data
```
