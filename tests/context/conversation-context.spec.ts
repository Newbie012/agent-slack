import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("conversation context", () => {
  it("hydrates requested users and permalinks without summarizing messages", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    driver.auth.setProfile({ model: { scopes: ["channels:history", "users:read"] } })
    driver.slack.overrideMethod({
      method: "conversations.history",
      response: {
        ok: true,
        messages: [{ type: "message", user: "U123", ts: "1710000000.000100", text: "ship it" }]
      }
    })
    driver.slack.overrideMethod({
      method: "users.info",
      response: { ok: true, user: { id: "U123", name: "developer" } }
    })
    driver.slack.overrideMethod({
      method: "chat.getPermalink",
      response: { ok: true, permalink: "https://example.slack.com/archives/C123/p1710000000000100" }
    })

    // ACT
    const result = await driver.cli.runJson({
      args: ["conversation", "context", "C123", "--include", "users,permalinks", "--json"]
    })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.envelope).toMatchObject({
      ok: true,
      method: "conversation.context",
      data: {
        channel: "C123",
        messages: [expect.objectContaining({ text: "ship it" })],
        users: {
          U123: { id: "U123", name: "developer" }
        },
        permalinks: {
          "1710000000.000100": "https://example.slack.com/archives/C123/p1710000000000100"
        }
      }
    })
    expect(driver.slack.listCalls()).toEqual([
      expect.objectContaining({ method: "conversations.history" }),
      expect.objectContaining({ method: "users.info", payload: { user: "U123" } }),
      expect.objectContaining({
        method: "chat.getPermalink",
        payload: { channel: "C123", message_ts: "1710000000.000100" }
      })
    ])
  })
})
