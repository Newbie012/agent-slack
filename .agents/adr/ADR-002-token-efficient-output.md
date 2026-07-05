# ADR-002 - Token-efficient output

- **Status:** `accepted`
- **Date:** 2026-07-05
- **PRDs:** PRD-001

## Context

The CLI's main consumer is an AI agent that pays per token for everything it
reads. Today read commands pass raw Slack objects straight through and serialize
JSON pretty-printed (2-space indent). Both are expensive:

- Raw `users.info` objects carry ~7 avatar URLs, color, status, tz, and team
  fields. Raw messages carry `blocks` (a structured duplicate of `text`),
  `client_msg_id`, `team`, and verbose `reactions`. `conversation context` also
  repeats thread roots already present in `messages`.
- Pretty-printing adds whitespace tokens to every payload.

An A/B measurement on a real channel (`proj-aidr`, 30 days: 42 messages, 32
threads, 11 users) showed the current output at 200,293 tokens. The same data as
slim normalized shapes serialized compactly was 29,284 tokens: an 85% reduction
(6.8x). Two summarizer agents given each form produced equivalent summaries, so
the dropped fields carry no reasoning value. Notably, the agent given the raw
payload refused to read it whole and pre-slimmed it itself first.

## Decision

Read commands return **slim normalized shapes by default**, and JSON is
**serialized compactly by default**.

- Normalize messages, users, thread replies, files, and conversations to the
  reasoning-relevant fields (see `../cli-api.md`).
- `conversation context` dedupes thread roots and hydrates every unique author,
  including those who appear only in thread replies.
- Serialize JSON compact (no indentation) for machine output. `--pretty`
  restores indentation for humans. Human TTY rendering is unchanged.
- `--full` bypasses normalization and returns raw Slack objects.
- Keys stay readable. Cryptic short keys were measured and rejected.
- When a command would return richer or more efficient results with a scope the
  active token lacks, surface that in `warnings` instead of failing silently.

## Rationale

85% fewer tokens with no measured quality loss. Readable keys cost ~1% over
cryptic keys while keeping output self-describing, which the agent-readable CLI
principles value. Compact-by-default serves the primary (agent) consumer;
`--pretty` and the human renderer still serve people.

## Alternatives Considered

- **Cryptic short keys** (`u`/`t`/`ts`): only ~1% smaller than readable slim
  keys, and they hurt agent and human clarity. Rejected.
- **Keep raw, rely on `--fields`**: field projection cannot trim a field across
  every element of an array (only by explicit index), so it cannot slim the
  common message/user arrays. Rejected as the default.
- **Keep pretty-printing**: leaves ~29% of the savings on the table. Rejected as
  the default; kept behind `--pretty`.

## Consequences

- Breaking change to the output shape and default serialization. Acceptable
  pre-1.0. Tests and docs are updated in the same slice.
- `--full` preserves access to raw objects for the rare case that needs them.
- Normalization is a pure `Output`-context transform, testable in isolation.

## Revisit When

- Slack adds server-side field selection that makes local trimming redundant.
- Agents routinely need `--full`, suggesting the slim shape drops a useful field.
