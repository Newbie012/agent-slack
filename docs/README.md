# Agent Slack Documentation Site

This folder contains the public docs site for `agent-slack`, built with Next.js + Fumadocs.

## Run locally

```bash
pnpm install
pnpm dev
```

Then open http://localhost:8000. The docs use the root repo toolchain (Node 22+, pnpm 11+).

```bash
pnpm build
pnpm types:check
```

## Content structure

- `content/docs` - overview, install, quick start, authentication, FAQ.
- `content/docs/guides` - human workflows for reading Slack context.
- `content/docs/reference` - output contract, Web API escape hatch, commands, troubleshooting.
- `content/docs/recipes` - agent workflow and headless setup recipes.
- `content/docs/meta.json` - navigation ordering.

Update `meta.json` files when adding pages to control ordering and groups. Use MDX; shared layout tweaks live in `lib/layout.shared.tsx`. The content loader is defined in `lib/source.ts` and `source.config.ts`.

## Notes for contributors

- Keep examples aligned with the implemented CLI surface.
- Prefer short, copy-pastable snippets that make Slack permission boundaries clear.
- The `.next` directory is ignored and should not be committed; if it appears locally, remove it before pushing changes.
