import { describe, expect, it } from "vitest"
import { CLI_VERSION } from "../../src/cli/metadata.js"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("version flag", () => {
  it("prints the CLI version as a bare line and exits 0", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ACT
    const result = await driver.cli.run({ args: ["--version"] })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim()).toBe(CLI_VERSION)
  })

  it("also accepts the short alias behavior via -v-free --version only", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ACT: --version wins even alongside other flags
    const result = await driver.cli.run({ args: ["--version", "--json"] })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim()).toBe(CLI_VERSION)
  })
})
