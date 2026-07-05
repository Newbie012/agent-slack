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
        messages: expect.arrayContaining([
          expect.objectContaining({ ts: thread.parentTs, text: "parent" })
        ])
      }
    })
  })

  it("hydrates users and permalinks when requested with --include", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    driver.auth.setProfile({ model: { scopes: ["channels:history", "users:read"] } })
    driver.slack.overrideMethod({
      method: "conversations.replies",
      response: {
        ok: true,
        messages: [
          { type: "message", user: "U1", ts: "1710000000.000100", text: "parent" },
          { type: "message", user: "U2", ts: "1710000050.000200", text: "reply" }
        ]
      }
    })
    driver.slack.overrideMethod({ method: "users.info", response: { ok: true, user: { id: "U2", name: "replier" } } })
    driver.slack.overrideMethod({ method: "chat.getPermalink", response: { ok: true, permalink: "https://example.slack.com/p" } })

    // ACT
    const result = await driver.cli.runJson({
      args: ["thread", "get", "--channel", "C123", "--ts", "1710000000.000100", "--include", "users,permalinks", "--json"]
    })

    // ASSERT
    expect(result.exitCode).toBe(0)
    const data = (result.envelope as { data: Record<string, unknown> }).data
    expect(data).toHaveProperty("users")
    expect(data).toHaveProperty("permalinks")
    expect(driver.slack.listCalls()).toContainEqual(
      expect.objectContaining({ method: "users.info", payload: { user: "U2" } })
    )
    expect(driver.slack.listCalls()).toContainEqual(
      expect.objectContaining({ method: "chat.getPermalink" })
    )
  })

  it("warns when --include users is requested without users:read", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    driver.auth.setProfile({ model: { scopes: ["channels:history"] } })
    driver.slack.overrideMethod({
      method: "conversations.replies",
      response: { ok: true, messages: [{ type: "message", user: "U1", ts: "1710000000.000100", text: "parent" }] }
    })

    // ACT
    const result = await driver.cli.runJson({
      args: ["thread", "get", "--channel", "C123", "--ts", "1710000000.000100", "--include", "users", "--json"]
    })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect((result.envelope as { warnings: string[] }).warnings).toContainEqual(
      expect.stringContaining("users:read")
    )
    expect((result.envelope as { data: Record<string, unknown> }).data).not.toHaveProperty("users")
  })
})
