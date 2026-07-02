import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { SlackCliTestDriver } from "../../src/testing/driver.js"

describe("file download", () => {
  it("downloads private Slack file content to --out without writing bytes to stdout", async () => {
    await using driver = await SlackCliTestDriver.create()
    const tempDir = await mkdtemp(join(tmpdir(), "agent-slack-file-"))

    try {
      // ARRANGE
      driver.auth.setProfile({ model: { token: "xoxb-file-token", scopes: ["files:read"] } })
      driver.slack.overrideMethod({
        method: "files.info",
        response: {
          ok: true,
          file: {
            id: "F123",
            name: "notes.txt",
            url_private_download: "https://files.slack.test/F123"
          }
        }
      })
      driver.slack.overrideFileDownload({
        url: "https://files.slack.test/F123",
        content: "private notes"
      })
      const outPath = join(tempDir, "notes.txt")

      // ACT
      const result = await driver.cli.runJson({
        args: ["file", "download", "F123", "--out", outPath, "--json"]
      })

      // ASSERT
      expect(result.exitCode).toBe(0)
      expect(result.stdout).not.toContain("private notes")
      expect(await readFile(outPath, "utf8")).toBe("private notes")
      expect(result.envelope).toMatchObject({
        ok: true,
        method: "file.download",
        data: {
          file: { id: "F123", name: "notes.txt" },
          download: { path: outPath, bytes: 13 }
        }
      })
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })
})
