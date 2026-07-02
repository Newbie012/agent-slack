import { createRequire } from "node:module"
import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

const require = createRequire(import.meta.url)
const packageJson = require("../../package.json") as { readonly version: string }

describe("human output", () => {
  it("keeps non-TTY output machine-readable by default", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    driver.auth.setProfile({ model: { scopes: ["channels:history"] } })
    driver.slack.overrideMethod({
      method: "conversations.history",
      response: { ok: true, messages: [{ ts: "1.000000", user: "U123", text: "hello" }] }
    })

    // ACT
    const result = await driver.cli.run({ args: ["conversation", "history", "C123"] })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.envelope).toMatchObject({
      ok: true,
      method: "conversations.history",
      data: {
        messages: [expect.objectContaining({ text: "hello" })]
      }
    })
  })

  it("renders human output with colors for interactive terminals", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    driver.auth.setProfile({ model: { scopes: ["channels:history"] } })
    driver.slack.overrideMethod({
      method: "conversations.history",
      response: { ok: true, messages: [{ ts: "1.000000", user: "U123", text: "hello" }] }
    })

    // ACT
    const result = await driver.cli.run({
      args: ["conversation", "history", "C123"],
      terminal: { stdoutIsTty: true, env: {} }
    })

    // ASSERT
    const plain = stripAnsi(result.stdout)
    expect(result.exitCode).toBe(0)
    expect(result.envelope).toBeNull()
    expect(result.stdout).toContain("\u001b[32mOK")
    expect(plain).toContain("conversations.history")
    expect(plain).toContain("Messages (1)")
    expect(plain).toContain("hello")
  })

  it("renders describe as a grouped command catalog", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE

    // ACT
    const result = await driver.cli.run({
      args: ["describe"],
      terminal: { stdoutIsTty: true, env: { NO_COLOR: "1" } }
    })

    // ASSERT
    expect(result.exitCode).toBe(0)
    expect(result.envelope).toBeNull()
    expect(result.stdout).toContain(`Agent Slack ${packageJson.version}`)
    expect(result.stdout).toContain("Use     agent-slack <command> [--json]")
    expect(result.stdout).toContain("Alias   aslk")
    expect(result.stdout).toContain("Auth")
    expect(result.stdout).toContain("auth login - Connect a Slack workspace profile.")
    expect(result.stdout).toContain("Conversations")
    expect(result.stdout).toContain("conversation history CHANNEL_ID - Read conversation history.")
    expect(result.stdout).toContain("Web API")
    expect(result.stdout).toContain("api call METHOD - Call a Slack Web API method with a JSON payload.")
    expect(result.stdout).not.toContain("summary")
    expect(result.stdout).not.toContain("output")
    expect(result.stdout).not.toContain("OK describe")
  })

  it("honors --json and NO_COLOR in interactive terminals", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    driver.auth.setProfile()

    // ACT
    const json = await driver.cli.run({
      args: ["auth", "status", "--json"],
      terminal: { stdoutIsTty: true, env: {} }
    })
    const noColor = await driver.cli.run({
      args: ["auth", "status"],
      terminal: { stdoutIsTty: true, env: { NO_COLOR: "1" } }
    })

    // ASSERT
    expect(json.envelope).toMatchObject({ ok: true, method: "auth.status" })
    expect(noColor.envelope).toBeNull()
    expect(noColor.stdout).toContain("OK auth.status")
    expect(noColor.stdout).toContain("Scopes     channels:read, channels:history, users:read")
    expect(noColor.stdout).not.toContain("\u001b[")
  })
})

const stripAnsi = (value: string): string =>
  value.replace(/\u001b\[[0-9;]+m/g, "")
