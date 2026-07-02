import type { AuthProfile } from "../domain/slack.js"

export interface TokenStore {
  readonly getProfile: (name: string) => Promise<AuthProfile | null>
  readonly setProfile: (profile: AuthProfile) => Promise<void>
  readonly listProfiles: () => Promise<readonly AuthProfile[]>
  readonly deleteProfile: (name: string) => Promise<boolean>
}
