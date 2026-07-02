import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("team read commands", () => {
  it("reads workspace info through the public command", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    driver.auth.setProfile({ model: { scopes: ["team:read"] } })
    driver.slack.overrideMethod({
      method: "team.info",
      response: { ok: true, team: { id: "T123", name: "Engineering" } }
    })

    // ACT
    const result = await driver.cli.runJson({ args: ["team", "get", "--json"] })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.envelope).toMatchObject({
      ok: true,
      method: "team.info",
      data: { ok: true, team: { id: "T123", name: "Engineering" } }
    })
  })
})
