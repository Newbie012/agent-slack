---
"@eliya-oss/agent-slack": patch
---

On macOS, Slack tokens are now always stored in the Keychain (encrypted at rest); plaintext file storage is not allowed. `AGENT_SLACK_TOKEN_STORE=file` is rejected on macOS, so a token is never written to disk in the clear. Only profile metadata is written to disk. Other platforms continue to use a `0600` file.

No migration: run `agent-slack auth login` once on macOS to store the token in the Keychain, and remove any old `profiles.json` by hand.
