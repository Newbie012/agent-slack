---
"@eliya-oss/agent-slack": patch
---

Store Slack tokens in the macOS Keychain by default. On macOS the token secret is now encrypted at rest in the Keychain instead of a cleartext file; only profile metadata is written to disk. Other platforms keep the `0600` file store. Set `AGENT_SLACK_TOKEN_STORE=file` to force the file store (needed on headless macOS such as SSH or CI, where the Keychain would prompt), or `AGENT_SLACK_TOKEN_STORE=keychain` to force the Keychain.

Note: there is no migration from an existing `profiles.json`. Run `agent-slack auth login` once on macOS to store the token in the Keychain.
