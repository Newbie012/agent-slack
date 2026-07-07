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

On macOS, tokens are **always** stored in the Keychain. Plaintext file storage
is disallowed there: `AGENT_SLACK_TOKEN_STORE=file` on macOS is rejected with a
usage error rather than honored. On other platforms (no keychain adapter) the
`0600` file store is the default, with `keychain` honored if explicitly set.

The selection is a pure function, `selectTokenStoreKind(env, platform)`, so the
policy is unit-tested without touching the real keychain.

## Rationale

The token is the sensitive artifact. Storing it in cleartext on a platform that
offers an OS keychain is bad practice, so on macOS it is not permitted at all,
not even via an override. Encrypting at rest via the Keychain is the only option
there. Other platforms have no keychain adapter, so the `0600` file store stays
their default.

## Alternatives Considered

- **Keep file as the default** - leaves secrets in cleartext by default. Rejected.
- **Allow an `=file` override on macOS** (the first version of this decision) -
  rejected: it leaves a supported way to store plaintext on macOS, which is the
  practice we want to forbid.
- **Detect an interactive session** - the CLI is agent-first and usually runs
  with piped (non-TTY) stdout even on a GUI Mac, so TTY detection is unreliable.

## Consequences

- On macOS, logins always store the secret in the Keychain; only metadata lands
  in `~/.config/agent-slack/profiles.keychain.json`. There is no supported way to
  store the token in cleartext on macOS.
- Headless macOS (SSH, CI) needs an unlocked login keychain. There is no file
  fallback, so if the Keychain is unavailable the login fails rather than writing
  plaintext.
- No migration: an existing `profiles.json` is not read by the keychain store, so
  a one-time `agent-slack auth login` repopulates the Keychain. On macOS, remove a
  stale `profiles.json` by hand, since the CLI no longer uses the file store there.

## Revisit When

- A cross-platform secret store (libsecret, Windows Credential Manager) is added,
  then keychain storage could extend beyond macOS.
- A real headless-macOS use case cannot unlock the keychain and needs another
  encrypted-at-rest option.
