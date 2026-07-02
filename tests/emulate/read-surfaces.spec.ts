import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("emulate read surfaces", () => {
  it("reads reactions, pins, and bookmarks from Emulate Slack", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    await driver.emulate.start({
      model: {
        scopes: [
          "chat:write",
          "channels:read",
          "channels:history",
          "reactions:read",
          "reactions:write",
          "pins:read",
          "pins:write",
          "bookmarks:read",
          "bookmarks:write"
        ]
      }
    })
    const message = await driver.emulate.createMessage({ text: "surface target" })
    await driver.emulate.addReaction({ channelId: message.channelId, ts: message.ts })
    await driver.emulate.addPin({ channelId: message.channelId, ts: message.ts })
    await driver.emulate.addBookmark({ channelId: message.channelId, title: "Runbook", link: "https://example.com/runbook" })

    // ACT
    const reaction = await driver.cli.runJson({
      args: ["reaction", "get", "--channel", message.channelId, "--ts", message.ts, "--json"]
    })
    const pins = await driver.cli.runJson({
      args: ["pin", "list", message.channelId, "--json"]
    })
    const bookmarks = await driver.cli.runJson({
      args: ["bookmark", "list", message.channelId, "--json"]
    })

    // ASSERT
    expect(reaction.exitCode).toBe(0)
    expect(reaction.envelope).toMatchObject({
      data: {
        message: {
          reactions: [expect.objectContaining({ name: "white_check_mark" })]
        }
      }
    })
    expect(pins.exitCode).toBe(0)
    expect(pins.envelope).toMatchObject({
      data: {
        items: [expect.objectContaining({ type: "message" })]
      }
    })
    expect(bookmarks.exitCode).toBe(0)
    expect(bookmarks.envelope).toMatchObject({
      data: {
        bookmarks: [expect.objectContaining({ title: "Runbook" })]
      }
    })
  })
})
