import { describe, expect, it } from "vitest"
import { MissingScope, SlackRateLimited, UnsafeMethodBlocked, UsageError } from "../../src/domain/errors.js"
import { EnterpriseId, ProfileName, Scope, TeamId } from "../../src/domain/ids.js"
import { errorEnvelope, exitCodeOf, pagingFrom, stringifyJson, successEnvelope, toNdjson } from "../../src/output/envelope.js"
import { projectFields } from "../../src/output/projection.js"

describe("output envelopes and projection helpers", () => {
  it("builds paging and success envelopes", () => {
    // ARRANGE
    const profile = {
      name: ProfileName.make("work"),
      tokenType: "bot" as const,
      botToken: "xoxb-token",
      scopes: [] as Scope[],
      teamId: TeamId.make("T123"),
      enterpriseId: EnterpriseId.make("E123")
    }

    // ACT
    const paging = pagingFrom({ response_metadata: { next_cursor: "cursor-2" } })
    const envelope = successEnvelope({ method: "conversations.history", profile, data: { ok: true }, paging, warnings: ["bounded"] })

    // ASSERT
    expect(paging).toEqual({ next_cursor: "cursor-2", has_more: true })
    expect(pagingFrom({ response_metadata: { next_cursor: "" }, has_more: false })).toEqual({ next_cursor: null, has_more: false })
    expect(envelope).toMatchObject({
      ok: true,
      method: "conversations.history",
      team_id: "T123",
      enterprise_id: "E123",
      profile: "work",
      warnings: ["bounded"]
    })
  })

  it("renders stable error envelopes and helpers", () => {
    // ARRANGE
    const rateLimited = new SlackRateLimited("wait", { retryAfterSeconds: 30 })
    const missingScope = new MissingScope("missing", { slackError: "missing_scope" })
    const blocked = new UnsafeMethodBlocked("blocked")

    // ACT
    const rateEnvelope = errorEnvelope(rateLimited)
    const missingEnvelope = errorEnvelope(missingScope)
    const blockedEnvelope = errorEnvelope(blocked)

    // ASSERT
    expect(rateEnvelope).toMatchObject({
      exitCode: 6,
      envelope: { ok: false, error: { type: "SlackRateLimited", retry_after_seconds: 30, retriable: true } }
    })
    expect(missingEnvelope.envelope.error).toMatchObject({ type: "MissingScope", slack_error: "missing_scope" })
    expect(blockedEnvelope.envelope.error.suggestion).toContain("--allow-write")
    expect(exitCodeOf(new UsageError("bad"))).toBe(2)
    expect(exitCodeOf(new Error("bad"))).toBe(1)
    expect(stringifyJson({ ok: true })).toBe("{\n  \"ok\": true\n}\n")
    expect(toNdjson([{ a: 1 }, { b: 2 }])).toBe("{\"a\":1}\n{\"b\":2}\n")
    expect(toNdjson([])).toBe("")
  })

  it("projects nested fields and rejects empty field path segments", () => {
    // ARRANGE
    const input = {
      messages: [
        { user: { id: "U123" }, text: "hello" }
      ]
    }

    // ACT
    const projected = projectFields(input, "messages.0.user.id,missing.path")

    // ASSERT
    expect(projected).toEqual({
      messages: { "0": { user: { id: "U123" } } },
      missing: { path: undefined }
    })
    expect(projectFields(input, " ")).toBe(input)
    expect(() => projectFields(input, "messages..id")).toThrow(UsageError)
  })
})
