# Architecture

Build style: PRD-DD -> DDD -> TDD with Effect.

Read `.agents/prd/000-overview.md` and the owning PRD before changing this design.

## Stack

- TypeScript
- Node.js LTS
- `effect@beta`
- `@effect/platform-node@beta`
- `@slack/web-api`
- `@effect/vitest` or `vitest` with Effect test layers

Do not use Commander. The CLI runs on Effect and `@effect/platform-node`. The current implementation uses a metadata-driven parser so Slack-style flags can appear before or after subcommands and command metadata can directly power `describe --json`.

Why:

- Effect gives typed application boundaries and runtime integration without a second app framework.
- `@effect/platform-node` provides the Node runtime/platform layer for terminal, filesystem, process, and runtime execution.
- Effect models retries, rate limits, typed errors, streams, config, and dependency injection without adding separate libraries.
- Slack's official SDK still owns Slack compatibility. We wrap it behind a port instead of reimplementing Slack HTTP behavior.
- Agent Surface JSON help should come from our own command metadata registry, not from scraping generated human help.
- Revisit Effect's beta CLI module when its ergonomics match this command grammar. It remains a candidate for generated human help/completions once the parser contract stabilizes.

Current npm tags checked on 2026-07-02:

- `effect@beta`: `4.0.0-beta.93`
- `@effect/platform-node@beta`: `4.0.0-beta.93`
- `@slack/web-api`: `7.18.0`

## Domain Model

Core bounded contexts:

- `Auth`: profiles, token grants, scopes, team/user identity.
- `SlackApi`: method calls, cursor pagination, Slack errors, rate limits.
- `Catalog`: method metadata, required scopes, safety classification.
- `ConversationContext`: messages, threads, users, reactions, files, permalinks.
- `Output`: JSON envelope, NDJSON records, structured errors, exit codes.

Domain types should be branded:

- `TeamId`
- `EnterpriseId`
- `ChannelId`
- `UserId`
- `MessageTs`
- `SlackMethod`
- `ProfileName`
- `Scope`

Domain errors should be tagged:

- `NotAuthenticated`
- `MissingScope`
- `PermissionDenied`
- `SlackRateLimited`
- `SlackApiFailed`
- `InvalidPayload`
- `ResourceNotFound`
- `UnsafeMethodBlocked`

## Ports and Adapters

Domain services define ports:

```text
TokenStore
OAuthFlow
SlackWebApi
MethodCatalog
OutputWriter
Clock
```

Infrastructure adapters implement them:

```text
KeychainTokenStore
LocalhostOAuthFlow
SlackSdkWebApi
BundledMethodCatalog
TerminalOutputWriter
```

Rules:

- No Slack SDK objects in command handlers.
- No direct environment reads outside config loading.
- No direct filesystem/keychain/process access outside adapters.
- Commands orchestrate use cases; they do not contain Slack API details.

## Project Layout

```text
src/
  main.ts
  cli/
    args.ts
    metadata.ts
  domain/
    ids.ts
    errors.ts
    slack.ts
  application/
    auth.ts
    commands.ts
    execute.ts
    payload.ts
    slack-call.ts
  ports/
    TokenStore.ts
    OAuthFlow.ts
    FileDownloader.ts
    SlackWebApi.ts
    MethodCatalog.ts
  adapters/
    slack-sdk/
    profile-file/
    localhost-oauth/
    http-file-downloader/
    catalog/
  testing/
    driver.ts
    domains/
```

See `.agents/issues/BACKLOG.md` for subagent work packages and `.agents/testing.md` for the TestDriver architecture.

## First TDD Slices

1. `agent-slack api call api.test --payload '{}' --json`
   - red: invalid JSON returns exit code `2`
   - red: Slack `{ ok:false,error:"invalid_auth" }` maps to `PermissionDenied`
   - green: success returns the standard JSON envelope

2. `agent-slack auth status --json`
   - red: no profile returns `NotAuthenticated`
   - green: fake token store returns team/user/scope metadata

3. `agent-slack conversation history C123 --limit 2 --json`
   - red: `Retry-After` maps to `SlackRateLimited` and exit code `6`
   - green: cursor is normalized into `paging.next_cursor`

4. `agent-slack thread get --channel C123 --ts 1710000000.000100 --include users`
   - green: replies are fetched, user IDs are hydrated, output shape is deterministic

5. `agent-slack describe --json`
   - green: command schema includes args, flags, return schema, scopes, and safety classification

Test fidelity:

- Use fake Effect layers for exact failures, retries, rate limits, and unsupported Slack surfaces.
- Use Emulate Slack for high-fidelity Slack Web API and OAuth behavior.
- Use CLI black-box tests for stdout/stderr, exit codes, JSON envelopes, stdin payloads, and NDJSON.

## Effect Runtime Shape

`main.ts` should only assemble live services and run the CLI through the Effect runtime:

```ts
import { NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"
import { executeCli } from "./application/execute.js"
import { LiveAdapters } from "./adapters/live.js"

const program = Effect.promise(async () => {
  const result = await executeCli(process.argv.slice(2), LiveAdapters)
  process.stdout.write(result.stdout)
  process.stderr.write(result.stderr)
  process.exitCode = result.exitCode
})

NodeRuntime.runMain(program, { disableErrorReporting: true })
```

Use fake layers in tests. Run Slack SDK calls only at adapter boundaries with `Effect.tryPromise`, then convert unknown failures into tagged domain errors.

## Decision

Use Effect for runtime and application architecture. Keep the Slack SDK as an infrastructure adapter. Do not use Commander. Implement `describe --json` and `--help --json` from the same command metadata used by the parser.
