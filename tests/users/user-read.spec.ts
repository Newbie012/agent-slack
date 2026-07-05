import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("user read commands", () => {
  it("reads a user by id through the public command", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    driver.auth.setProfile({ model: { scopes: ["users:read"] } })
    driver.slack.overrideMethod({
      method: "users.info",
      response: { ok: true, user: { id: "U123", name: "developer" } }
    })

    // ACT
    const result = await driver.cli.runJson({ args: ["user", "get", "U123", "--json"] })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.envelope).toMatchObject({
      ok: true,
      method: "users.info",
      data: { user: { id: "U123", name: "developer" } }
    })
    expect(driver.slack.listCalls()).toEqual([
      expect.objectContaining({
        method: "users.info",
        payload: { user: "U123" }
      })
    ])
  })
})
