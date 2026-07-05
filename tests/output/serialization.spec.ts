import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("output serialization", () => {
  const seed = (driver: SlackCliTestDriver) => {
    driver.auth.setProfile({ model: { scopes: ["users:read"] } })
    driver.slack.overrideMethod({
      method: "users.info",
      response: { ok: true, user: { id: "U123", name: "developer" } }
    })
  }

  it("serializes machine JSON compactly by default", async () => {
    await using driver = await SlackCliTestDriver.create()
    seed(driver)

    const result = await driver.cli.run({ args: ["user", "get", "U123", "--json"] })

    expect(result.exitCode).toBe(0)
    // Compact output is a single JSON line: no indentation newlines.
    expect(result.stdout.trimEnd()).not.toContain("\n")
    expect(result.stdout).toContain('{"ok":true')
  })

  it("indents JSON with --pretty", async () => {
    await using driver = await SlackCliTestDriver.create()
    seed(driver)

    const result = await driver.cli.run({ args: ["user", "get", "U123", "--json", "--pretty"] })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("\n  ")
  })
})
