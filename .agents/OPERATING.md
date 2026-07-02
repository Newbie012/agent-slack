# Operating Guide

Use this when a task needs more process detail than `AGENTS.md`.

## Workflow

1. PRD-DD: describe the user-facing behavior in `.agents/prd/`.
2. DDD: update domain language, bounded contexts, ports, and adapters in `.agents/architecture.md`.
3. TDD: add public-interface tests through the TestDriver shape in `.agents/testing.md`.
4. Implement the smallest slice from `.agents/issues/BACKLOG.md`.

## Artifact Split

- `.agents/prd/` owns human-readable behavior and acceptance criteria.
- `.agents/adr/` owns durable technical choices and alternatives.
- `.agents/issues/` owns implementation work items, file paths, rollout order, and subagent packages.
- `.agents/cli-api.md` owns the technical CLI surface. It must derive from PRDs, not replace them.

If implementation discovers a behavior gap, update the PRD first.

## PRD Style

PRDs should read like a product/interface contract for a human reviewer. They should explain who uses the CLI, what they can do, what the CLI refuses, and how success/failure is visible.

Do not put file paths, helper names, exact internal function signatures, or step-by-step build plans in PRDs.
