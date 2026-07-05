import { execFile } from "node:child_process"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { promisify } from "node:util"
import { beforeAll, describe, expect, it } from "vitest"

const execFileAsync = promisify(execFile)
const require = createRequire(import.meta.url)
const packageJson = require("../../package.json") as { readonly version: string }

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const bundle = resolve(repoRoot, "dist/main.js")

// Tests otherwise run executeCli in-process against source, so nothing exercises
// the shipped single-file bundle. Version resolution and CJS interop only break
// once bundled into dist/main.js, so smoke-test the real artifact.
describe("bundled artifact", () => {
  beforeAll(async () => {
    await execFileAsync("pnpm", ["build"], { cwd: repoRoot })
  }, 60_000)

  it("boots --help without crashing", async () => {
    const { stdout } = await execFileAsync("node", [bundle, "--help"], { cwd: repoRoot })
    expect(stdout).toContain("Slack context CLI for agents.")
  })

  it("resolves its package version through describe --json", async () => {
    const { stdout } = await execFileAsync("node", [bundle, "describe", "--json"], { cwd: repoRoot })
    const payload = JSON.parse(stdout) as { readonly data: { readonly version: string } }
    expect(payload.data.version).toBe(packageJson.version)
  })
})
