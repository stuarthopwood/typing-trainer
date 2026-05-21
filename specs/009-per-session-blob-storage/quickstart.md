# Quickstart: Per-Session Blob Storage

## Prerequisites

- Node 24 LTS
- `npm ci` (dependencies installed)
- `.env.local` with `BLOB_READ_WRITE_TOKEN` and `PROGRESS_API_KEY`
- Existing PIN with sessions (PIN 6767 has 25 sessions on Blob)

## Verify Current State

```bash
# List existing session blobs (should be empty before implementation)
node -e "
const {list} = require('@vercel/blob');
require('dotenv').config({path:'.env.local'});
list({prefix:'neuralkeys/sessions/6767/', token:process.env.BLOB_READ_WRITE_TOKEN}).then(r=>console.log(r.blobs.length,'session blobs'));
"

# Check progress blob still has allSessions
curl -s https://typing-trainer-one.vercel.app/api/progress -H "x-api-key: $API_KEY" -H "x-user-pin: 6767" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log('allSessions:', d.allSessions?.length ?? 'absent')"
```

## After Implementation

```bash
# 1. Complete a session in the browser → should create an individual blob
node -e "
const {list} = require('@vercel/blob');
require('dotenv').config({path:'.env.local'});
list({prefix:'neuralkeys/sessions/6767/', token:process.env.BLOB_READ_WRITE_TOKEN}).then(r=>console.log(r.blobs.length,'session blobs'));
"

# 2. List sessions via API
curl -s https://typing-trainer-one.vercel.app/api/sessions -H "x-api-key: $API_KEY" -H "x-user-pin: 6767" | jq '.sessions | length'

# 3. Fetch single session
curl -s "https://typing-trainer-one.vercel.app/api/sessions?id=<uuid>" -H "x-api-key: $API_KEY" -H "x-user-pin: 6767" | jq '.wpm'

# 4. Delete a session
curl -s -X DELETE "https://typing-trainer-one.vercel.app/api/sessions?id=<uuid>" -H "x-api-key: $API_KEY" -H "x-user-pin: 6767"

# 5. Trigger migration of legacy allSessions
curl -s -X POST "https://typing-trainer-one.vercel.app/api/sessions?action=migrate" -H "x-api-key: $API_KEY" -H "x-user-pin: 6767" | jq '.'

# 6. Verify progress blob no longer has allSessions
curl -s https://typing-trainer-one.vercel.app/api/progress -H "x-api-key: $API_KEY" -H "x-user-pin: 6767" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log('allSessions:', d.allSessions?.length ?? 'absent')"
```

## Test Suite

```bash
npm test -- tests/sessions.test.ts
npm test -- --coverage
```

## Build & Deploy

```bash
npm run lint && npm test && npx tsc --noEmit && npm run build
git push origin 009-per-session-blob-storage
# PR to master, Vercel preview deploys automatically
```
