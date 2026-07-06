# ADR-006 - Revoke the token on logout by default

- **Status:** `accepted`
- **Date:** 2026-07-06
- **PRDs:** PRD-002

## Context

`auth logout` only deleted the local profile. The token stayed valid on Slack
until it aged out or was revoked by hand in Slack's app management, so "logging
out" did not actually invalidate the credential, a weak posture for a
credential tool.

## Decision

`auth logout` revokes the token on Slack (Web API `auth.revoke`) before deleting
the local profile, by default. Details:

- Revocation is **best-effort**: if it fails (offline, or the token is already
  invalid) the local profile is still removed and a `warnings` entry is returned.
  Logout must never get stuck on a network call.
- Every token the profile holds (bot/user/admin/app) is revoked.
- `--no-revoke` skips revocation and only removes the profile locally.
- `logout` still requires `--yes` (it is destructive).

## Rationale

Default-on revoke is the safe, least-surprising meaning of "log out" for a tool
that stores workspace credentials: the token is dead afterward. `auth.revoke`
revokes the calling token with no extra scope, so it always works for a stored
token. Best-effort keeps logout reliable when Slack is unreachable. `--no-revoke`
covers the rare case of moving a token elsewhere.

## Alternatives Considered

- **Opt-in `--revoke`** - leaves the default insecure (token survives logout);
  most users would never pass it.
- **Route through the generic `callSlack` safety gate** - unnecessary; logout is
  already `--yes`-gated, so the revoke calls Slack directly and stays best-effort.

## Consequences

- Logout now makes a network call by default; offline logout still succeeds
  locally with a warning.
- Once revoked, the token cannot be reused, as intended.
- A token whose local profile was already deleted cannot be revoked by the CLI
  (the secret is gone); it must be revoked in Slack app management.

## Revisit When

- Revocation failures become common enough to warrant a retry or an explicit
  non-zero exit for the revoke step.
