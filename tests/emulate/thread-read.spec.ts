import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("emulate thread read", () => {
  it("reads a real Emulate Slack thread through the CLI", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    await driver.emulate.start()
    const thread = await driver.emulate.createThread({
      parentText: "emulate parent",
      replyText: "emulate reply"
    })

    // ACT
    const result = await driver.cli.runJson({
      args: ["thread", "get", "--channel", thread.channelId, "--ts", thread.parentTs, "--json"]
    })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.envelope).toMatchObject({
      ok: true,
      method: "conversations.replies",
      data: {
        ok: true,
        messages: expect.arrayContaining([
          expect.objectContaining({ text: "emulate parent", ts: thread.parentTs }),
          expect.objectContaining({ text: "emulate reply", ts: thread.replyTs })
        ])
      }
    })
  })
})
