# PKCE Slack Auth

> A user installs Agent Slack, asks an agent to connect Slack, approves access in the browser, and starts using Slack context.

## Problem

Agent Slack needs a browser login that works like a desktop CLI: install, approve in Slack, and start reading allowed workspace context.

## Flow

1. User installs the CLI.
2. User or agent runs `agent-slack auth login`.
3. CLI opens Slack OAuth in the browser using PKCE.
4. User approves Slack user scopes.
5. Slack redirects to the HTTPS relay.
6. The relay forwards `code` and `state` to the local callback.
7. CLI exchanges the code with `code_verifier`, stores the user token locally, and never handles a client secret.
8. `agent-slack auth status --json` reports the connected profile and granted scopes.

## Contract

```bash
agent-slack auth login
agent-slack auth status --json
agent-slack conversation history C123 --limit 50 --json
```

The CLI includes the Agent Slack public Client ID. Local development may override it with `AGENT_SLACK_CLIENT_ID` or `--client-id`.

## Fallbacks

```bash
agent-slack auth login --token "$SLACK_BOT_TOKEN" --scopes channels:read,channels:history
agent-slack auth login --oauth --client-id "$SLACK_CLIENT_ID" --client-secret "$SLACK_CLIENT_SECRET"
```

Token setup supports bot-token workflows. OAuth with app credentials is for development and self-hosted setups.

## Requirements

- Browser login uses PKCE with `code_challenge_method=S256`.
- Browser login requests user scopes, not bot scopes.
- Distributed browser login uses `https://aslk.vercel.app/oauth/slack/callback` as the public HTTPS redirect URI.
- Default local callback is `http://localhost:45454/oauth/slack/callback`.
- No client secret is embedded in the CLI.
- Tokens are never printed to stdout or stderr.
- Local token storage defaults to the macOS Keychain (encrypted at rest) and falls back to a `0600` file on other platforms; `AGENT_SLACK_TOKEN_STORE` overrides either way.
- Logging out revokes the token on Slack by default (best-effort) before removing the local profile, so a logout invalidates the credential rather than only forgetting it; `--no-revoke` opts out.
- When the Slack app uses token rotation, browser (PKCE) logins auto-refresh their expiring token before use and persist the rotated token, so sessions survive expiry without re-login. Confidential (`--oauth`) tokens cannot be refreshed without the client secret (never stored) and require re-login on expiry.
- `--json` output remains valid JSON and token-free.
