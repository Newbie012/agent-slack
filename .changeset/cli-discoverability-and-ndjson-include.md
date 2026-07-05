---
"@eliya-oss/agent-slack": patch
---

Three CLI fixes for agents.

- `agent-slack --version` now prints the version and exits 0 instead of raising a usage error.
- `conversation list`, `conversation history`, and `conversation context` now advertise their pagination flags (`--all`, `--types`, `--limit`) in `describe --json` and `--help`, so agents can discover `--all` instead of only getting the first page.
- `--include users,threads,permalinks` now works with `--format ndjson`: the hydrated users, threads, and permalinks are streamed as typed records (`slack.user`, `slack.thread`, `slack.permalink`) after the message lines. Previously they were only present with `--json` and silently dropped in ndjson.
