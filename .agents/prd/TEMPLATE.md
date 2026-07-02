# PRD-NNN - Title

> One-sentence summary.

- **Status:** `draft` | `accepted` | `superseded by PRD-NNN`
- **Last updated:** YYYY-MM-DD

## User Problem

Who feels the problem, and what are they trying to accomplish?

## Interface Behavior

Describe what the user or agent can do through the CLI. Keep this at the human-readable interface level.

## User Stories

1. As a `<user>`, I want `<capability>`, so that `<benefit>`.

Cover happy path, empty result, access denied, upstream failure, malicious input, and operator/debug paths when relevant.

## Product Contract

- What inputs the user provides.
- What output they can rely on.
- What errors or refusals they can rely on.
- What nearby behavior this PRD does not own.

Avoid file paths, helper names, internal classes, and step-by-step implementation plans.

## Testing Decisions

List observable behaviors that must be verified through public interfaces.

## Security Impact

- Attack surface introduced.
- Poisoning vectors.
- Least-privilege guardrails.
- Red-team or abuse cases to cover.

## Out of Scope

Expected nearby behavior this PRD does not cover.

## Further Notes

Stable notes only.
