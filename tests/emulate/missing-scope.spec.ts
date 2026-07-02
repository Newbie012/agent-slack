import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("emulate missing scope", () => {
  it("maps Slack missing_scope into a structured auth error", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    await driver.emulate.start({ model: { scopes: ["channels:read"] } })
    const channel = await driver.emulate.getChannel({ name: "engineering" })

    // ACT
    const result = await driver.cli.runJson({
      args: ["conversation", "history", channel.id, "--json"]
    })

    // ASSERT
    expect(result.exitCode).toBe(4)
    expect(result.errorEnvelope).toMatchObject({
      ok: false,
      error: {
        type: "MissingScope",
        slack_error: "missing_scope"
      }
    })
  })
})
