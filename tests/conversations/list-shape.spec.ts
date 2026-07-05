import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("conversation list shape", () => {
  it("keeps is_member so agents can tell channel membership from the list", async () => {
    await using driver = await SlackCliTestDriver.create()

    // ARRANGE
    driver.auth.setProfile({ model: { scopes: ["channels:read"] } })
    driver.slack.overrideMethod({
      method: "conversations.list",
      response: {
        ok: true,
        channels: [
          { id: "C1", name: "general", is_member: true },
          { id: "C2", name: "random", is_member: false }
        ]
      }
    })

    // ACT
    const result = await driver.cli.runJson({ args: ["conversation", "list", "--json"] })

    // ASSERT
    expect(result.exitCode).toBe(0)
    const channels = (result.envelope as { data: { channels: Record<string, unknown>[] } }).data.channels
    expect(channels).toEqual([
      expect.objectContaining({ id: "C1", is_member: true }),
      expect.objectContaining({ id: "C2", is_member: false })
    ])
  })
})
