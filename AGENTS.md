# AGENTS.md

Talk tachles: concise, direct, practical.

This repo is built in this order:

1. PRD-DD: define human-readable behavior in `.agents/prd/`.
2. DDD: model the domain and architecture in `.agents/architecture.md`.
3. TDD: write public-interface tests using `.agents/testing.md`.

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
