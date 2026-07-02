# Testing Strategy

Tests follow the TestDriver Architecture skill.

Read the owning PRD and `.agents/architecture.md` before adding behavior tests.

Primary test kinds:

- CLI black-box tests: spawn the real `agent-slack` binary and assert exit code, stdout JSON/NDJSON, and stderr structured errors.
- Runtime/orchestration tests: run Effect use cases with fake layers for exact failures, time, retries, and rate limits.
- Emulate integration tests: run against a stateful local Slack Web API emulator.

## Fidelity Choices

Use the lowest fidelity that catches the bug:

- Pure domain tests for schemas, ID parsing, safety classification, and error mapping.
- Effect fake-layer tests for rate limits, retries, missing scopes, invalid payloads, and unsafe writes.
- CLI black-box tests for operator contract: args, stdin, stdout/stderr, exit codes, JSON envelopes.
- Emulate-backed tests for Slack API fidelity: OAuth, auth.test, conversations, messages, threads, users, files, reactions, pins, bookmarks.

Do not use live Slack in normal CI.

## Emulate Slack

Use Emulate as the default high-fidelity Slack boundary.

Relevant capabilities:

- Slack Web API emulation with channels, messages, threads, reactions, users, presence, files, pins, bookmarks, OAuth v2, and incoming webhooks.
- Programmatic startup via `createEmulator({ service: "slack", port })`.
- Seed config for teams, users, channels, bots, OAuth apps, tokens, incoming webhooks, and signing secret.
- `slack.strict_scopes: true` can force Slack-style `missing_scope` errors.
- `reset()` wipes state and replays seed data.

Known limits to cover with fake layers instead:

- Exact Slack rate limiting.
- Enterprise Grid admin APIs.
- Audit Logs, SCIM, Legal Holds.
- Socket Mode.
- User groups, reminders, stars, calls, canvases, lists, functions, workflows.
- Real paid-plan behavior.

## Required TestDriver Shape

```text
src/testing/
  driver.ts
  state.ts
  layer.ts
  README.md
  domains/
    auth/
      driver.ts
      model.ts
      index.ts
    cli/
      driver.ts
      model.ts
      index.ts
    slack/
      driver.ts
      model.ts
      index.ts
    emulate/
      driver.ts
      model.ts
      index.ts
```

Aggregate driver:

```text
driver.auth.setProfile
driver.auth.clearProfiles
driver.cli.run
driver.cli.runJson
driver.cli.runNdjson
driver.slack.createWorkspace
driver.slack.createUser
driver.slack.createChannel
driver.slack.createMessage
driver.slack.createThread
driver.slack.createTokenGrant
driver.emulate.start
driver.emulate.reset
driver.emulate.close
```

Driver method rules:

- Use one options object for public methods.
- Use consistent prefixes: `create`, `set`, `link`, `override`, `failNext`, `run`, `get/list/find`, `drain`, `snapshot`.
- Driver reads must be source-backed: CLI output, Emulate API, Effect service output, or emitted events.
- Do not add `expect*` or `assert*` driver methods.

## TestModels

Every created entity gets a decoupled TestModel, generator, and mapper when needed:

```text
WorkspaceTestModel       generateWorkspaceTestModel       toEmulateWorkspaceSeed
SlackUserTestModel       generateSlackUserTestModel       toEmulateUserSeed
SlackChannelTestModel    generateSlackChannelTestModel    toEmulateChannelSeed
SlackMessageTestModel    generateSlackMessageTestModel    toSlackMessagePayload
SlackThreadTestModel     generateSlackThreadTestModel     toSlackThreadMessages
TokenGrantTestModel      generateTokenGrantTestModel      toEmulateTokenSeed
OAuthAppTestModel        generateOAuthAppTestModel        toEmulateOAuthAppSeed
CliRunTestModel          generateCliRunTestModel          toCliRunOptions
```

TestModels must not alias Slack SDK response types, Emulate seed types, production DTOs, or CLI envelopes.

## Example Spec Shape

```ts
it.effect("reads a thread with hydrated users", () =>
  Effect.gen(function* () {
    const driver = yield* SlackCliTestDriver

    // ARRANGE
    const user = yield* driver.slack.createUser({ model: { name: "dev" } })
    const channel = yield* driver.slack.createChannel({ model: { name: "eng" } })
    const thread = yield* driver.slack.createThread({
      model: { channelId: channel.id, authorId: user.id, replyCount: 2 }
    })
    yield* driver.auth.setProfile({ scopes: ["channels:read", "channels:history", "users:read"] })

    // ACT
    const result = yield* driver.cli.runJson({
      args: ["thread", "get", "--channel", channel.id, "--ts", thread.parentTs, "--include", "users", "--json"]
    })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.envelope.ok).toBe(true)
    expect(result.envelope.data.messages).toHaveLength(3)
    expect(result.envelope.data.users).toContainEqual(expect.objectContaining({ id: user.id }))
  }).pipe(freshTestLayer)
)
```

Assertions stay in the test body.

## Test File Organization

Use domain/feature names, kebab-case:

```text
tests/
  api/
    raw-payload-input.spec.ts
    unsafe-method-blocking.spec.ts
  auth/
    profile-status.spec.ts
    oauth-login.spec.ts
  conversations/
    history-pagination.spec.ts
    members.spec.ts
  threads/
    thread-read.spec.ts
  output/
    json-envelope.spec.ts
    structured-errors.spec.ts
  schema/
    describe-json.spec.ts
```

Avoid chronology names such as `phase-1.spec.ts`.

## Emulate Seed

Keep a small default seed in `emulate.config.yaml`:

```yaml
slack:
  strict_scopes: true
  team:
    name: Test Workspace
    domain: test-workspace
  users:
    - name: developer
      real_name: Developer
      email: dev@example.com
      is_admin: true
  channels:
    - name: general
      topic: General discussion
    - name: engineering
      topic: Engineering discussion
  oauth_apps:
    - client_id: "12345.67890"
      client_secret: example_client_secret
      name: Agent Slack Test App
      redirect_uris:
        - http://localhost:3000/oauth/slack/callback
      scopes:
        - channels:read
        - channels:history
        - groups:read
        - groups:history
        - im:read
        - im:history
        - mpim:read
        - mpim:history
        - users:read
        - users:read.email
        - files:read
        - reactions:read
        - pins:read
        - bookmarks:read
  tokens:
    - token: xoxb-local-test
      user: developer
      scopes:
        - channels:read
        - channels:history
        - users:read
```

Tests can generate richer state through `driver.slack.*` methods. Hand-written seed files stay minimal.

## Required Test Commands

```bash
pnpm test
pnpm test:emulate
pnpm test:coverage
pnpm typecheck
pnpm build
```

The TestDriver scorer is a local review tool, not a release artifact. If copied into `scripts/testdriver-score.mjs`, it is ignored by git and can be run manually:

```bash
node scripts/testdriver-score.mjs scan . --min-score 90 --json
node scripts/testdriver-score.mjs scan . --plan
```

The scorer target is the project root so it can see the driver, tests, and docs together. The scorer is a signal, not a replacement for reviewing representative tests.

## What Not To Do

- Do not mock Slack inside tests that claim Slack integration fidelity. Use Emulate.
- Do not use live Slack in CI.
- Do not assert raw internal state for behavior tests.
- Do not let tests construct Slack SDK DTOs directly.
- Do not hide assertions in driver helpers.
- Do not add test-only branches to production code.
- Do not use random test data without deterministic seeding.
