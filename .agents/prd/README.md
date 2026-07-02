# PRDs

PRDs describe the human-readable interface and behavior of Agent Slack before code is written.

They answer:

- Who is using this?
- What can they do?
- What does the CLI return?
- What does the CLI refuse?
- How do we know it works?
- What are the security boundaries?

They do not need to be low-level or very technical. Durable technical choices live in `.agents/adr/`; implementation slices live in `.agents/issues/`; the detailed command contract lives in `.agents/cli-api.md`.

Start with:

1. `000-overview.md`
2. `CONTEXT.md`
3. The PRD that owns the behavior
