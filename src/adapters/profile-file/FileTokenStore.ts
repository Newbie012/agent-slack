import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { ProfileName, Scope } from "../../domain/ids.js"
import type { AuthProfile } from "../../domain/slack.js"
import type { TokenStore } from "../../ports/TokenStore.js"

interface StoredProfiles {
  readonly profiles: readonly AuthProfile[]
}

export class FileTokenStore implements TokenStore {
  constructor(
    private readonly filePath: string,
    private readonly envProfile: AuthProfile | null = null
  ) {}

  static fromEnv(env: NodeJS.ProcessEnv = process.env): FileTokenStore {
    const configDir = env.AGENT_SLACK_CONFIG_DIR ?? env.SLK_CONFIG_DIR ?? join(env.HOME ?? process.cwd(), ".config", "agent-slack")
    const token = env.AGENT_SLACK_TOKEN ?? env.SLK_TOKEN ?? env.SLACK_BOT_TOKEN ?? null
    const envProfile = token === null
      ? null
      : {
          name: ProfileName.default,
          tokenType: "bot" as const,
          botToken: token,
          scopes: (env.AGENT_SLACK_SCOPES ?? env.SLK_SCOPES ?? "").split(",").filter(Boolean).map(Scope.make)
        }
    return new FileTokenStore(join(configDir, "profiles.json"), envProfile)
  }

  async getProfile(name: string): Promise<AuthProfile | null> {
    const profiles = await this.readProfiles()
    return profiles.find((profile) => profile.name === name) ?? (name === "default" ? this.envProfile : null)
  }

  async setProfile(profile: AuthProfile): Promise<void> {
    const profiles = await this.readProfiles()
    const next = [profile, ...profiles.filter((item) => item.name !== profile.name)]
    await this.writeProfiles(next)
  }

  async listProfiles(): Promise<readonly AuthProfile[]> {
    const profiles = await this.readProfiles()
    return this.envProfile === null ? profiles : [this.envProfile, ...profiles.filter((item) => item.name !== this.envProfile?.name)]
  }

  async deleteProfile(name: string): Promise<boolean> {
    const profiles = await this.readProfiles()
    const next = profiles.filter((profile) => profile.name !== name)
    if (next.length === profiles.length) {
      return false
    }
    if (next.length === 0) {
      await rm(this.filePath, { force: true })
      return true
    }
    await this.writeProfiles(next)
    return true
  }

  private async readProfiles(): Promise<readonly AuthProfile[]> {
    try {
      const raw = await readFile(this.filePath, "utf8")
      const parsed = JSON.parse(raw) as StoredProfiles
      return parsed.profiles ?? []
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return []
      }
      throw error
    }
  }

  private async writeProfiles(profiles: readonly AuthProfile[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true, mode: 0o700 })
    await writeFile(this.filePath, JSON.stringify({ profiles }, null, 2), { mode: 0o600 })
  }
}
