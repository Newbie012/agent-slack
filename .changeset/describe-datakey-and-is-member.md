---
"@eliya-oss/agent-slack": patch
---

Two agent-facing discoverability improvements.

- `describe --json` and `<command> --help --json` now report a `dataKey` for each command: the key under the response envelope's `data` that holds the primary payload (for example `conversation list` reports `dataKey: "channels"`, so results are at `data.channels`). Agents no longer have to probe the response shape.
- Conversation results now keep `is_member` as an explicit boolean, so an agent can tell which channels the active token has joined directly from `conversation list`.
