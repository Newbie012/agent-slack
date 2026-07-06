# ADR-007 - Support Slack token rotation (refresh) for PKCE logins

- **Status:** `accepted`
- **Date:** 2026-07-06
- **PRDs:** PRD-002

## Context

The Slack app enabled token rotation, so OAuth access tokens now expire (~12h)
and come with a refresh token. Without refresh support the CLI would break every
~12 hours (stored token expires, login required again). Rotation is also the
posture Slack encourages for Marketplace apps, and it means a stranded token dies
on its own instead of needing manual revocation.

## Decision

Support rotation for **PKCE / public-client** logins (the default browser flow):

- At login, capture the user token's `refresh_token`, `expires_in`, and the
  public `client_id` into the profile (`refreshToken`, `tokenExpiresAt`,
  `clientId`). These are only captured for a PKCE login.
- Refresh **lazily in `getProfile`** (which every command calls): if the token
  is within a 120s skew of expiry, exchange the refresh token via
  `oauth.v2.access` (`grant_type=refresh_token`, `client_id`, no secret),
  persist the rotated token, and return the fresh profile.
- A failed refresh throws `NotAuthenticated` ("run agent-slack auth login")
  rather than using a dead token.
- The refresh token is a secret: stored in the Keychain (macOS) or the `0600`
  file like the access token; `tokenExpiresAt`/`clientId` are non-secret metadata.

## Rationale

Refreshing in `getProfile` is a single choke point every command already passes
through, so no per-handler changes. Public-client refresh needs only
`client_id` + `refresh_token`, both non-secret, so it works without persisting a
client secret. The 120s skew avoids racing a just-expired token mid-command.

## Alternatives Considered

- **Refresh in `callSlack` / per handler** - more call sites, no central point.
- **Also refresh confidential (`--oauth`) tokens** - impossible without the
  client secret, which we deliberately never store. Those tokens are not marked
  refreshable; on expiry the user re-runs `auth login`.
- **Cross-process refresh lock** - avoided for now; Slack keeps the previous
  refresh token valid briefly, so concurrent invocations generally both succeed.

## Consequences

- PKCE logins survive rotation transparently (auto-refresh + persist).
- `--oauth` confidential and static `--token` logins are unchanged; a rotated
  confidential token that expires requires re-login.
- Concurrent CLI invocations can race on refresh; Slack's grace window usually
  absorbs it, but a losing invocation may error and need a re-run.

## Revisit When

- Concurrent-refresh races become common enough to need a cross-process lock.
- A way to refresh confidential tokens without persisting the secret appears.
