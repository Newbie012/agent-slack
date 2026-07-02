import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("human help and completions", () => {
  it("renders command help from metadata", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE

    // ACT
    const result = await driver.cli.run({ args: ["conversation", "history", "--help"] })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("agent-slack conversation history")
    expect(result.stdout).toContain("Read conversation history.")
    expect(result.stdout).toContain("channels:history")
  })

  it("renders zsh completion from metadata", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE

    // ACT
    const result = await driver.cli.run({ args: ["completion", "zsh"] })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("#compdef agent-slack aslk")
    expect(result.stdout).toContain("conversation history")
  })
})
