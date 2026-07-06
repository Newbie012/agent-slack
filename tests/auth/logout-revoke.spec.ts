import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

const seedProfile = async (driver: SlackCliTestDriver) => {
  await driver.cli.runJson({
    args: ["auth", "login", "--profile", "work", "--token", "xoxb-seeded", "--scopes", "channels:read", "--json"]
  })
}

describe("auth logout token revocation", () => {
  it("revokes the token on Slack by default, then removes the profile", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    await seedProfile(driver)
    driver.slack.overrideMethod({ method: "auth.revoke", response: { ok: true, revoked: true } })

    // ACT
    const logout = await driver.cli.runJson({ args: ["auth", "logout", "--profile", "work", "--yes", "--json"] })

    // ASSERT
    expect(logout.exitCode).toBe(0)
    expect(logout.envelope).toMatchObject({ ok: true, data: { deleted: true, profile: "work", revoked: true } })
    expect(driver.slack.listCalls()).toContainEqual(
      expect.objectContaining({ method: "auth.revoke", token: "xoxb-seeded" })
    )
  })

  it("skips revocation with --no-revoke but still removes the profile", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    await seedProfile(driver)

    // ACT
    const logout = await driver.cli.runJson({ args: ["auth", "logout", "--profile", "work", "--yes", "--no-revoke", "--json"] })

    // ASSERT
    expect(logout.exitCode).toBe(0)
    expect(logout.envelope).toMatchObject({ ok: true, data: { deleted: true, revoked: false } })
    expect(driver.slack.listCalls()).not.toContainEqual(expect.objectContaining({ method: "auth.revoke" }))
  })

  it("still removes the profile locally when revocation fails", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE: no auth.revoke stub -> the call fails
    await seedProfile(driver)

    // ACT
    const logout = await driver.cli.runJson({ args: ["auth", "logout", "--profile", "work", "--yes", "--json"] })

    // ASSERT
    expect(logout.exitCode).toBe(0)
    expect((logout.envelope as { data: { deleted: boolean } }).data.deleted).toBe(true)
    expect((logout.envelope as { warnings: string[] }).warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("revoke")])
    )
  })
})
