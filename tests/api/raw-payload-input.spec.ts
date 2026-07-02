import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("api payload input", () => {
  it("calls Slack with a JSON payload", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    driver.auth.setProfile()
    driver.slack.overrideMethod({
      method: "api.test",
      response: { ok: true, args: { ping: "pong" } }
    })

    // ACT
    const result = await driver.cli.runJson({
      args: ["api", "call", "api.test", "--payload", "{\"ping\":\"pong\"}", "--json"]
    })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.envelope).toMatchObject({
      ok: true,
      method: "api.test",
      data: { ok: true, args: { ping: "pong" } }
    })
    expect(driver.slack.listCalls()).toEqual([
      expect.objectContaining({
        method: "api.test",
        payload: { ping: "pong" }
      })
    ])
  })

  it("returns a structured usage error for invalid JSON", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    driver.auth.setProfile()

    // ACT
    const result = await driver.cli.runJson({
      args: ["api", "call", "api.test", "--payload", "{bad", "--json"]
    })

    // ASSERT
    expect(result.exitCode).toBe(2)
    expect(result.stdout).toBe("")
    expect(result.errorEnvelope).toMatchObject({
      ok: false,
      error: { type: "InvalidPayload" }
    })
  })
})
