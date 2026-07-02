# ADR-001 - Effect DDD CLI Architecture

- **Status:** `accepted`
- **Date:** 2026-07-02
- **PRDs:** `../prd/001-agent-readable-slack-interface.md`

## Context

The CLI needs reliable auth, Slack API calls, structured output, retries, rate-limit handling, schema introspection, and testable boundaries.

## Decision

Use TypeScript, Effect beta, and `@effect/platform-node@beta`. Keep Slack's official SDK behind infrastructure ports. Use a metadata-driven CLI parser for the first implementation slice.

## Rationale

Effect gives typed errors, services, streams, config, retries, and test layers in one architecture. `@effect/platform-node` owns runtime execution. A metadata-driven parser lets agents pass global flags before or after subcommands and lets `describe --json` come from the same registry. Slack's SDK keeps Slack compatibility in the adapter layer.

## Alternatives Considered

- Commander plus Effect services: rejected because we do not need a second framework.
- `effect/unstable/cli`: deferred because the beta CLI grammar is stricter than the Agent Surface-style command contract for this slice.
- Raw Effect HTTP without Slack SDK: rejected for v1 because Slack SDK handles Slack-specific behavior.
- Go or Rust: rejected for v1 because TypeScript plus Slack SDK moves faster.

## Consequences

- Domain and application code must not import Slack SDK objects.
- CLI metadata must support Agent Surface-style JSON discovery.
- Tests should use Effect layers and TestDriver APIs.

## Revisit When

Revisit Effect CLI when generated help/completions are needed or its grammar matches this command contract. Revisit Slack SDK if it blocks required API coverage.
