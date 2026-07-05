# ADR-003 - Bundle the CLI with rolldown

- **Status:** `accepted`
- **Date:** 2026-07-05
- **PRDs:** PRD-000

## Context

The CLI ships as `tsc` output: a directory tree of small ES modules under
`dist/` mirroring `src/`. On a cold start Node resolves and reads that tree plus
the entire runtime dependency graph (`effect`, `@effect/platform-node`,
`@slack/web-api`) as hundreds of individual files. That is I/O bound, not CPU
bound: a real `aslk` invocation measured 1.36s wall at ~48% CPU, dominated by
per-file syscalls, not by our logic.

The CLI's job is short-lived per invocation, so startup latency is the headline
cost an agent pays on every call.

## Decision

Bundle `src/main.ts` and its entire dependency graph into a single ESM file
`dist/main.js` with **rolldown**, replacing the `tsc` emit. `tsc` stays for
typechecking only (`pnpm typecheck`, `tsc --noEmit`). `tsx` is removed; dev and
`aslk`/`agent-slack` scripts build-then-run the bundle.

## Rationale

Measured on this machine (warm cache, best-of-15, byte-identical output to `tsc`
on `--help`, `describe`, and `auth status`):

| Build | `--help` median | bundle size |
| --- | --- | --- |
| `tsc` (current) | 189ms | many files |
| esbuild `--packages=bundle` | 58ms | 2.0 MB |
| **rolldown** (inline all) | **44ms** | **888 KB** |

Collapsing the graph into one file removes the per-file syscall cost and cuts
cold start ~4x. rolldown beat esbuild on both axes that matter: ~25% faster
start (less to parse) and a 2.3x smaller bundle (tighter tree-shaking on the
Effect graph), which is also a smaller published tarball.

## Alternatives Considered

- **esbuild `--packages=bundle`** - already in the tree via tsx, one-line build.
  Runner-up: 58ms vs 44ms, 2.0 MB vs 888 KB. Slower and larger here.
- **esbuild `--packages=external`** - bundles only our source, leaves Effect as
  loose files. No measurable win (~200ms); rejected.
- **Keep `tsc` emit** - the baseline we are replacing.
- **Node built-in type stripping for dev** (`node --experimental-strip-types`) -
  cannot resolve our TS NodeNext `.js` import specifiers to `.ts` sources, so it
  fails without a resolver. Rejected in favor of build-then-run.

## Consequences

- One tool (rolldown) covers the build; `tsx` leaves `devDependencies`.
- No zero-build source runner: dev/`aslk`/`agent-slack` build first (~50-150ms),
  then run `node dist/main.js`. Acceptable for a short-lived CLI.
- The bundle carries a `#!/usr/bin/env node` shebang and a `createRequire` shim
  (banner) so CJS deps like `@slack/web-api` interop under ESM.
- `dist/main.js` is a single opaque file; debugging maps back through source
  less directly than the old mirrored tree.

## Revisit When

- rolldown output diverges from `tsc` behavior on any command.
- Node ships a stable `.js`->`.ts` resolver, making a zero-build dev runner
  viable again.
- Bundle size or startup regresses materially on a dependency bump.
