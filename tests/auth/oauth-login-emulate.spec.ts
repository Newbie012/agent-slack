import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("auth oauth login with Emulate", () => {
  it("opens Slack OAuth with PKCE for browser login", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    await driver.emulate.start()

    // ACT
    const login = driver.cli.run({
      args: [
        "auth",
        "login",
        "--client-id",
        "12345.67890",
        "--timeout-ms",
        "5000",
        "--json"
      ]
    })
    const authorizationUrl = await waitForOpenedOAuthUrl(driver)
    await driver.emulate.completeOAuthInstall({ authorizationUrl })
    const result = await login
    const parsedUrl = new URL(authorizationUrl)

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(parsedUrl.searchParams.get("code_challenge_method")).toBe("S256")
    expect(parsedUrl.searchParams.get("code_challenge")).toEqual(expect.any(String))
    expect(parsedUrl.searchParams.get("client_secret")).toBeNull()
    expect(parsedUrl.searchParams.get("redirect_uri")).toBe("http://localhost:45454/oauth/slack/callback")
    expect(parsedUrl.searchParams.get("scope")).toBeNull()
    expect(parsedUrl.searchParams.get("user_scope")).toContain("channels:read")
    expect(result.stdout).not.toContain("xoxb-")
    expect(result.stdout).not.toContain("xoxp-")
    expect(result.envelope).toMatchObject({
      ok: true,
      method: "auth.login",
      data: {
        tokenType: "user",
        hasBotToken: false,
        hasUserToken: true,
        scopes: expect.arrayContaining(["channels:read", "channels:history", "users:read"])
      }
    })
  })

  it("uses a hosted HTTPS redirect URI with a local CLI callback", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    await driver.emulate.start()
    const hostedRedirectUri = "https://agent-slack.example.com/oauth/slack/callback"
    const localCallbackUrl = "http://localhost:45454/oauth/slack/callback"

    // ACT
    const login = driver.cli.runJson({
      args: [
        "auth",
        "login",
        "--client-id",
        "12345.67890",
        "--redirect-uri",
        hostedRedirectUri,
        "--timeout-ms",
        "5000",
        "--json"
      ]
    })
    const authorizationUrl = await waitForOpenedOAuthUrl(driver)
    await driver.emulate.completeOAuthInstall({ authorizationUrl, localCallbackUrl })
    const result = await login
    const parsedUrl = new URL(authorizationUrl)

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(parsedUrl.searchParams.get("redirect_uri")).toBe(hostedRedirectUri)
    expect(result.envelope).toMatchObject({
      ok: true,
      method: "auth.login",
      data: {
        tokenType: "user",
        hasUserToken: true
      }
    })
  })

  it("serves a branded HTML success page on the local callback", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    await driver.emulate.start()
    const localCallbackUrl = "http://localhost:45454/oauth/slack/callback"

    // ACT
    const login = driver.cli.runJson({
      args: ["auth", "login", "--client-id", "12345.67890", "--timeout-ms", "5000", "--json"]
    })
    const authorizationUrl = await waitForOpenedOAuthUrl(driver)
    const callback = await driver.emulate.completeOAuthInstall({ authorizationUrl, localCallbackUrl })
    await login

    // ASSERT
    expect(callback?.contentType).toContain("text/html")
    expect(callback?.body).toContain("<style")
    expect(callback?.body).toContain("Slack connected")
    expect(callback?.body).toContain("Agent Slack")
    // Branded logo, inlined, animating from grayscale to color on success.
    expect(callback?.body).toContain("data:image/png;base64")
    expect(callback?.body).toContain("grayscale")
  })

  it("uses the bundled HTTPS relay for default browser login", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    await driver.emulate.start()
    const localCallbackUrl = "http://localhost:45454/oauth/slack/callback"

    // ACT
    const login = driver.cli.runJson({
      args: [
        "auth",
        "login",
        "--timeout-ms",
        "5000",
        "--json"
      ]
    })
    const authorizationUrl = await waitForOpenedOAuthUrl(driver)
    await driver.emulate.completeOAuthInstall({ authorizationUrl, localCallbackUrl })
    const result = await login
    const parsedUrl = new URL(authorizationUrl)

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(parsedUrl.searchParams.get("client_id")).toBe("11499810382723.11506074725874")
    expect(parsedUrl.searchParams.get("redirect_uri")).toBe("https://aslk.vercel.app/oauth/slack/callback")
    expect(result.envelope).toMatchObject({
      ok: true,
      method: "auth.login",
      data: { tokenType: "user", hasUserToken: true }
    })
  })

  it("opens the OAuth URL in the browser by default", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    await driver.emulate.start()

    // ACT
    const login = driver.cli.runJson({
      args: [
        "auth",
        "login",
        "--oauth",
        "--client-id",
        "12345.67890",
        "--client-secret",
        "example_client_secret",
        "--scopes",
        "channels:read,channels:history",
        "--user-scopes",
        "users:read",
        "--timeout-ms",
        "5000",
        "--json"
      ]
    })
    const authorizationUrl = await waitForOpenedOAuthUrl(driver)
    await driver.emulate.completeOAuthInstall({ authorizationUrl })
    const result = await login

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(authorizationUrl).toContain("/oauth/v2/authorize")
    expect(result.envelope).toMatchObject({
      ok: true,
      method: "auth.login",
      data: {
        tokenType: "bot",
        hasBotToken: true,
        hasUserToken: true
      }
    })
  })

  it("creates a profile from a Slack OAuth v2 callback and token exchange", async () => {
    await using driver = await SlackCliTestDriver.create()
    const tempDir = await mkdtemp(join(tmpdir(), "agent-slack-oauth-"))

    try {
      // ARRANGE
      await driver.emulate.start()
      const authUrlPath = join(tempDir, "authorization-url.txt")

      // ACT
      const login = driver.cli.runJson({
        args: [
          "auth",
          "login",
          "--oauth",
          "--client-id",
          "12345.67890",
          "--client-secret",
          "example_client_secret",
          "--scopes",
          "channels:read,channels:history",
          "--user-scopes",
          "users:read",
          "--auth-url-out",
          authUrlPath,
          "--timeout-ms",
          "5000",
          "--json"
        ]
      })
      await driver.emulate.completeOAuthInstall({
        authorizationUrl: await waitForFile(authUrlPath)
      })
      const result = await login

      // ASSERT
      expect(result.exitCode).toBe(0)
      expect(result.stdout).not.toContain("xoxb-")
      expect(result.stdout).not.toContain("xoxp-")
      expect(driver.snapshot().openedOAuthUrls).toEqual([])
      expect(result.envelope).toMatchObject({
        ok: true,
        method: "auth.login",
        data: {
          name: "default",
          tokenType: "bot",
          scopes: expect.arrayContaining(["channels:read", "channels:history", "users:read"]),
          hasBotToken: true,
          hasUserToken: true
        }
      })
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
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

const waitForFile = async (path: string): Promise<string> => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < 5_000) {
    try {
      const value = await readFile(path, "utf8")
      if (value.length > 0) {
        return value
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
  }
  throw new Error(`Timed out waiting for ${path}`)
}
