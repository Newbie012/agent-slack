# Agent Slack CLI API

Technical contract derived from `.agents/prd/001-agent-readable-slack-interface.md`. Product behavior changes belong in PRD first.

Working binary name: `agent-slack`. Short alias: `aslk`.

Goal: OAuth into Slack, expose everything Slack Web API permissions allow, and give agents stable commands for reading channels, threads, files, users, and search context.

Non-goal for v0: agent-side summarization. The CLI returns clean context; agents summarize it.

## Design Rules

- Noun-verb commands: `agent-slack conversation history`, `agent-slack thread get`, `agent-slack api call`.
- JSON is always available with `--json`; non-TTY stdout defaults to JSON.
- Data goes to stdout. Progress, warnings, and errors go to stderr.
- Every command supports `--help --json`; every group supports `describe --json`.
- Large reads support `--cursor`, `--limit`, `--all`, and `--format ndjson`.
- Raw Slack Web API access is first-class through `agent-slack api call`.
- Read commands are safe by default. Any future write/destructive command needs `--yes`; `api call` blocks known write methods unless `--allow-write`.

## Global Flags

```bash
agent-slack [--profile NAME] [--team TEAM_ID] [--token user|bot|admin|app]
    [--json] [--format json|ndjson|table] [--fields FIELD[,FIELD...]]
    [--limit N] [--cursor CURSOR] [--all]
    [--include users,reactions,files,permalinks,threads]
    [--no-cache] [--trace]
```

Defaults:

- `--token user` for user-visible data.
- `--format json` when stdout is not a TTY.
- `--limit` uses Slack's method default unless a command defines a smaller agent-safe default.

## Auth

```bash
agent-slack auth login
agent-slack auth login --profile work --scopes channels:read,channels:history --user-scopes search:read.public,search:read.private
agent-slack auth login --oauth --client-id CLIENT_ID --client-secret CLIENT_SECRET --auth-url-out /tmp/agent-slack-auth-url
agent-slack auth login --oauth --client-id CLIENT_ID --client-secret CLIENT_SECRET --no-open
agent-slack auth status
agent-slack auth scopes
agent-slack auth profiles list
agent-slack auth logout --profile work
```

Auth behavior:

- Uses Slack OAuth v2 with a localhost callback.
- Opens the Slack OAuth URL in the default browser by default. Use `--no-open` to print the URL only, or `--auth-url-out PATH` for headless agents and tests.
- Bot scopes go in `scope=...`; user scopes go in `user_scope=...`.
- Stores profiles outside the project directory. The default store is `~/.config/agent-slack/profiles.json`; set `AGENT_SLACK_TOKEN_STORE=keychain` on macOS to keep token secrets in Keychain and only profile metadata on disk.
- Supports multiple profiles and workspaces.
- `auth status --json` returns token type, team, enterprise, user/bot identity, granted scopes, and missing recommended scopes.

Scope presets:

```bash
agent-slack auth login --preset read-user
agent-slack auth login --preset read-bot
agent-slack auth login --preset assistant-search
agent-slack auth login --preset admin-read
```

Preset intent:

- `read-user`: read what the installing user can access.
- `read-bot`: read conversations where the bot is present.
- `assistant-search`: use Slack's Real-time Search API for agent context retrieval.
- `admin-read`: Enterprise Grid admin read surfaces when installed by an org admin.

Important Slack boundary: there is no token that means "read all Slack." Slack only returns data allowed by the granted scopes, token type, workspace/org install, channel membership, and Slack plan/admin policy.

## Core Read Commands

### Workspaces and identity

```bash
agent-slack auth test
agent-slack team get
agent-slack team profile get
agent-slack enterprise get
```

### Users

```bash
agent-slack user list [--all]
agent-slack user get USER_ID
agent-slack user lookup --email EMAIL
agent-slack user presence get USER_ID
agent-slack usergroups list
agent-slack usergroups users list USERGROUP_ID
```

### Conversations

```bash
agent-slack conversation list --types public_channel,private_channel,mpim,im [--all]
agent-slack conversation get CHANNEL_ID
agent-slack conversation members CHANNEL_ID [--all]
agent-slack conversation history CHANNEL_ID [--oldest TS] [--latest TS] [--all]
agent-slack conversation context CHANNEL_ID [--since 24h] [--include users,reactions,files,threads]
```

`conversation context` is the agent-friendly form: normalized messages, hydrated users, thread refs, file refs, reactions, and permalinks in one deterministic payload.

### Threads and messages

```bash
agent-slack thread get --channel CHANNEL_ID --ts MESSAGE_TS [--include users,reactions,files,permalinks]
agent-slack message get --channel CHANNEL_ID --ts MESSAGE_TS
agent-slack message permalink --channel CHANNEL_ID --ts MESSAGE_TS
```

`message get` wraps the Slack history/replies calls needed to fetch one timestamp.

### Search

```bash
agent-slack search context --query QUERY [--channel-types public_channel,private_channel,mpim,im] [--content-types messages,files,channels]
agent-slack search messages --query QUERY
agent-slack search files --query QUERY
```

Prefer `search context` for agents. It maps to Slack's Real-time Search API where available. `search messages` and `search files` are legacy-compatible convenience commands.

### Files and attached context

```bash
agent-slack file list [--channel CHANNEL_ID] [--user USER_ID] [--all]
agent-slack file get FILE_ID
agent-slack file download FILE_ID --out PATH
agent-slack file comments list FILE_ID
```

### Other readable Slack surfaces

```bash
agent-slack reaction get --channel CHANNEL_ID --ts MESSAGE_TS
agent-slack pin list CHANNEL_ID
agent-slack bookmark list CHANNEL_ID
agent-slack canvas list [--channel CHANNEL_ID]
agent-slack canvas get CANVAS_ID
agent-slack list list [--channel CHANNEL_ID]
agent-slack list get LIST_ID
agent-slack emoji list
agent-slack reminder list
agent-slack star list
agent-slack dnd status [USER_ID]
```

## Generic Web API Escape Hatch

This is what gives full Web API coverage.

```bash
agent-slack api methods list [--family conversations]
agent-slack api method describe conversations.history
agent-slack api call conversations.history --payload '{"channel":"C123","limit":50}'
agent-slack api call conversations.history --payload @payload.json
cat payload.json | agent-slack api call conversations.history -
```

Rules:

- `--payload`, `@file`, and `-` pass raw JSON matching Slack's API fields.
- Convenience flags may be added later, but raw payload always wins coverage.
- `--raw` returns Slack's exact response body.
- Without `--raw`, responses use the CLI envelope below.
- `--all --format ndjson` streams item records for cursor-paginated methods.
- Known write/admin-mutating methods require `--allow-write --yes`.

## Output Contract

Default JSON envelope:

```json
{
  "ok": true,
  "method": "conversations.history",
  "team_id": "T123",
  "enterprise_id": null,
  "profile": "work",
  "data": {},
  "paging": {
    "next_cursor": null,
    "has_more": false
  },
  "warnings": []
}
```

NDJSON streaming record:

```json
{"ok":true,"type":"slack.message","team_id":"T123","channel_id":"C123","ts":"1710000000.000100","data":{}}
```

Structured error on stderr:

```json
{
  "ok": false,
  "error": {
    "type": "rate_limited",
    "title": "Slack rate limit reached",
    "slack_error": "ratelimited",
    "retriable": true,
    "retry_after_seconds": 60,
    "suggestion": "Retry after the provided delay or use --limit with a smaller page size.",
    "trace_id": "slk_..."
  }
}
```

Exit codes:

- `0`: success
- `1`: runtime/API failure
- `2`: usage or validation error
- `3`: not found
- `4`: auth or permission denied
- `5`: conflict or invalid Slack state
- `6`: rate limited

Rate-limit behavior:

- Honor Slack `Retry-After` headers.
- Return exit code `6` with `retry_after_seconds` when Slack throttles.
- `conversation history`, `thread get`, and `api call conversations.replies` must support resumable pagination.
- Commercial non-Marketplace apps can have much stricter `conversations.history` and `conversations.replies` limits than internal or Marketplace apps.

## Schema Introspection

```bash
agent-slack describe --json
agent-slack conversation describe --json
agent-slack conversation history --help --json
agent-slack api method describe conversations.replies --json
```

Schema output includes:

- command description and examples
- positional args and flags
- raw payload schema when known
- required Slack method/scopes
- output schema
- pagination behavior
- safety classification: `read`, `write`, `destructive`, or `admin`

## Agent Workflows

Read a thread:

```bash
agent-slack thread get --channel C123 --ts 1710000000.000100 --include users,reactions,files,permalinks --json
```

Prepare channel-summary input:

```bash
agent-slack conversation context C123 --since 24h --include users,reactions,files,threads --format ndjson
```

Search before reading:

```bash
agent-slack search context --query "latest on project atlas" --content-types messages,files --json
```

Call a new Slack method before the CLI has a wrapper:

```bash
agent-slack api call some.newMethod --payload @request.json --json
```

## Build Order

1. Auth profiles, keychain storage, and `auth test/status/scopes`.
2. Generic `api call`, raw payload input, JSON envelope, structured errors.
3. `describe --json` and generated method catalog.
4. Conversation, thread, user, file, and search convenience commands.
5. Agent context commands with hydration and NDJSON streaming.
6. Admin/read-extra surfaces and write-gated API calls.

## References

- Agent Surface CLI design: https://agentsurface.dev/docs/cli-design
- Agent Surface schema introspection: https://agentsurface.dev/docs/cli-design/schema-introspection
- Slack OAuth: https://docs.slack.dev/authentication/installing-with-oauth
- Slack Web API methods: https://docs.slack.dev/reference/methods/
- Slack Real-time Search API: https://docs.slack.dev/apis/web-api/real-time-search-api
