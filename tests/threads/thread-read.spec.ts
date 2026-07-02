import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("thread read", () => {
  it("reads a Slack thread through the public command", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    driver.auth.setProfile({ model: { scopes: ["channels:history"] } })
    const thread = driver.slack.createThread({ model: { channelId: "C123", parentTs: "1710000000.000100", replyCount: 2 } })

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
          expect.objectContaining({ ts: thread.parentTs, text: "parent" })
        ])
      }
    })
  })
})
