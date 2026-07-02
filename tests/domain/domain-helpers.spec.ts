import { describe, expect, it } from "vitest"
import { NotAuthenticated, SlackApiFailed, SlackRateLimited, UnsafeMethodBlocked, normalizeUnknownError } from "../../src/domain/errors.js"
import { ChannelId, EnterpriseId, MessageTs, ProfileName, Scope, SlackMethod, TeamId, UserId } from "../../src/domain/ids.js"
import { parseTokenType, requireYes, tokenFor } from "../../src/application/auth.js"

describe("domain helpers", () => {
  it("brands non-empty identifiers and rejects empty values", () => {
    // ARRANGE
    const factories = [TeamId, EnterpriseId, ChannelId, UserId, MessageTs, SlackMethod, ProfileName, Scope]

    // ACT
    const values = factories.map((factory) => factory.make("value"))

    // ASSERT
    expect(values).toEqual(Array(factories.length).fill("value"))
    expect(() => ChannelId.make(" ")).toThrow("ChannelId cannot be empty")
  })

  it("selects profile tokens by type", () => {
    // ARRANGE
    const profile = {
      name: ProfileName.default,
      tokenType: "bot" as const,
      botToken: "xoxb-token",
      userToken: "xoxp-token",
      adminToken: "xoxa-token",
      appToken: "xapp-token",
      scopes: [] as Scope[]
    }

    // ACT
    const bot = tokenFor(profile, "bot")
    const user = tokenFor(profile, "user")
    const admin = tokenFor(profile, "admin")
    const app = tokenFor(profile, "app")

    // ASSERT
    expect(bot).toBe("xoxb-token")
    expect(user).toBe("xoxp-token")
    expect(admin).toBe("xoxa-token")
    expect(app).toBe("xapp-token")
    expect(() => tokenFor({ name: ProfileName.make("empty"), tokenType: "bot", scopes: [] }, "bot")).toThrow(NotAuthenticated)
  })

  it("normalizes token types, confirmations, and unknown errors", () => {
    // ARRANGE

    // ACT
    const typed = normalizeUnknownError(new Error("boom"))
    const stringError = normalizeUnknownError("plain")
    const slkError = normalizeUnknownError(new SlackRateLimited("slow", { retryAfterSeconds: 10 }))

    // ASSERT
    expect(parseTokenType(undefined)).toBe("bot")
    expect(parseTokenType("app")).toBe("app")
    expect(() => parseTokenType("workspace")).toThrow()
    expect(() => requireYes({ yes: false, message: "confirm" })).toThrow(UnsafeMethodBlocked)
    expect(typed).toBeInstanceOf(SlackApiFailed)
    expect(typed.details).toEqual({ cause: "Error" })
    expect(stringError).toMatchObject({ message: "Unexpected failure", details: { cause: "plain" } })
    expect(slkError).toBeInstanceOf(SlackRateLimited)
  })
})
