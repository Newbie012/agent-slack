---
"@eliya-oss/agent-slack": patch
---

Support Slack token rotation. When the Slack app rotates tokens, browser (PKCE) logins now store the refresh token and expiry and automatically refresh the access token just before it expires, so sessions survive expiry without re-running `auth login`, and a stranded token lapses on its own. Refresh tokens are stored as secrets (Keychain on macOS, `0600` file elsewhere). Tokens from `--oauth` (confidential client) can't be refreshed automatically (their secret is never stored) and require re-login on expiry; static `--token` credentials are unaffected.
