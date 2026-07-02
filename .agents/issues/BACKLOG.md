# Backlog

GitHub-issue-ready implementation slices for PRD-covered behavior.

Shared constraints:

- Product behavior must be covered by `.agents/prd/` first.
- Effect-first: `effect@beta`, `@effect/platform-node@beta`, and a metadata-driven parser. Revisit `effect/unstable/cli` when its grammar fits this command contract.
- DDD lives in `.agents/architecture.md`; TDD/TestDriver strategy lives in `.agents/testing.md`.
- No Commander.
- Slack SDK is an adapter behind ports.
- Emulate Slack is the default high-fidelity external Slack boundary.

## Merge Order

1. Contracts and package skeleton.
2. Testing harness.
3. Feature slices that depend on the contracts.
4. Live adapter polish and packaging.

---

# ISSUE-001 - Scaffold Effect CLI foundation

- **Status:** `done`
- **Labels:** `area:foundation`, `kind:implementation`, `parallel-safe`
- **PRDs:** `../prd/001-agent-readable-slack-interface.md`
- **ADRs:** `../adr/ADR-001-effect-ddd-cli.md`

## Goal

Create the project skeleton, Effect runtime entrypoint, domain primitives, and core ports so other slices can build in parallel.

## Scope

```text
package.json
tsconfig.json
src/main.ts
src/domain/
src/ports/
src/adapters/live.ts
  src/cli/args.ts
  src/cli/metadata.ts
```

## Implementation Notes

- Initialize TypeScript, Effect beta, platform-node beta, Slack SDK packages, and test tooling.
- Define branded IDs: `TeamId`, `EnterpriseId`, `ChannelId`, `UserId`, `MessageTs`, `SlackMethod`, `ProfileName`, `Scope`.
- Define tagged errors: `NotAuthenticated`, `MissingScope`, `PermissionDenied`, `SlackRateLimited`, `SlackApiFailed`, `InvalidPayload`, `ResourceNotFound`, `UnsafeMethodBlocked`.
- Define ports: `TokenStore`, `OAuthFlow`, `SlackWebApi`, `MethodCatalog`, `OutputWriter`.
- Create minimal `agent-slack describe --json` placeholder through the metadata registry.

## Tests

- `pnpm typecheck`
- `pnpm test`
- CLI smoke: `agent-slack describe --json` returns a valid JSON envelope.

## Done

- [x] PRD behavior is still accurate, or the PRD was updated first.
- [x] Typecheck passes.
- [x] Empty test suite runs.
- [x] `agent-slack describe --json` works.
- [x] Follow-up issues exist for known gaps.

---

# ISSUE-002 - Build TestDriver harness with Emulate Slack

- **Status:** `done`
- **Labels:** `area:testing`, `kind:test-harness`, `parallel-safe`
- **PRDs:** `../prd/001-agent-readable-slack-interface.md`
- **ADRs:** `../adr/ADR-001-effect-ddd-cli.md`

## Goal

Create the shared TestDriver API, fake Effect layers, and Emulate Slack lifecycle required by behavior tests.

## Scope

```text
src/testing/
tests/
vitest.config.ts
vitest.setup.ts
emulate.config.yaml
```

## Implementation Notes

- Create aggregate `SlackCliTestDriver`.
- Add sub-drivers: `cli`, `slack`, `auth`, and `emulate`.
- Add `driver.cli.run`, `driver.cli.runJson`, and `driver.cli.runNdjson`.
- Add Slack arrange methods for workspace, user, channel, message, thread, token grant, OAuth app.
- Add auth helpers for seeded profiles.
- Add TestModels, generators, and mappers.
- Add Emulate startup/reset/close lifecycle.
- Document driver usage in `src/testing/README.md`.

## Tests

- A sample black-box CLI test using the driver.
- A sample Effect fake-layer test using the driver.
- Local-only TestDriver scorer: `node scripts/testdriver-score.mjs scan . --min-score 90 --json`.

## Done

- [x] Tests create fresh state per spec.
- [x] No TestModel aliases production DTOs, Slack SDK response types, or Emulate seed types.
- [x] Behavior tests use `// ARRANGE`, `// ACT`, `// ASSERT`.
- [x] No assertions are hidden in driver methods.
- [x] Scorer can run against the project root with `src/testing`, tests, and docs in view.

---

# ISSUE-003 - Implement output envelopes and structured errors

- **Status:** `done`
- **Labels:** `area:output`, `kind:implementation`, `parallel-safe`
- **PRDs:** `../prd/001-agent-readable-slack-interface.md`
- **ADRs:** `../adr/ADR-001-effect-ddd-cli.md`

## Goal

Make stdout/stderr, JSON envelopes, NDJSON, field projection, and exit codes reliable for agents.

## Scope

```text
src/application/output/
src/adapters/terminal/
src/domain/errors.ts
tests/output/
```

## Implementation Notes

- Implement success JSON envelope.
- Implement NDJSON record writer.
- Implement structured error writer on stderr.
- Implement exit-code mapping.
- Implement `--fields` projection.
- Respect stdout/stderr separation and `NO_COLOR`.

## Tests

- CLI black-box tests assert stdout is valid JSON only.
- Error tests assert stderr structured JSON and expected exit code.
- NDJSON tests parse each stdout line independently.

## Done

- [x] No progress/log output appears on stdout.
- [x] Structured failures map to stable exit codes.
- [x] JSON and NDJSON output are deterministic.

---

# ISSUE-004 - Implement generic Slack Web API caller

- **Status:** `done`
- **Labels:** `area:api`, `kind:implementation`, `parallel-safe`
- **PRDs:** `../prd/001-agent-readable-slack-interface.md`
- **ADRs:** `../adr/ADR-001-effect-ddd-cli.md`

## Goal

Provide full Slack Web API coverage through `agent-slack api call METHOD --payload ...`.

## Scope

```text
src/application/api/
src/adapters/slack-sdk/
src/cli/api.ts
tests/api/
```

## Implementation Notes

- Support inline JSON, `@file`, and `-` stdin payloads.
- Wrap `@slack/web-api` behind `SlackWebApi`.
- Support Slack API base URL override for Emulate.
- Map Slack `{ ok:false,error }` responses to typed errors.
- Block unsafe methods unless `--allow-write --yes`.
- Support `--raw`.

## Tests

- `api.test` works against Emulate.
- Invalid JSON exits `2`.
- `missing_scope` exits `4`.
- Unsafe write without flags exits with structured recovery info.

## Done

- [x] Raw payload input is first-class.
- [x] Slack SDK is only imported in the adapter.
- [x] Unsafe method blocking is covered by tests.

---

# ISSUE-005 - Implement auth profiles and OAuth flow

- **Status:** `done`
- **Labels:** `area:auth`, `kind:implementation`, `parallel-safe`
- **PRDs:** `../prd/001-agent-readable-slack-interface.md`
- **ADRs:** `../adr/ADR-001-effect-ddd-cli.md`

## Goal

Let operators create, inspect, and remove named Slack profiles.

## Scope

```text
src/application/auth/
src/adapters/keychain/
src/adapters/localhost-oauth/
src/cli/auth.ts
tests/auth/
```

## Implementation Notes

- Implement profiles.
- Implement `auth status`, `auth scopes`, `auth profiles list`, `auth logout`.
- Implement token storage adapter.
- Implement OAuth v2 localhost flow with configurable Slack OAuth base URL.
- Support Emulate OAuth for integration tests.
- Support token-seeded profiles in the TestDriver.

## Tests

- `auth status --json` works for seeded profile.
- No profile exits `4` with `NotAuthenticated`.
- Emulate OAuth exchange creates profile with bot token and optional user token.

## Done

- [x] Tokens are not stored in project files.
- [x] Profile inspection reports workspace, identity, token type, and scopes.
- [x] Emulate OAuth coverage exists.

---

# ISSUE-006 - Implement method catalog and schema introspection

- **Status:** `done`
- **Labels:** `area:catalog`, `kind:implementation`, `parallel-safe`
- **PRDs:** `../prd/001-agent-readable-slack-interface.md`
- **ADRs:** `../adr/ADR-001-effect-ddd-cli.md`

## Goal

Let agents discover commands, flags, scopes, safety, pagination, and output contracts at runtime.

## Scope

```text
src/application/catalog/
src/adapters/catalog/
src/cli/describe.ts
src/cli/metadata.ts
tests/catalog/
```

## Implementation Notes

- Create command metadata registry.
- Implement `agent-slack describe --json`.
- Implement group `describe --json`.
- Implement command `--help --json`.
- Implement `api methods list`.
- Implement `api method describe METHOD`.
- Include safety classification, scopes, payload schema when known, pagination behavior, output schema.

## Tests

- `agent-slack describe --json` exposes the full command catalog.
- `conversation history --help --json` includes args, flags, required scopes, and return schema.
- `api method describe conversations.replies --json` includes pagination and safety metadata.

## Done

- [x] Agent Surface-style JSON discovery works.
- [x] Command metadata changes are tested.
- [x] No generated human help is scraped for schema output.

---

# ISSUE-007 - Implement conversation and thread read commands

- **Status:** `done`
- **Labels:** `area:conversations`, `kind:implementation`, `parallel-safe`
- **PRDs:** `../prd/001-agent-readable-slack-interface.md`
- **ADRs:** `../adr/ADR-001-effect-ddd-cli.md`

## Goal

Let agents retrieve conversations, history, members, messages, permalinks, and complete threads.

## Scope

```text
src/application/conversations/
src/cli/conversation.ts
src/cli/thread.ts
tests/conversations/
tests/threads/
```

## Implementation Notes

- Implement `conversation list/get/members/history`.
- Implement `thread get`.
- Implement `message get` and `message permalink`.
- Support cursor pagination and `--all`.
- Support `--include users,reactions,files,permalinks`.
- Normalize deterministic output shapes.

## Tests

- Emulate-backed tests cover channel history and thread replies.
- Fake-layer tests cover rate-limited pagination because Emulate does not implement exact rate limiting.

## Done

- [x] Conversation and thread reads respect profile auth.
- [x] Pagination is resumable.
- [x] Output shapes are deterministic.

---

# ISSUE-008 - Implement agent context and search commands

- **Status:** `done`
- **Labels:** `area:context`, `kind:implementation`, `parallel-safe`
- **PRDs:** `../prd/001-agent-readable-slack-interface.md`
- **ADRs:** `../adr/ADR-001-effect-ddd-cli.md`

## Goal

Give agents compact context commands for channel summarization and search-driven retrieval.

## Scope

```text
src/application/search/
src/application/context/
src/cli/search.ts
tests/search/
tests/context/
```

## Implementation Notes

- Implement `conversation context`.
- Implement `search context`, `search messages`, `search files`.
- Prefer Real-time Search API when available; fall back only when explicitly configured.
- Hydrate users, reactions, files, thread refs, and permalinks.
- Stream large context as NDJSON.

## Tests

- Context output is deterministic and bounded.
- Tests assert high-level payloads, not internal service calls.
- Missing unsupported Emulate search surfaces are covered with fake `SlackWebApi` layers.

## Done

- [x] Agent context does not summarize content.
- [x] Large context can stream as NDJSON.
- [x] Search fallback behavior is explicit.

---

# ISSUE-009 - Implement files and secondary read surfaces

- **Status:** `done`
- **Labels:** `area:files`, `kind:implementation`, `parallel-safe`
- **PRDs:** `../prd/001-agent-readable-slack-interface.md`
- **ADRs:** `../adr/ADR-001-effect-ddd-cli.md`

## Goal

Cover file reads and secondary Slack read surfaces that agents commonly need.

## Scope

```text
src/application/files/
src/application/read-surfaces/
src/cli/file.ts
src/cli/read-surfaces.ts
tests/files/
tests/read-surfaces/
```

## Implementation Notes

- Implement file list/get/download/comments where Slack supports them.
- Implement reactions, pins, bookmarks, emoji, dnd.
- Mark unsupported or not-yet-emulated surfaces in method catalog.

## Tests

- Emulate-backed tests cover files, reactions, pins, bookmarks.
- Unsupported surfaces return structured `unsupported_method` or route through `api call` when Slack supports them.

## Done

- [x] Emulated surfaces have integration coverage.
- [x] Unsupported surfaces fail clearly.
- [x] File downloads do not leak data to stdout unless requested.

---

# ISSUE-010 - Write docs, packaging, and agent guidance

- **Status:** `done`
- **Labels:** `area:docs`, `kind:docs`, `parallel-safe`
- **PRDs:** `../prd/001-agent-readable-slack-interface.md`
- **ADRs:** `../adr/ADR-001-effect-ddd-cli.md`

## Goal

Make the project installable, runnable, and clear for humans and agents.

## Scope

```text
README.md
AGENTS.md
.agents/architecture.md
.agents/testing.md
.agents/cli-api.md
bin/
package scripts
```

## Implementation Notes

- Write install/dev/test docs.
- Document OAuth setup and Emulate setup.
- Add `AGENTS.md` command guide for coding agents.
- Add packaging scripts.
- Add release checklist.

## Tests

- A new agent can run tests from docs.
- A new agent can run one Emulate-backed CLI command from docs.

## Done

- [x] Docs list unsupported Slack/Emulate gaps clearly.
- [x] Commands are copy-pasteable.
- [x] Packaging scripts work locally.
