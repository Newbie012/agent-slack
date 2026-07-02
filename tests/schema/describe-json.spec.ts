import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("schema describe json", () => {
  it("describes the command catalog", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE

    // ACT
    const result = await driver.cli.runJson({ args: ["describe", "--json"] })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.envelope).toMatchObject({
      ok: true,
      method: "describe",
      data: {
        name: "agent-slack",
        aliases: ["aslk"],
        commands: expect.arrayContaining([
          expect.objectContaining({ path: ["api", "call"] }),
          expect.objectContaining({ path: ["thread", "get"] })
        ])
      }
    })
  })

  it("describes a command through --help --json", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE

    // ACT
    const result = await driver.cli.runJson({ args: ["conversation", "history", "--help", "--json"] })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.envelope).toMatchObject({
      ok: true,
      method: "describe",
      data: {
        path: ["conversation", "history"],
        scopes: expect.arrayContaining(["channels:history"])
      }
    })
  })
})
