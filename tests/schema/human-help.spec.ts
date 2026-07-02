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

  it("renders onboarding-focused auth login help", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE

    // ACT
    const result = await driver.cli.run({ args: ["auth", "login", "--help"] })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("Connect a Slack workspace profile.")
    expect(result.stdout).toContain("Browser login")
    expect(result.stdout).toContain("Opens Slack in the browser and stores a local Slack profile.")
    expect(result.stdout).toContain("Headless setup")
    expect(result.stdout).toContain("--token \"$SLACK_BOT_TOKEN\"")
    expect(result.stdout).toContain("agent-slack auth login")
    expect(result.stdout).toContain("Browser login uses PKCE with Agent Slack's public Slack app.")
    expect(result.stdout).not.toContain("Flags:")
    expect(result.stdout).not.toContain("Safety:")
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
