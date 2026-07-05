import { readFileSync } from "node:fs"
import { defineConfig } from "rolldown"

// Bundle the CLI and its full dependency graph into one ESM file so cold start
// pays a single file read instead of hundreds of per-module syscalls.
// See .agents/adr/ADR-003-bundle-cli-with-rolldown.md.
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"))

export default defineConfig({
  input: "src/main.ts",
  platform: "node",
  // Bake the version in so the bundle needs no runtime package.json read
  // (its relative path would break once flattened into dist/main.js).
  transform: {
    define: {
      __CLI_VERSION__: JSON.stringify(version),
    },
  },
  output: {
    file: "dist/main.js",
    format: "esm",
    // rolldown preserves the entry's `#!/usr/bin/env node` shebang. Add only a
    // require() shim so CJS deps (e.g. @slack/web-api) interop under ESM.
    banner: [
      "import { createRequire as ___cr } from 'module'",
      "const require = ___cr(import.meta.url)",
    ].join("\n"),
    codeSplitting: false,
  },
})
