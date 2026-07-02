import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("unsafe method blocking", () => {
  it("blocks known write methods without explicit allow-write confirmation", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    driver.auth.setProfile({ model: { scopes: ["chat:write"] } })

    // ACT
    const result = await driver.cli.runJson({
      args: ["api", "call", "chat.postMessage", "--payload", "{\"channel\":\"C123\",\"text\":\"hi\"}", "--json"]
    })

    // ASSERT
    expect(result.exitCode).toBe(5)
    expect(result.errorEnvelope).toMatchObject({
      ok: false,
      error: {
        type: "UnsafeMethodBlocked"
      }
    })
    expect(driver.slack.listCalls()).toEqual([])
  })
})
