import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("read surface wrapper commands", () => {
  it("routes user, group, conversation, file, search, and utility reads to Slack methods", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    driver.auth.setProfile()
    const stubs: readonly [string, Record<string, unknown>, readonly string[]][] = [
      ["users.list", { ok: true, members: [{ id: "U123" }] }, ["user", "list", "--limit", "10", "--json"]],
      ["users.lookupByEmail", { ok: true, user: { id: "U123" } }, ["user", "lookup", "--email", "dev@example.com", "--json"]],
      ["users.getPresence", { ok: true, presence: "active" }, ["user", "presence", "get", "U123", "--json"]],
      ["usergroups.list", { ok: true, usergroups: [{ id: "S123" }] }, ["usergroups", "list", "--json"]],
      ["usergroups.users.list", { ok: true, users: ["U123"] }, ["usergroups", "users", "list", "S123", "--json"]],
      ["conversations.list", { ok: true, channels: [{ id: "C123" }] }, ["conversation", "list", "--json"]],
      ["conversations.info", { ok: true, channel: { id: "C123" } }, ["conversation", "get", "C123", "--json"]],
      ["conversations.members", { ok: true, members: ["U123"] }, ["conversation", "members", "C123", "--json"]],
      ["files.list", { ok: true, files: [{ id: "F123" }] }, ["file", "list", "--channel", "C123", "--json"]],
      ["files.info", { ok: true, file: { id: "F123" } }, ["file", "get", "F123", "--json"]],
      ["assistant.search.context", { ok: true, results: [{ text: "hit" }] }, ["search", "context", "--query", "incident", "--content-types", "messages", "--json"]],
      ["search.messages", { ok: true, messages: { matches: [] } }, ["search", "messages", "--query", "incident", "--json"]],
      ["search.files", { ok: true, files: { matches: [] } }, ["search", "files", "--query", "incident", "--json"]],
      ["reactions.get", { ok: true, message: { reactions: [] } }, ["reaction", "get", "--channel", "C123", "--ts", "1710000000.000100", "--json"]],
      ["pins.list", { ok: true, items: [] }, ["pin", "list", "C123", "--json"]],
      ["bookmarks.list", { ok: true, bookmarks: [] }, ["bookmark", "list", "C123", "--json"]],
      ["emoji.list", { ok: true, emoji: { ship: "https://emoji.test/ship.png" } }, ["emoji", "list", "--json"]],
      ["dnd.info", { ok: true, dnd_enabled: false }, ["dnd", "status", "U123", "--json"]]
    ]

    // ACT
    const results = []
    for (const [method, response, args] of stubs) {
      driver.slack.overrideMethod({ method, response })
      results.push(await driver.cli.runJson({ args }))
    }

    // ASSERT
    expect(results.every((result) => result.exitCode === 0)).toBe(true)
    expect(results.map((result) => (result.envelope as { method?: string }).method)).toEqual(stubs.map(([method]) => method))
    expect(driver.slack.listCalls()).toEqual(expect.arrayContaining([
      expect.objectContaining({ method: "users.lookupByEmail", payload: { email: "dev@example.com" } }),
      expect.objectContaining({ method: "usergroups.users.list", payload: { usergroup: "S123" } }),
      expect.objectContaining({ method: "conversations.members", payload: { channel: "C123" } }),
      expect.objectContaining({ method: "assistant.search.context", payload: { query: "incident", content_types: ["messages"] } }),
      expect.objectContaining({ method: "dnd.info", payload: { user: "U123" } })
    ]))
  })
})
