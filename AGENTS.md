# AGENTS.md

Talk tachles: concise, direct, practical.

This repo is built in this order:

1. PRD-DD: define human-readable behavior in `.agents/prd/`.
2. DDD: model the domain and architecture in `.agents/architecture.md`.
3. TDD: write public-interface tests using `.agents/testing.md`.

## Dev workflow

Change behavior in this loop, in order. Do not skip ahead.

1. **PRD-DD first.** Write or update the owning PRD in `.agents/prd/` before touching code. Record durable technical decisions as an ADR in `.agents/adr/`, and reflect the command/output contract in `.agents/cli-api.md`.
2. **TDD, red before green.** Write or update the public-interface test and watch it fail first. Only then write the implementation, until the test passes. If you are editing `src/` and no failing test covers the change, stop and write the test.
3. **Verify.** Update docs, then run `pnpm typecheck`, `pnpm test`, and `pnpm build`.

Before changing behavior:

1. Read `.agents/prd/000-overview.md`.
2. Read `.agents/prd/CONTEXT.md`.
3. Read the PRD that owns the behavior.
4. Read `.agents/architecture.md` and `.agents/testing.md`.
5. Use `.agents/issues/BACKLOG.md` for implementation slices.

Keep the split clean:

- `.agents/prd/` - human-readable product/interface behavior.
- `.agents/adr/` - durable technical decisions.
- `.agents/issues/` - implementation work items.
- `.agents/architecture.md` - DDD design.
- `.agents/testing.md` - TDD/TestDriver strategy.
- `.agents/cli-api.md` - technical CLI contract derived from PRDs.
