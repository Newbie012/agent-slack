import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("auth profile lifecycle", () => {
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
