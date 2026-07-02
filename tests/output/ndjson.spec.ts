import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("ndjson output", () => {
  it("streams paginated item records one JSON object per line", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    driver.auth.setProfile({ model: { scopes: ["channels:history"] } })
    driver.slack.overrideMethod({
      method: "conversations.history",
      response: {
        ok: true,
        messages: [
          { ts: "1.000000", text: "one" },
          { ts: "2.000000", text: "two" }
        ]
      }
    })

    // ACT
    const result = await driver.cli.runNdjson({
      args: ["conversation", "history", "C123", "--format", "ndjson"]
    })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout.trim().split("\n").map((line) => JSON.parse(line))).toEqual([
      { ts: "1.000000", text: "one" },
      { ts: "2.000000", text: "two" }
    ])
  })
})
