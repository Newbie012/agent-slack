# @eliya-oss/agent-slack

## 0.1.16

### Patch Changes

- c945387: On macOS, Slack tokens are now always stored in the Keychain (encrypted at rest); plaintext file storage is not allowed. `AGENT_SLACK_TOKEN_STORE=file` is rejected on macOS, so a token is never written to disk in the clear. Only profile metadata is written to disk. Other platforms continue to use a `0600` file.

  No migration: run `agent-slack auth login` once on macOS to store the token in the Keychain, and remove any old `profiles.json` by hand.

- c945387: `agent-slack auth logout` now revokes the token on Slack before removing the local profile, so logging out actually invalidates the credential instead of only forgetting it. Revocation is best-effort: if it fails (offline, or an already-invalid token) the profile is still removed and a warning is returned. Pass `--no-revoke` to skip revocation and only remove the profile locally.
- edc4900: Support Slack token rotation. When the Slack app rotates tokens, browser (PKCE) logins now store the refresh token and expiry and automatically refresh the access token just before it expires, so sessions survive expiry without re-running `auth login`, and a stranded token lapses on its own. Refresh tokens are stored as secrets (Keychain on macOS, `0600` file elsewhere). Tokens from `--oauth` (confidential client) can't be refreshed automatically (their secret is never stored) and require re-login on expiry; static `--token` credentials are unaffected.

## 0.1.15

### Patch Changes

- a5d16e5: Make the bundled agent-slack skill agent-agnostic. The skill description no longer names a specific agent and instead lists the Slack contexts that should trigger it (reading or summarizing a thread or channel, finding a message, checking membership, pulling Slack context), which improves how reliably any agent picks it up. Also dropped a local-repo dev note that was noise for installed users.
- 75f96ad: Fix `agent-slack auth login` hanging after approval, and brand the callback page.

  Previously the CLI process could hang after a successful browser login because the local callback server kept a keep-alive socket open. It now closes the connection and exits cleanly.

  The page shown in the browser after approval is also branded instead of an unstyled line of text: a dark, centered page with the Agent Slack logo that blooms from grayscale to color on success (and stays grayscale on failure, with a message telling you to return to the terminal and retry). It respects `prefers-reduced-motion`.

## 0.1.14

### Patch Changes

- d856e3b: Two agent-facing discoverability improvements.

  - `describe --json` and `<command> --help --json` now report a `dataKey` for each command: the key under the response envelope's `data` that holds the primary payload (for example `conversation list` reports `dataKey: "channels"`, so results are at `data.channels`). Agents no longer have to probe the response shape.
  - Conversation results now keep `is_member` as an explicit boolean, so an agent can tell which channels the active token has joined directly from `conversation list`.

## 0.1.13

### Patch Changes

- 48d5879: Three CLI fixes for agents.

  - `agent-slack --version` now prints the version and exits 0 instead of raising a usage error.
  - `conversation list`, `conversation history`, and `conversation context` now advertise their pagination flags (`--all`, `--types`, `--limit`) in `describe --json` and `--help`, so agents can discover `--all` instead of only getting the first page.
  - `--include users,threads,permalinks` now works with `--format ndjson`: the hydrated users, threads, and permalinks are streamed as typed records (`slack.user`, `slack.thread`, `slack.permalink`) after the message lines. Previously they were only present with `--json` and silently dropped in ndjson.

## 0.1.12

### Patch Changes

- c48375b: The CLI now starts far faster. Every invocation used to load hundreds of separate module files, dominating the run time of even quick commands like `auth status`. The CLI now ships as a single bundled file, cutting cold start from over a second to about 45ms on a typical machine.

  No commands or output change.

## 0.1.11

### Patch Changes

- e01fe7d: Read commands now return slim, token-efficient output by default. Messages, users, files, and conversations are normalized to the fields that matter, and JSON is serialized compactly. On a real 30-day channel read this cut the payload by about 85% (6.4x smaller) with no loss of meaning.

  - `--full` returns the raw Slack objects when you need them.
  - `--pretty` restores indentation for humans.
  - `conversation context` now hydrates authors that appear only in thread replies, and warns via `warnings` when `users:read` is missing instead of returning bare IDs.
  - `thread get --include users,permalinks` now hydrates author names and per-message links (previously the flag was accepted but ignored).

  Note: this changes the default output shape of read commands. Pass `--full` to get the previous raw Slack objects.

## 0.1.10

### Patch Changes

- Use the hosted Agent Slack OAuth relay for default browser login.

## 0.1.9

### Patch Changes

- Support hosted HTTPS OAuth redirect relays for distributed Slack apps.

## 0.1.8

### Patch Changes

- Keep README auth onboarding focused on browser login and clean up auth help copy.

## 0.1.7

### Patch Changes

- Polish CLI, README, bundled skill, and agent docs copy.

## 0.1.6

### Patch Changes

- Clean up the command catalog output-mode copy.

## 0.1.5

### Patch Changes

- Update the bundled Agent Slack public Client ID used by PKCE browser login.

## 0.1.4

### Patch Changes

- Add Slack PKCE browser login.

  No-flag `auth login` now uses the bundled Agent Slack public Client ID with Slack OAuth PKCE for browser login without a client secret. Token setup and OAuth with app credentials remain available for bot-token, development, and self-hosted workflows.

## 0.1.3

### Patch Changes

- Open Slack OAuth login in the default browser by default.

  Headless flows can still use `--auth-url-out PATH` or `--no-open`, and the CLI now reads its displayed version from package metadata so releases stay in sync.

## 0.1.2

### Patch Changes

- Fix the displayed CLI version and make the human command catalog copy-safe in terminals.

## 0.1.1

### Patch Changes

- Expose `agent-slack` as the primary binary, add the `aslk` alias, and render human-friendly TTY output while preserving JSON for agent and piped runs.

## 0.1.0

### Minor Changes

- Initial public release of the Slack agent CLI.
