import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("conversation history pagination", () => {
  it("resumes cursor pagination with --all", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    driver.auth.setProfile({ model: { scopes: ["channels:history"] } })
    driver.slack.overrideMethodSequence({
      method: "conversations.history",
      responses: [
        {
          ok: true,
          messages: [{ ts: "1.000000", text: "one" }],
          response_metadata: { next_cursor: "cursor-2" }
        },
        {
          ok: true,
          messages: [{ ts: "2.000000", text: "two" }],
          response_metadata: { next_cursor: "" }
        }
      ]
    })

    // ACT
    const result = await driver.cli.runNdjson({
      args: ["conversation", "history", "C123", "--all", "--format", "ndjson"]
    })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim().split("\n").map((line) => JSON.parse(line))).toEqual([
      { ts: "1.000000", text: "one" },
      { ts: "2.000000", text: "two" }
    ])
    expect(driver.slack.listCalls().map((call) => call.payload.cursor ?? null)).toEqual([null, "cursor-2"])
  })
})
