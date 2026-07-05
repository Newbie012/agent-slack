import { describe, expect, it } from "vitest"
import { normalizeResponse, slimFile, slimMessage, slimUser } from "../../src/output/normalize.js"

describe("output normalization", () => {
  it("slims a message to reasoning-relevant fields", () => {
    const raw = {
      type: "message",
      user: "U123",
      ts: "1710000000.000100",
      text: "ship it",
      team: "T123",
      client_msg_id: "abc-def",
      blocks: [{ type: "rich_text", block_id: "b1", elements: [] }],
      reactions: [{ name: "tada", count: 3, users: ["U1", "U2", "U3"] }],
      files: [
        {
          id: "F1",
          name: "spec.pdf",
          mimetype: "application/pdf",
          size: 2048,
          url_private: "https://files.slack.com/x",
          thumb_pdf: "https://files.slack.com/thumb"
        }
      ]
    }
    const slim = slimMessage(raw) as Record<string, unknown>

    expect(slim).toEqual({
      user: "U123",
      ts: "1710000000.000100",
      text: "ship it",
      reactions: [{ name: "tada", count: 3 }],
      files: [{ id: "F1", name: "spec.pdf", mimetype: "application/pdf", size: 2048 }]
    })
    expect(slim).not.toHaveProperty("blocks")
    expect(slim).not.toHaveProperty("client_msg_id")
    expect(slim).not.toHaveProperty("team")
  })

  it("keeps thread_ts only when it differs from ts", () => {
    const root = slimMessage({ user: "U1", ts: "111.000", text: "root", thread_ts: "111.000" }) as Record<string, unknown>
    const reply = slimMessage({ user: "U2", ts: "222.000", text: "reply", thread_ts: "111.000" }) as Record<string, unknown>
    expect(root).not.toHaveProperty("thread_ts")
    expect(reply.thread_ts).toBe("111.000")
  })

  it("slims a user, dropping avatars and status", () => {
    const raw = {
      id: "U123",
      name: "dev",
      real_name: "Ada Dev",
      color: "9f69e7",
      tz: "America/New_York",
      is_bot: false,
      profile: {
        display_name: "ada",
        title: "Staff Engineer",
        status_text: "wfh",
        image_512: "https://avatars.slack-edge.com/x_512.png",
        image_original: "https://avatars.slack-edge.com/x_original.png"
      }
    }
    const slim = slimUser(raw) as Record<string, unknown>
    expect(slim).toEqual({ id: "U123", name: "dev", real_name: "ada", title: "Staff Engineer" })
    expect(JSON.stringify(slim)).not.toContain("image_")
    expect(slim).not.toHaveProperty("color")
  })

  it("slims a file to id, name, mimetype, size, permalink", () => {
    const slim = slimFile({
      id: "F1",
      name: "a.pdf",
      mimetype: "application/pdf",
      size: 10,
      permalink: "https://x/a.pdf",
      url_private: "https://files/x",
      thumb_pdf: "https://files/thumb"
    }) as Record<string, unknown>
    expect(slim).toEqual({ id: "F1", name: "a.pdf", mimetype: "application/pdf", size: 10, permalink: "https://x/a.pdf" })
  })

  it("normalizes a history response and drops the Slack envelope", () => {
    const normalized = normalizeResponse("conversations.history", {
      ok: true,
      messages: [{ user: "U1", ts: "1.0", text: "hi", blocks: [{ type: "rich_text" }] }],
      response_metadata: { next_cursor: "x" }
    }) as Record<string, unknown>
    expect(normalized).toEqual({ messages: [{ user: "U1", ts: "1.0", text: "hi" }] })
    expect(normalized).not.toHaveProperty("ok")
    expect(normalized).not.toHaveProperty("response_metadata")
  })

  it("strips the envelope for unmapped methods but keeps the rest", () => {
    const normalized = normalizeResponse("pins.list", {
      ok: true,
      items: [{ type: "message" }],
      response_metadata: { next_cursor: "" }
    }) as Record<string, unknown>
    expect(normalized).toEqual({ items: [{ type: "message" }] })
  })
})
