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

  it("hydrates authors that appear only in thread replies and dedupes the root", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    driver.auth.setProfile({ model: { scopes: ["channels:history", "users:read"] } })
    driver.slack.overrideMethod({
      method: "conversations.history",
      response: {
        ok: true,
        messages: [
          { type: "message", user: "U1", ts: "1710000000.000100", text: "root", thread_ts: "1710000000.000100", reply_count: 1 }
        ]
      }
    })
    driver.slack.overrideMethod({
      method: "conversations.replies",
      response: {
        ok: true,
        messages: [
          { type: "message", user: "U1", ts: "1710000000.000100", text: "root" },
          { type: "message", user: "U2", ts: "1710000050.000200", text: "reply" }
        ]
      }
    })
    driver.slack.overrideMethod({ method: "users.info", response: { ok: true, user: { id: "U2", name: "replier" } } })

    // ACT
    const result = await driver.cli.runJson({
      args: ["conversation", "context", "C123", "--include", "users,threads", "--json"]
    })

    // ASSERT
    expect(result.exitCode).toBe(0)
    // U2 only appears in a reply, but must still be hydrated.
    expect(driver.slack.listCalls()).toContainEqual(
      expect.objectContaining({ method: "users.info", payload: { user: "U2" } })
    )
    // The thread root is deduped because it is already in messages.
    const data = (result.envelope as { data: Record<string, unknown> }).data
    expect((data.threads as Record<string, unknown[]>)["1710000000.000100"]).toHaveLength(1)
  })

  it("warns and skips hydration when users:read is missing", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    driver.auth.setProfile({ model: { scopes: ["channels:history"] } })
    driver.slack.overrideMethod({
      method: "conversations.history",
      response: { ok: true, messages: [{ type: "message", user: "U1", ts: "1710000000.000100", text: "hi" }] }
    })

    // ACT
    const result = await driver.cli.runJson({
      args: ["conversation", "context", "C123", "--include", "users", "--json"]
    })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect((result.envelope as { warnings: string[] }).warnings).toContainEqual(
      expect.stringContaining("users:read")
    )
    expect((result.envelope as { data: Record<string, unknown> }).data).not.toHaveProperty("users")
    expect(driver.slack.listCalls()).not.toContainEqual(expect.objectContaining({ method: "users.info" }))
  })

  it("returns raw Slack objects with --full", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    driver.auth.setProfile({ model: { scopes: ["channels:history"] } })
    driver.slack.overrideMethod({
      method: "conversations.history",
      response: {
        ok: true,
        messages: [{ type: "message", user: "U1", ts: "1710000000.000100", text: "hi", blocks: [{ type: "rich_text" }] }]
      }
    })

    // ACT
    const slim = await driver.cli.runJson({ args: ["conversation", "context", "C123", "--json"] })
    const full = await driver.cli.runJson({ args: ["conversation", "context", "C123", "--json", "--full"] })

    // ASSERT
    const slimMsg = (slim.envelope as { data: { messages: Record<string, unknown>[] } }).data.messages[0]
    const fullMsg = (full.envelope as { data: { messages: Record<string, unknown>[] } }).data.messages[0]
    expect(slimMsg).not.toHaveProperty("blocks")
    expect(fullMsg).toHaveProperty("blocks")
  })
})
