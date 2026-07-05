import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("emulate conversation history", () => {
  it("reads seeded Slack history through the Slack SDK adapter", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    await driver.emulate.start()
    const message = await driver.emulate.createMessage({ text: "emulate-backed hello" })

    // ACT
    const result = await driver.cli.runJson({
      args: ["conversation", "history", message.channelId, "--limit", "5", "--json"]
    })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.envelope).toMatchObject({
      ok: true,
      method: "conversations.history",
      data: {
        messages: [
          expect.objectContaining({
            text: "emulate-backed hello",
            ts: message.ts
          })
        ]
      }
    })
  })
})
