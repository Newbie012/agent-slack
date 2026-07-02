import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("auth profile lifecycle", () => {
  it("starts browser login with the bundled public Slack app client ID", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE

    // ACT
    const result = driver.cli.run({
      args: ["auth", "login", "--redirect-uri", "http://localhost:45455/oauth/slack/callback", "--timeout-ms", "1"],
      terminal: { stdoutIsTty: true, env: { NO_COLOR: "1" } }
    })
    const authorizationUrl = await waitForOpenedOAuthUrl(driver)
    const login = await result
    const parsedUrl = new URL(authorizationUrl)

    // ASSERT
    expect(parsedUrl.searchParams.get("client_id")).toBe("11499810382723.11506074725874")
    expect(login.exitCode).toBe(2)
    expect(login.stderr).toContain("Timed out waiting for Slack OAuth callback")
  })

  it("explains where OAuth app credentials come from", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE

    // ACT
    const result = await driver.cli.runJson({
      args: ["auth", "login", "--oauth", "--json"]
    })

    // ASSERT
    expect(result.exitCode).toBe(2)
    expect(result.errorEnvelope).toMatchObject({
      ok: false,
      error: {
        type: "UsageError",
        title: expect.stringContaining("Slack OAuth with app credentials")
      }
    })
    expect(result.errorEnvelope).toMatchObject({
      ok: false,
      error: {
        suggestion: expect.stringContaining("--token")
      }
    })
    expect(result.stderr).toContain("Basic Information > App Credentials")
  })

  it("creates, lists, shows scopes, and deletes a seeded profile", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE

    // ACT
    const login = await driver.cli.runJson({
      args: ["auth", "login", "--profile", "work", "--token", "xoxb-seeded", "--scopes", "channels:read,users:read", "--json"]
    })
    const profiles = await driver.cli.runJson({ args: ["auth", "profiles", "list", "--json"] })
    const scopes = await driver.cli.runJson({ args: ["auth", "scopes", "--profile", "work", "--json"] })
    const logout = await driver.cli.runJson({ args: ["auth", "logout", "--profile", "work", "--yes", "--json"] })

    // ASSERT
    expect(login.exitCode).toBe(0)
    expect(login.stdout).not.toContain("xoxb-seeded")
    expect(login.envelope).toMatchObject({
      ok: true,
      method: "auth.login",
      data: { name: "work", scopes: ["channels:read", "users:read"], hasBotToken: true }
    })
    expect(profiles.envelope).toMatchObject({
      ok: true,
      data: [expect.objectContaining({ name: "work", hasBotToken: true })]
    })
    expect(scopes.envelope).toMatchObject({
      ok: true,
      data: { scopes: ["channels:read", "users:read"] }
    })
    expect(logout.envelope).toMatchObject({
      ok: true,
      data: { deleted: true, profile: "work" }
    })
  })
})

const waitForOpenedOAuthUrl = async (driver: SlackCliTestDriver): Promise<string> => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < 5_000) {
    const value = driver.snapshot().openedOAuthUrls[0]
    if (value !== undefined) {
      return value
    }
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error("Timed out waiting for OAuth browser URL")
}
