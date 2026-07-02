# PKCE Slack Auth

> A user installs Agent Slack, asks an agent to connect Slack, approves access in the browser, and starts using Slack context without creating a Slack app.

## Problem

Normal users should not create Slack apps, copy client secrets, or understand OAuth internals. Agent Slack needs a browser login that works like a desktop CLI.

## Flow

1. User installs the CLI.
2. User or agent runs `agent-slack auth login`.
3. CLI opens Slack OAuth in the browser using PKCE.
4. User approves Slack user scopes.
5. Slack redirects to the local callback.
6. CLI exchanges the code with `code_verifier`, stores the user token locally, and never handles a client secret.
7. `agent-slack auth status --json` reports the connected profile and granted scopes.

## Contract

```bash
agent-slack auth login
agent-slack auth status --json
agent-slack conversation history C123 --limit 50 --json
```

Normal users do not provide `SLACK_CLIENT_ID` or `SLACK_CLIENT_SECRET`. The CLI includes the Agent Slack public Client ID. Local development may override it with `AGENT_SLACK_CLIENT_ID` or `--client-id`.

## Fallbacks

```bash
agent-slack auth login --token "$SLACK_BOT_TOKEN" --scopes channels:read,channels:history
agent-slack auth login --oauth --client-id "$SLACK_CLIENT_ID" --client-secret "$SLACK_CLIENT_SECRET"
```

Token setup supports bot-token workflows. OAuth with app credentials is for development and self-hosted setups.

## Requirements

- Browser login uses PKCE with `code_challenge_method=S256`.
- Browser login requests user scopes, not bot scopes.
- Default local callback is `http://localhost:45454/oauth/slack/callback`.
- No client secret is embedded in the CLI.
- Tokens are never printed to stdout or stderr.
- Local token storage keeps current file/keychain behavior.
- `--json` output remains valid JSON and token-free.
