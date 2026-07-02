---
name: agent-slack
description: "Use when Codex needs Slack context through the `agent-slack` CLI: authenticate, inspect profiles/scopes, read channels, messages, threads, files, users, search context, or call Slack Web API methods with JSON or NDJSON output."
---

# agent-slack CLI

Use `agent-slack` as the Slack context boundary. `aslk` is the short alias. Prefer read-only commands. The CLI can only return data allowed by the active token, scopes, channel membership, workspace policy, and Slack plan.

## Workflow

1. Check availability: `agent-slack describe --json`.
2. Check auth: `agent-slack auth status --json`.
3. If auth is missing, ask the user to run `agent-slack auth login`. It opens Slack in the browser with PKCE and stores a local Slack profile.
4. Use specific read commands before raw API calls.
5. Use `--json` for bounded results and `--format ndjson` for large context streams.
6. Read structured errors from stderr; do not parse progress text from stdout.

## Onboarding

Browser login:

```bash
agent-slack auth login
```

Agent Slack opens Slack in the browser with PKCE and stores a local Slack profile. Users should not create a Slack app or handle `client-id`/`client-secret`.

Token setup:

```bash
agent-slack auth login --token "$SLACK_BOT_TOKEN" --scopes channels:read,channels:history,users:read --json
```

This stores an existing Slack bot token as a local profile.

Developer/self-hosted fallback:

1. Create or open a Slack app at https://api.slack.com/apps.
2. Go to **OAuth & Permissions**, add the needed bot scopes, install the app to the workspace, and copy the bot token.
3. For OAuth auth, get the **Client ID** and **Client Secret** from **Basic Information > App Credentials** in that Slack app, then run:

```bash
agent-slack auth login --oauth --client-id "$SLACK_CLIENT_ID" --client-secret "$SLACK_CLIENT_SECRET" --json
```

Treat Slack app creation and client credentials as an advanced developer fallback only.

## Common Commands

```bash
agent-slack conversation history C123 --limit 50 --json
agent-slack thread get --channel C123 --ts 1710000000.000100 --include users,permalinks --json
agent-slack conversation context C123 --include users,threads,permalinks --format ndjson
agent-slack file download F123 --out ./artifact.bin --json
agent-slack user get U123 --json
agent-slack api call conversations.info --payload '{"channel":"C123"}' --json
```

## Safety

- Treat `agent-slack api call` as the escape hatch for missing wrappers.
- Do not pass write/admin-mutating Slack methods unless the user explicitly asks for mutation and accepts `--allow-write --yes`.
- Never print token values. `auth status` reports token presence and scopes without secrets.
- For local repo development, use `pnpm agent-slack -- ...` from the repository root instead of global `agent-slack`.
