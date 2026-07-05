---
"@eliya-oss/agent-slack": patch
---

Read commands now return slim, token-efficient output by default. Messages, users, files, and conversations are normalized to the fields that matter, and JSON is serialized compactly. On a real 30-day channel read this cut the payload by about 85% (6.4x smaller) with no loss of meaning.

- `--full` returns the raw Slack objects when you need them.
- `--pretty` restores indentation for humans.
- `conversation context` now hydrates authors that appear only in thread replies, and warns via `warnings` when `users:read` is missing instead of returning bare IDs.
- `thread get --include users,permalinks` now hydrates author names and per-message links (previously the flag was accepted but ignored).

Note: this changes the default output shape of read commands. Pass `--full` to get the previous raw Slack objects.
