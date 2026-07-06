import { describe, expect, it } from "vitest"
import { getProfile } from "../../src/application/auth.js"
import type { CliServices } from "../../src/application/services.js"
import { ProfileName, Scope } from "../../src/domain/ids.js"
import type { AuthProfile } from "../../src/domain/slack.js"
import type { OAuthRefreshRequest, OAuthRefreshResult } from "../../src/ports/OAuthFlow.js"

const nowSeconds = () => Math.floor(Date.now() / 1000)

const makeProfile = (over: Partial<AuthProfile>): AuthProfile => ({
  name: ProfileName.make("default"),
  tokenType: "user",
  userToken: "xoxp-old",
  scopes: [Scope.make("channels:read")],
  ...over
})

const harness = (
  profile: AuthProfile,
  refresh: (input: OAuthRefreshRequest) => Promise<OAuthRefreshResult>
) => {
  let stored = profile
  const refreshCalls: OAuthRefreshRequest[] = []
  const setCalls: AuthProfile[] = []
  const services = {
    tokenStore: {
      getProfile: async () => stored,
      setProfile: async (next: AuthProfile) => {
        stored = next
        setCalls.push(next)
      }
    },
    oauthFlow: {
      refresh: async (input: OAuthRefreshRequest) => {
        refreshCalls.push(input)
        return refresh(input)
      }
    }
  } as unknown as CliServices
  return { services, refreshCalls, setCalls }
}

describe("token rotation refresh on getProfile", () => {
  it("refreshes an expired refreshable token and persists the new token", async () => {
    const profile = makeProfile({
      refreshToken: "xoxe-old",
      clientId: "11499810382723.11506074725874",
      tokenExpiresAt: nowSeconds() - 10
    })
    const { services, refreshCalls, setCalls } = harness(profile, async () => ({
      accessToken: "xoxp-new",
      refreshToken: "xoxe-new",
      expiresIn: 43_200
    }))

    const result = await getProfile(services, "default")

    expect(refreshCalls).toEqual([{ clientId: "11499810382723.11506074725874", refreshToken: "xoxe-old" }])
    expect(result.userToken).toBe("xoxp-new")
    expect(result.refreshToken).toBe("xoxe-new")
    expect(result.tokenExpiresAt).toBeGreaterThan(nowSeconds())
    expect(setCalls).toHaveLength(1)
    expect(setCalls[0]?.userToken).toBe("xoxp-new")
  })

  it("does not refresh a token that is still valid", async () => {
    const profile = makeProfile({
      refreshToken: "xoxe",
      clientId: "C1",
      tokenExpiresAt: nowSeconds() + 100_000
    })
    const { services, refreshCalls } = harness(profile, async () => {
      throw new Error("should not refresh")
    })

    const result = await getProfile(services, "default")

    expect(refreshCalls).toHaveLength(0)
    expect(result.userToken).toBe("xoxp-old")
  })

  it("leaves non-rotating profiles untouched", async () => {
    const profile = makeProfile({ botToken: "xoxb-static" }) // no refreshToken/clientId/expiry
    const { services, refreshCalls } = harness(profile, async () => {
      throw new Error("should not refresh")
    })

    const result = await getProfile(services, "default")

    expect(refreshCalls).toHaveLength(0)
    expect(result.botToken).toBe("xoxb-static")
  })

  it("surfaces a re-login error when refresh fails", async () => {
    const profile = makeProfile({
      refreshToken: "xoxe-old",
      clientId: "C1",
      tokenExpiresAt: nowSeconds() - 10
    })
    const { services } = harness(profile, async () => {
      throw new Error("invalid_refresh_token")
    })

    await expect(getProfile(services, "default")).rejects.toThrow(/expired|auth login/i)
  })
})
