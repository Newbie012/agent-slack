import { mkdtemp, readFile, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { describe, expect, it } from "vitest"
import { FileTokenStore } from "../../src/adapters/profile-file/FileTokenStore.js"
import { ProfileName, Scope, TeamId } from "../../src/domain/ids.js"

describe("file token store", () => {
  it("persists, lists, reads, and deletes profiles outside the project", async () => {
    const dir = await mkdtemp(join(tmpdir(), "agent-slack-profile-store-"))
    try {
      // ARRANGE
      const filePath = join(dir, "profiles.json")
      const store = new FileTokenStore(filePath)

      // ACT
      await store.setProfile({
        name: ProfileName.make("work"),
        tokenType: "bot",
        botToken: "xoxb-file-token",
        scopes: [Scope.make("channels:read")],
        teamId: TeamId.make("T123")
      })

      // ASSERT
      await expect(readFile(filePath, "utf8")).resolves.toContain("xoxb-file-token")
      await expect(store.getProfile("work")).resolves.toMatchObject({
        name: "work",
        scopes: ["channels:read"],
        teamId: "T123"
      })
      await expect(store.listProfiles()).resolves.toHaveLength(1)
      await expect(store.deleteProfile("missing")).resolves.toBe(false)
      await expect(store.deleteProfile("work")).resolves.toBe(true)
      await expect(store.getProfile("work")).resolves.toBeNull()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it("uses environment profiles without writing them", async () => {
    const dir = await mkdtemp(join(tmpdir(), "agent-slack-env-profile-"))
    try {
      // ARRANGE
      const store = FileTokenStore.fromEnv({
        HOME: dir,
        AGENT_SLACK_TOKEN: "xoxb-env-token",
        AGENT_SLACK_SCOPES: "channels:read,users:read"
      })

      // ACT
      const profile = await store.getProfile("default")

      // ASSERT
      expect(profile).toMatchObject({
        name: "default",
        tokenType: "bot",
        botToken: "xoxb-env-token",
        scopes: ["channels:read", "users:read"]
      })
      await expect(store.listProfiles()).resolves.toHaveLength(1)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
