---
name: agent-slack
description: "Use when Codex needs Slack context through the `agent-slack` CLI: authenticate, inspect profiles/scopes, read channels, messages, threads, files, users, search context, or call Slack Web API methods with agent-readable JSON or NDJSON output."
---

# agent-slack CLI

Use `agent-slack` as the Slack context boundary. `aslk` is the short alias. Prefer read-only commands and preserve Slack's permission model: the CLI can only return data allowed by the active token, scopes, channel membership, workspace policy, and Slack plan.

## Workflow

1. Check availability: `agent-slack describe --json`.
2. Check auth: `agent-slack auth status --json`.
3. If auth is missing, ask the user to run `agent-slack auth login --oauth`; it opens Slack OAuth in the browser by default. For headless flows use `--auth-url-out PATH` or `--no-open`.
4. Use specific read commands before raw API calls.
5. Use `--json` for bounded results and `--format ndjson` for large context streams.
6. Read structured errors from stderr; do not parse progress text from stdout.

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
