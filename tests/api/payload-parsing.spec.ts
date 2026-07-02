import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { describe, expect, it } from "vitest"
import { InvalidPayload, UsageError } from "../../src/domain/errors.js"
import { parseJsonPayload, requirePositional } from "../../src/application/payload.js"

describe("payload parsing", () => {
  it("reads JSON payloads from files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "agent-slack-payload-"))
    try {
      // ARRANGE
      const path = join(dir, "payload.json")
      await writeFile(path, "{\"channel\":\"C123\",\"limit\":10}")

      // ACT
      const payload = await parseJsonPayload({ positional: `@${path}` })

      // ASSERT
      expect(payload).toEqual({ channel: "C123", limit: 10 })
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it("rejects non-object payload JSON", async () => {
    // ARRANGE

    // ACT
    const result = parseJsonPayload({ inline: "[]" })

    // ASSERT
    await expect(result).rejects.toBeInstanceOf(InvalidPayload)
  })

  it("reports missing positional arguments", () => {
    // ARRANGE

    // ACT
    const result = () => requirePositional(["api", "call"], 2, "METHOD")

    // ASSERT
    expect(result).toThrow(UsageError)
  })
})
