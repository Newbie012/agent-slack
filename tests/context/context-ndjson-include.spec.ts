import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

const parseLines = (stdout: string): Record<string, unknown>[] =>
  stdout
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>)

describe("conversation context ndjson enrichment", () => {
  it("streams hydrated users, threads, and permalinks as typed records after messages", async () => {
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
    driver.slack.overrideMethod({ method: "chat.getPermalink", response: { ok: true, permalink: "https://example.slack.com/p" } })

    // ACT
    const result = await driver.cli.runNdjson({
      args: ["conversation", "context", "C123", "--include", "users,threads,permalinks", "--format", "ndjson"]
    })

    // ASSERT
    expect(result.exitCode).toBe(0)
    const lines = parseLines(result.stdout)
    // The message line is still bare (no type discriminator).
    expect(lines).toContainEqual(expect.objectContaining({ ts: "1710000000.000100", text: "root" }))
    // Enrichment records carry a type and appear after the messages.
    expect(lines).toContainEqual(
      expect.objectContaining({ type: "slack.user", data: expect.objectContaining({ id: "U2" }) })
    )
    expect(lines).toContainEqual(
      expect.objectContaining({ type: "slack.thread", data: expect.objectContaining({ ts: "1710000000.000100" }) })
    )
    expect(lines).toContainEqual(
      expect.objectContaining({ type: "slack.permalink", data: expect.objectContaining({ permalink: "https://example.slack.com/p" }) })
    )
  })

  it("streams hydrated users as records for thread get in ndjson", async () => {
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

    // ACT
    const result = await driver.cli.runNdjson({
      args: ["thread", "get", "--channel", "C123", "--ts", "1710000000.000100", "--include", "users", "--format", "ndjson"]
    })

    // ASSERT
    expect(result.exitCode).toBe(0)
    const lines = parseLines(result.stdout)
    expect(lines).toContainEqual(
      expect.objectContaining({ type: "slack.user", data: expect.objectContaining({ id: "U2" }) })
    )
  })
})
