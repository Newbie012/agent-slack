import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("flag discoverability", () => {
  it("advertises --all on conversation list in describe --json", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ACT
    const result = await driver.cli.runJson({ args: ["describe", "--json"] })

    // ASSERT
    const commands = (result.envelope as { data: { commands: { path: string[]; flags?: string[] }[] } }).data.commands
    const list = commands.find((command) => command.path.join(" ") === "conversation list")
    expect(list?.flags).toEqual(expect.arrayContaining(["--all", "--types", "--limit"]))
  })

  it("shows a Flags section including --all in conversation list --help", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ACT
    const result = await driver.cli.run({ args: ["conversation", "list", "--help"] })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("Flags:")
    expect(result.stdout).toContain("--all")
  })

  it("advertises the data key under which each command returns its payload", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ACT
    const result = await driver.cli.runJson({ args: ["describe", "--json"] })

    // ASSERT
    const commands = (result.envelope as { data: { commands: { path: string[]; dataKey?: string }[] } }).data.commands
    const byPath = (path: string) => commands.find((command) => command.path.join(" ") === path)
    expect(byPath("conversation list")?.dataKey).toBe("channels")
    expect(byPath("conversation history")?.dataKey).toBe("messages")
    expect(byPath("user get")?.dataKey).toBe("user")
  })

  it("advertises the data key through --help --json", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ACT
    const result = await driver.cli.runJson({ args: ["conversation", "history", "--help", "--json"] })

    // ASSERT
    expect((result.envelope as { data: { dataKey?: string } }).data.dataKey).toBe("messages")
  })
})
