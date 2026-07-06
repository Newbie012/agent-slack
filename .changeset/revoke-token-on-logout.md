---
"@eliya-oss/agent-slack": patch
---

`agent-slack auth logout` now revokes the token on Slack before removing the local profile, so logging out actually invalidates the credential instead of only forgetting it. Revocation is best-effort: if it fails (offline, or an already-invalid token) the profile is still removed and a warning is returned. Pass `--no-revoke` to skip revocation and only remove the profile locally.
