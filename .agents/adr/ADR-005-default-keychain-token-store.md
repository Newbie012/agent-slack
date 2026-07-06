# ADR-005 - Default token storage to the macOS Keychain

- **Status:** `accepted`
- **Date:** 2026-07-06
- **PRDs:** PRD-002

## Context

Slack tokens were stored by default in `~/.config/agent-slack/profiles.json` as
cleartext (file mode `0600`, dir `0700`). The macOS Keychain was available but
opt-in via `AGENT_SLACK_TOKEN_STORE=keychain`. For a tool that holds workspace
credentials, secure-at-rest by default is the better posture, especially ahead
of Marketplace distribution and security review.

## Decision

Default the token store to the OS keychain where it exists and fall back to the
file store elsewhere:

- macOS (`platform === "darwin"`): default to the Keychain store.
- Other platforms: default to the `0600` file store (no keychain adapter).
- An explicit `AGENT_SLACK_TOKEN_STORE` always wins: `keychain` or `file`.

The selection is a pure function, `selectTokenStoreKind(env, platform)`, so the
default is unit-tested without touching the real keychain.

## Rationale

The token is the sensitive artifact; encrypting it at rest via the OS keychain
beats a cleartext file even at `0600`. macOS is the primary developer platform
here, and the keychain adapter already exists. Keeping the file store as the
cross-platform fallback avoids breaking Linux/Windows, and the explicit override
keeps headless macOS working.

## Alternatives Considered

- **Keep file as the default, document keychain** - lowest risk, but leaves the
  secret in cleartext for everyone by default.
- **Always require keychain** - impossible: the adapter is macOS-only and throws
  elsewhere; would also break headless macOS.
- **Detect an interactive session and only then use keychain** - the CLI is
  agent-first and usually runs with piped (non-TTY) stdout even on a GUI Mac, so
  TTY detection would wrongly fall back to file for the common agent case.

## Consequences

- On macOS, new logins store the secret in the Keychain; only metadata lands in
  `~/.config/agent-slack/profiles.keychain.json`.
- **Headless macOS (SSH, CI) must set `AGENT_SLACK_TOKEN_STORE=file`** — the
  keychain needs an unlocked login session and can otherwise prompt or fail.
- No migration: an existing `profiles.json` is not read by the keychain store,
  so a one-time `agent-slack auth login` re-populates the keychain. Acceptable
  because there are no external installs yet.

## Revisit When

- A cross-platform secret store (libsecret, Windows Credential Manager) is added
  — then the keychain default could extend beyond macOS.
- Headless macOS becomes a common path and the CI/SSH override is too easy to miss.
