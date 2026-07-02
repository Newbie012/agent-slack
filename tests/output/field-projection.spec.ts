import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("field projection", () => {
  it("projects selected response fields inside the JSON envelope data", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    driver.auth.setProfile()
    driver.slack.overrideMethod({
      method: "api.test",
      response: { ok: true, args: { ping: "pong", hidden: "value" }, extra: "ignored" }
    })

    // ACT
    const result = await driver.cli.runJson({
      args: ["api", "call", "api.test", "--payload", "{\"ping\":\"pong\"}", "--fields", "args.ping", "--json"]
    })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.envelope).toMatchObject({
      ok: true,
      data: {
        args: {
          ping: "pong"
        }
      }
    })
    expect(result.envelope).not.toMatchObject({
      data: {
        args: {
          hidden: "value"
        }
      }
    })
  })
})
