import { ProfileName, Scope } from "../../../domain/ids.js"
import type { AuthProfile } from "../../../domain/slack.js"

export interface TokenGrantTestModel {
  readonly profileName: string
  readonly token: string
  readonly scopes: readonly string[]
}

export const generateTokenGrantTestModel = (
  overrides: Partial<TokenGrantTestModel> = {}
): TokenGrantTestModel => ({
  profileName: overrides.profileName ?? "default",
  token: overrides.token ?? "xoxb-test-token",
  scopes: overrides.scopes ?? ["channels:read", "channels:history", "users:read"]
})

export const toAuthProfile = (model: TokenGrantTestModel): AuthProfile => ({
  name: ProfileName.make(model.profileName),
  tokenType: "bot",
  botToken: model.token,
  scopes: model.scopes.map(Scope.make)
})
