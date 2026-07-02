import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("auth profile status", () => {
  it("reports a seeded profile without leaking the token", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    driver.auth.setProfile({ model: { token: "xoxb-secret", scopes: ["channels:read"] } })

    // ACT
    const result = await driver.cli.runJson({ args: ["auth", "status", "--json"] })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.stdout).not.toContain("xoxb-secret")
    expect(result.envelope).toMatchObject({
      ok: true,
      method: "auth.status",
      data: {
        name: "default",
        tokenType: "bot",
        scopes: ["channels:read"],
        hasBotToken: true
      }
    })
  })

  it("returns NotAuthenticated when no profile exists", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    driver.auth.clearProfiles()

    // ACT
    const result = await driver.cli.runJson({ args: ["auth", "status", "--json"] })

    // ASSERT
    expect(result.exitCode).toBe(4)
    expect(result.errorEnvelope).toMatchObject({
      ok: false,
      error: { type: "NotAuthenticated" }
    })
  })
})
