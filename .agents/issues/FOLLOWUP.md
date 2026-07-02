# Follow-Up

Status after the first implementation pass on 2026-07-02.

## Completed

- TypeScript, Effect beta, platform-node beta, Slack SDK, Vitest, and package scripts.
- Domain primitives, typed domain errors, ports, live adapters, and fake test services.
- Metadata-driven CLI parser with `describe --json` and command/method discovery.
- Auth profile commands with token-seeded non-interactive login and file-backed profile storage.
- Optional macOS Keychain-backed token store with token-redacted profile metadata.
- Slack OAuth v2 localhost callback login with Emulate coverage.
- Emulate coverage for OAuth, conversation history, threads, files, reactions, pins, and bookmarks.
- Generic `api call` with inline JSON, `@file`, stdin, `--raw`, `--all`, NDJSON, and unsafe method gating.
- Read wrappers for conversations, threads, messages, search, files, reactions, pins, bookmarks, emoji, and DND.
- User, user group, team, and enterprise identity read wrappers.
- File download through `files.info` private URLs with bytes written only to `--out`.
- `conversation context` normalized payload with optional user, permalink, and thread hydration.
- Generated human help and shell completion output from command metadata.
- TestDriver harness with domain sub-drivers, TestModels, scorer, and behavior tests.
- Packaged build outputs `dist/main.js` and `bin/agent-slack`.

## Validated

```bash
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
node scripts/testdriver-score.mjs scan . --min-score 90 --json
node dist/main.js describe --json
node dist/main.js auth status --json
```

## Remaining

- Future hardening can still expand method catalog breadth, admin/Enterprise Grid surfaces, and release packaging.

## Decisions To Preserve

- No Commander.
- Slack SDK stays behind `SlackWebApi`.
- Product changes start in `.agents/prd/`, then DDD docs/ADR, then tests and code.
- The parser remains metadata-driven until Effect CLI can support the desired flag ergonomics.
