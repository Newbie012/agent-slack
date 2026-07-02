import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("emulate files", () => {
  it("lists, gets, and downloads files from Emulate Slack", async () => {
    await using driver = await SlackCliTestDriver.create()
    const tempDir = await mkdtemp(join(tmpdir(), "agent-slack-emulate-file-"))

    try {
      // ARRANGE
      await driver.emulate.start({
        model: {
          scopes: ["chat:write", "channels:read", "channels:history", "files:read", "files:write"]
        }
      })
      const file = await driver.emulate.uploadFile({
        filename: "notes.txt",
        content: "emulate file content"
      })
      const outPath = join(tempDir, "notes.txt")

      // ACT
      const listed = await driver.cli.runJson({
        args: ["file", "list", "--channel", file.channelId, "--json"]
      })
      const info = await driver.cli.runJson({
        args: ["file", "get", file.fileId, "--json"]
      })
      const downloaded = await driver.cli.runJson({
        args: ["file", "download", file.fileId, "--out", outPath, "--json"]
      })

      // ASSERT
      expect(listed.exitCode).toBe(0)
      expect(listed.envelope).toMatchObject({
        data: {
          files: [expect.objectContaining({ id: file.fileId, name: "notes.txt" })]
        }
      })
      expect(info.exitCode).toBe(0)
      expect(info.envelope).toMatchObject({
        data: {
          file: expect.objectContaining({ id: file.fileId, name: "notes.txt" })
        }
      })
      expect(downloaded.exitCode).toBe(0)
      expect(await readFile(outPath, "utf8")).toBe("emulate file content")
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })
})
