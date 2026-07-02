import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { ProfileName, Scope } from "../../src/domain/ids.js"
import { KeychainTokenStore, type KeychainSecrets } from "../../src/adapters/keychain/KeychainTokenStore.js"

describe("keychain token store", () => {
  it("stores profile metadata on disk without plaintext tokens", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "agent-slack-keychain-"))
    const secrets = new MemorySecrets()

    try {
      // ARRANGE
      const filePath = join(tempDir, "profiles.keychain.json")
      const store = new KeychainTokenStore(filePath, secrets)

      // ACT
      await store.setProfile({
        name: ProfileName.default,
        tokenType: "bot",
        teamId: "T123",
        botToken: "xoxb-secret",
        userToken: "xoxp-secret",
        scopes: [Scope.make("channels:read"), Scope.make("users:read")]
      })
      const raw = await readFile(filePath, "utf8")
      const profile = await store.getProfile("default")

      // ASSERT
      expect(raw).not.toContain("xoxb-secret")
      expect(raw).not.toContain("xoxp-secret")
      expect(profile).toMatchObject({
        name: "default",
        teamId: "T123",
        botToken: "xoxb-secret",
        userToken: "xoxp-secret",
        scopes: ["channels:read", "users:read"]
      })
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })
})

class MemorySecrets implements KeychainSecrets {
  private readonly values = new Map<string, string>()

  async get(account: string): Promise<string | null> {
    return this.values.get(account) ?? null
  }

  async set(account: string, value: string): Promise<void> {
    this.values.set(account, value)
  }

  async delete(account: string): Promise<void> {
    this.values.delete(account)
  }
}
