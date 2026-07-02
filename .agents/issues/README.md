# Issues

Issues and backlog items are implementation work, not behavior contracts.

Use this area for file paths, work packages, rollout order, helper names, and concrete tests.

If implementation changes product behavior, update `.agents/prd/` first.

## GitHub Issue Compatibility

Files in this directory should be directly convertible to GitHub issues.

Use:

- One issue per implementation slice.
- A concise issue title.
- Labels listed in frontmatter-style bullets.
- Links to owning PRDs and ADRs.
- Concrete scope, tests, and done checklist.

Do not put product behavior here unless the linked PRD already owns it.

## Suggested Labels

- `area:foundation`
- `area:testing`
- `area:auth`
- `area:api`
- `area:output`
- `area:catalog`
- `area:conversations`
- `area:context`
- `area:files`
- `area:docs`
- `kind:implementation`
- `kind:test-harness`
- `kind:docs`
- `needs:prd`
- `parallel-safe`

## Conversion

To convert manually:

1. Use the first heading as the GitHub issue title.
2. Copy the rest of the file as the body.
3. Apply the listed labels.
4. Keep the local issue file as the durable agent-readable mirror.
