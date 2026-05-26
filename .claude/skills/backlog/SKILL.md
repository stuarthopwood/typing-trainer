---
name: backlog
description: Query and manage NeuralKeys work items via Second Brain MCP. Use when user says "what should I work on", "show backlog", "pick up a feature", "next issue", or invokes /backlog.
argument-hint: "show | pick <NK-SPEC-NNN> | bugs | quick-wins"
---

# vault-issues — Query and manage NeuralKeys work items via Second Brain MCP

Use the `second-brain` MCP server to find, read, pick up, and report on NeuralKeys issues and feature specs stored in Stuart's Obsidian vault.

## Available MCP Tools

- `mcp__second-brain__query_vault` — search vault by keyword, optional folder filter
- `mcp__second-brain__read_note` — read full note by path
- `mcp__second-brain__drop_note` — drop a note into the vault inbox
- `mcp__second-brain__list_notes` — list notes in a folder

## Issue Lifecycle

```
backlog → ready → in-progress → review → done
                                       → wont-fix
```

## Issue Location & Format

Issues live in: `Palace/Personal/Hobbies/Keyboards/Specs/`

Frontmatter contract:
```yaml
status: ready          # lifecycle state
type: bug | hotfix | feature | enhancement | spike | quick-win
priority: critical | high | medium | low
spec-id: NK-SPEC-NNN  # or NK-SPIKE-NNN, NK-BUG-NNN
```

## Commands

When the user says `/backlog`, follow this workflow:

### 1. Check for available work

```
mcp__second-brain__read_note({ path: "Palace/Personal/Hobbies/Keyboards/Specs/NK-SPEC-INDEX.md" })
```

Also check the backlog for bugs and quick wins:
```
mcp__second-brain__read_note({ path: "Palace/Personal/Hobbies/Keyboards/NeuralKeys Backlog.md" })
```

Display results as a prioritised list. Critical > High > Medium > Low.
Quick wins (`type: quick-win`) can jump the queue if estimated <30 mins.

### 2. Pick up an item

When choosing or told to work on a specific item:

1. Read the full spec:
```
mcp__second-brain__read_note({
  path: "Palace/Personal/Hobbies/Keyboards/Specs/<spec-filename>.md"
})
```

2. Signal pickup:
```
mcp__second-brain__drop_note({
  title: "<spec-id> picked up by NeuralKeys agent",
  type: "context",
  area: "personal",
  project: "NeuralKeys",
  source: "neuralkeys-agent",
  body: "- <spec-id> (<title>) moved to in-progress\n- Branch: <branch-name>\n- Started: <ISO-timestamp>"
})
```

3. Create a feature branch and begin implementation following the spec's acceptance criteria.

### 3. Report completion

After all acceptance criteria are met and tests pass:

```
mcp__second-brain__drop_note({
  title: "<spec-id> implementation complete",
  type: "summary",
  area: "personal",
  project: "NeuralKeys",
  source: "neuralkeys-agent",
  body: "- <spec-id> (<title>) implementation complete\n- PR: #<number> (or commit: <hash>)\n- Branch: <branch-name>\n- Tests: <count> passing, 0 failing\n- Acceptance criteria: all met\n- Notes: <any deviations or decisions>\n- Status: review"
})
```

### 4. Report blockers

If you hit a blocker or the spec is ambiguous:

```
mcp__second-brain__drop_note({
  title: "<spec-id> blocked — question for Stuart",
  type: "context",
  area: "personal",
  project: "NeuralKeys",
  source: "neuralkeys-agent",
  body: "- <spec-id> blocked\n- Question: <specific question>\n- Context: <what you tried>\n- Suggestion: <your recommendation>"
})
```

### 5. Report a discovered bug

If you find a bug while working:

```
mcp__second-brain__drop_note({
  title: "NeuralKeys bug: <short description>",
  type: "task",
  area: "personal",
  project: "NeuralKeys",
  source: "neuralkeys-agent",
  body: "- [ ] Fix: <description> #personal\n- Found while working on <spec-id>\n- Severity: <critical|high|medium|low>\n- Steps to reproduce: <steps>\n- Expected: <expected>\n- Actual: <actual>"
})
```

## Argument handling

- No argument or `show` → fetch index + backlog, present summary, ask user what to pick
- `pick <ID>` → read that spec and begin pickup workflow
- `bugs` → show only bugs from backlog
- `quick-wins` → show only quick wins from backlog

## Priority Processing

When multiple items are `ready`, pick based on:
1. `priority: critical` — do immediately
2. `priority: high` — do next
3. `priority: medium` — fill remaining capacity
4. `priority: low` — only if nothing higher
5. Within same priority: prefer items with fewer dependencies
6. Quick wins (`type: quick-win`) can jump the queue if <30 minutes

## Rules

- ALWAYS use `source: "neuralkeys-agent"` so vault processing can identify agent notes
- ALWAYS prefix body with `- <spec-id>` for matching
- NEVER modify vault files directly — only use `drop_note` to communicate
- Read the FULL spec before starting implementation
- Follow all constraints listed in the spec (especially Constitution Principles)
- Run BDD tests for each acceptance criterion
- If a spec references dependencies (other specs), check if they're `done` first
- If priority is `critical` or type is `hotfix`, implement immediately without waiting for queue

## Querying Tips

- Find all ready work: `query_vault({ query: "status: ready neuralkeys" })`
- Find bugs only: `query_vault({ query: "type: bug neuralkeys" })`
- Find quick wins: `query_vault({ query: "type: quick-win neuralkeys" })`
- Find the protocol doc: `read_note({ path: "Palace/Personal/Hobbies/Keyboards/Specs/NK-AGENT-PROTOCOL.md" })`
- Find the spec index: `read_note({ path: "Palace/Personal/Hobbies/Keyboards/Specs/NK-SPEC-INDEX.md" })`
- Check inbox for new tasks: `query_vault({ query: "NeuralKeys", folder: "+Inbox" })`
