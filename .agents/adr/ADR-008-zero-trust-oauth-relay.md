# ADR-008 - Zero-trust OAuth relay

- **Status:** `accepted`
- **Date:** 2026-07-06
- **PRDs:** PRD-002

## Context

Distributed browser login routes Slack's redirect through a hosted relay
(`aslk.vercel.app`) because Slack requires an HTTPS redirect URI and
`http://localhost` is not HTTPS. The relay is shared infrastructure every login
passes through, so it must not be a trusted component: if it were compromised it
should not be able to obtain tokens.

## Decision

Treat the relay as untrusted. The library's trust boundary is the local machine
and Slack only.

- **Tokens never transit the relay.** The PKCE token exchange and every refresh
  happen directly between the CLI and Slack. The `code_verifier` is generated
  locally and sent only to Slack, so a captured authorization code is not
  exchangeable by the relay.
- **The relay holds no secrets and is stateless.** No client secret (public
  PKCE client), no tokens, no persistence, `cache-control: no-store`.
- **The relay is hardened as defense in depth.** Its pages send a strict CSP
  with a per-request nonce and `referrer-policy: no-referrer`, so injected
  scripts or styles without the nonce cannot run.
- **A relay-free path is a first-class option.** Registering a `http://localhost`
  redirect URI on the Slack app and passing `--redirect-uri` skips the relay
  entirely, removing it from the trust path.

## Rationale

PKCE already prevents the relay from turning an honest login's code into a
token. Keeping the relay secret-free and stateless means a compromise leaks
nothing at rest. The CSP raises the bar against script injection short of a full
code compromise. The relay-free option lets security-sensitive users remove the
shared component altogether.

## Alternatives Considered

- **Trust the relay to complete the exchange** (server-side token exchange).
  Rejected: it would put tokens and a client secret on shared infrastructure.
- **No relay, localhost only.** Not possible for a distributed app, since Slack
  requires an HTTPS redirect. Offered as an opt-in instead.

## Consequences

- The residual risk is consent-phishing amplification: a compromised relay plus
  a user who approves an attacker-initiated consent screen could yield that
  user's token. Bounded by read-only scopes, revocability, and the relay-free
  option. Documented in `docs/content/docs/security.mdx`.
- Relay pages must keep any inline script/style nonced, or the CSP blocks them.

## Revisit When

- A distributed flow that avoids a hosted redirect becomes available.
- Relay deploy integrity needs stronger guarantees (signed deploys, pinning).
