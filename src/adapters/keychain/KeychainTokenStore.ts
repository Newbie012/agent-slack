import { execFile } from "node:child_process"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { promisify } from "node:util"
import { UsageError } from "../../domain/errors.js"
import { ProfileName, Scope } from "../../domain/ids.js"
import type { AuthProfile } from "../../domain/slack.js"
import type { TokenStore } from "../../ports/TokenStore.js"

const execFileAsync = promisify(execFile)

export interface KeychainSecrets {
  get(account: string): Promise<string | null>
  set(account: string, value: string): Promise<void>
  delete(account: string): Promise<void>
}

// Secret fields kept in the keychain. `refreshToken` is a secret too, so it
// rides the same path as the access tokens.
type TokenField = "botToken" | "userToken" | "adminToken" | "appToken" | "refreshToken"

interface StoredKeychainProfile {
  readonly name: string
  readonly teamId?: string
  readonly enterpriseId?: string | null
  readonly userId?: string
  readonly botId?: string
  readonly tokenType: AuthProfile["tokenType"]
  readonly scopes: readonly string[]
  readonly tokenAccounts: Partial<Record<TokenField, string>>
  // Non-secret rotation metadata lives on disk alongside the accounts map.
  readonly tokenExpiresAt?: number
  readonly clientId?: string
}

interface StoredKeychainProfiles {
  readonly profiles: readonly StoredKeychainProfile[]
}

export class KeychainTokenStore implements TokenStore {
  constructor(
    private readonly filePath: string,
    private readonly secrets: KeychainSecrets = new MacOSSecurityKeychainSecrets()
  ) {}

  static fromEnv(env: NodeJS.ProcessEnv = process.env): KeychainTokenStore {
    const configDir = env.AGENT_SLACK_CONFIG_DIR ?? env.SLK_CONFIG_DIR ?? join(env.HOME ?? process.cwd(), ".config", "agent-slack")
    return new KeychainTokenStore(join(configDir, "profiles.keychain.json"))
  }

  async getProfile(name: string): Promise<AuthProfile | null> {
    const stored = (await this.readProfiles()).find((profile) => profile.name === name)
    return stored === undefined ? null : this.hydrate(stored)
  }

  async setProfile(profile: AuthProfile): Promise<void> {
    const profiles = await this.readProfiles()
    const previous = profiles.find((item) => item.name === profile.name)
    const stored = await this.dehydrate(profile)
    await this.deleteRemovedTokenAccounts(previous, stored)
    await this.writeProfiles([stored, ...profiles.filter((item) => item.name !== profile.name)])
  }

  async listProfiles(): Promise<readonly AuthProfile[]> {
    const profiles = await this.readProfiles()
    return Promise.all(profiles.map((profile) => this.hydrate(profile)))
  }

  async deleteProfile(name: string): Promise<boolean> {
    const profiles = await this.readProfiles()
    const found = profiles.find((profile) => profile.name === name)
    if (found === undefined) {
      return false
    }
    await Promise.all(Object.values(found.tokenAccounts).map((account) => account === undefined ? Promise.resolve() : this.secrets.delete(account)))
    const next = profiles.filter((profile) => profile.name !== name)
    if (next.length === 0) {
      await rm(this.filePath, { force: true })
    } else {
      await this.writeProfiles(next)
    }
    return true
  }

  private async dehydrate(profile: AuthProfile): Promise<StoredKeychainProfile> {
    const tokenAccounts: Partial<Record<TokenField, string>> = {}
    for (const field of tokenFields) {
      const token = profile[field]
      if (token !== undefined) {
        const account = accountFor(profile.name, field)
        await this.secrets.set(account, token)
        tokenAccounts[field] = account
      }
    }
    return {
      name: profile.name,
      tokenType: profile.tokenType,
      scopes: profile.scopes,
      tokenAccounts,
      ...(profile.teamId === undefined ? {} : { teamId: profile.teamId }),
      ...(profile.enterpriseId === undefined ? {} : { enterpriseId: profile.enterpriseId }),
      ...(profile.userId === undefined ? {} : { userId: profile.userId }),
      ...(profile.botId === undefined ? {} : { botId: profile.botId }),
      ...(profile.tokenExpiresAt === undefined ? {} : { tokenExpiresAt: profile.tokenExpiresAt }),
      ...(profile.clientId === undefined ? {} : { clientId: profile.clientId })
    }
  }

  private async hydrate(profile: StoredKeychainProfile): Promise<AuthProfile> {
    const tokens = Object.fromEntries(
      await Promise.all(tokenFields.map(async (field) => {
        const account = profile.tokenAccounts[field]
        return [field, account === undefined ? undefined : await this.secrets.get(account)]
      }))
    ) as Partial<Record<TokenField, string | null>>
    return {
      name: ProfileName.make(profile.name),
      tokenType: profile.tokenType,
      scopes: profile.scopes.map(Scope.make),
      ...(profile.teamId === undefined ? {} : { teamId: profile.teamId }),
      ...(profile.enterpriseId === undefined ? {} : { enterpriseId: profile.enterpriseId }),
      ...(profile.userId === undefined ? {} : { userId: profile.userId }),
      ...(profile.botId === undefined ? {} : { botId: profile.botId }),
      ...(tokens.botToken == null ? {} : { botToken: tokens.botToken }),
      ...(tokens.userToken == null ? {} : { userToken: tokens.userToken }),
      ...(tokens.adminToken == null ? {} : { adminToken: tokens.adminToken }),
      ...(tokens.appToken == null ? {} : { appToken: tokens.appToken }),
      ...(tokens.refreshToken == null ? {} : { refreshToken: tokens.refreshToken }),
      ...(profile.tokenExpiresAt === undefined ? {} : { tokenExpiresAt: profile.tokenExpiresAt }),
      ...(profile.clientId === undefined ? {} : { clientId: profile.clientId })
    }
  }

  private async deleteRemovedTokenAccounts(previous: StoredKeychainProfile | undefined, next: StoredKeychainProfile): Promise<void> {
    if (previous === undefined) {
      return
    }
    const nextAccounts = new Set(Object.values(next.tokenAccounts))
    await Promise.all(Object.values(previous.tokenAccounts).map((account) => {
      if (account === undefined || nextAccounts.has(account)) {
        return Promise.resolve()
      }
      return this.secrets.delete(account)
    }))
  }

  private async readProfiles(): Promise<readonly StoredKeychainProfile[]> {
    try {
      const raw = await readFile(this.filePath, "utf8")
      const parsed = JSON.parse(raw) as StoredKeychainProfiles
      return parsed.profiles ?? []
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return []
      }
      throw error
    }
  }

  private async writeProfiles(profiles: readonly StoredKeychainProfile[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true, mode: 0o700 })
    await writeFile(this.filePath, JSON.stringify({ profiles }, null, 2), { mode: 0o600 })
  }
}

class MacOSSecurityKeychainSecrets implements KeychainSecrets {
  private readonly service = "agent-slack"

  async get(account: string): Promise<string | null> {
    this.assertDarwin()
    try {
      const { stdout } = await execFileAsync("security", ["find-generic-password", "-s", this.service, "-a", account, "-w"])
      return stdout.trimEnd()
    } catch {
      return null
    }
  }

  async set(account: string, value: string): Promise<void> {
    this.assertDarwin()
    await execFileAsync("security", ["add-generic-password", "-s", this.service, "-a", account, "-w", value, "-U"])
  }

  async delete(account: string): Promise<void> {
    this.assertDarwin()
    try {
      await execFileAsync("security", ["delete-generic-password", "-s", this.service, "-a", account])
    } catch {
      // Deleting a missing keychain item is idempotent for TokenStore semantics.
    }
  }

  private assertDarwin(): void {
    if (process.platform !== "darwin") {
      throw new UsageError("Keychain token storage is only supported on macOS in this adapter")
    }
  }
}

const tokenFields = ["botToken", "userToken", "adminToken", "appToken", "refreshToken"] as const

const accountFor = (profileName: string, field: TokenField): string =>
  `profile:${profileName}:${field}`
