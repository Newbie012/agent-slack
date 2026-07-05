# ADR-004 - NDJSON enrichment records for --include

- **Status:** `accepted`
- **Date:** 2026-07-05
- **PRDs:** PRD-001

## Context

`conversation context` and `thread get` accept `--include users,threads,permalinks`
to hydrate a payload. In `--json` this works: the maps land in `data.users`,
`data.threads`, and `data.permalinks`. In `--format ndjson` they were silently
dropped: the ndjson path emits only the message item records and ignores the
hydration maps (and warnings). This is worse than useless for agents because the
`agent-slack` skill tells them to prefer `--format ndjson` for channel context,
so `--include users --format ndjson` fetched the users and then threw them away.

## Decision

In ndjson mode, after the message item lines, stream each hydration map as its
own typed record:

```json
{"type":"slack.user","data":{ ...slim or full user... }}
{"type":"slack.thread","data":{"ts":"<root_ts>","replies":[ ... ]}}
{"type":"slack.permalink","data":{"ts":"<ts>","permalink":"https://..."}}
```

Message lines stay as bare item objects (unchanged). Enrichment records carry a
`type` discriminator so a streaming consumer can route them. `--json` output is
unchanged.

## Rationale

NDJSON is a record stream, so representing each hydrated entity as its own record
fits the format better than trying to attach a map. It keeps message records
byte-for-byte unchanged (no consumer breakage), makes `--include` meaningful in
the mode the skill recommends, and reuses the same slim/full shaping as `--json`.

## Alternatives Considered

- **Reject `--include` with `--format ndjson`** (UsageError pointing to `--json`).
  Honest and cheap, but denies agents hydration in the streaming mode the skill
  steers them toward.
- **Docs only**: tell agents to use `--json` for hydration. Zero code, but leaves
  the runtime silently lossy and contradicts the skill's own guidance.
- **Denormalize onto each message** (attach the author object to every message
  record). Rejected: duplicates user data per message, against the
  token-efficiency goal of ADR-002.

## Consequences

- The ndjson stream is now heterogeneous: bare message objects plus typed
  enrichment records. Consumers that assumed every line was a message must branch
  on `type`.
- Warnings on the success path are still not surfaced in ndjson (executeCli only
  emits stderr on the error path). Out of scope here; tracked separately.
- `cli-api.md` documents the enrichment record shapes.

## Revisit When

- Message records themselves gain a `type` wrapper (would unify the stream).
- Success-path warnings need to reach ndjson consumers.
