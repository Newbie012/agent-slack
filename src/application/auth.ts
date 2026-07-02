import { NotAuthenticated, UnsafeMethodBlocked, UsageError } from "../domain/errors.js"
import type { AuthProfile, TokenType } from "../domain/slack.js"
import type { CliServices } from "./services.js"

export const getProfile = async (services: CliServices, name: string): Promise<AuthProfile> => {
  const profile = await services.tokenStore.getProfile(name)
  if (profile === null) {
    throw new NotAuthenticated(`No auth profile named ${name}`, { profile: name })
  }
  return profile
}

export const tokenFor = (profile: AuthProfile, tokenType: TokenType): string => {
  const token =
    tokenType === "user" ? profile.userToken :
    tokenType === "admin" ? profile.adminToken :
    tokenType === "app" ? profile.appToken :
    profile.botToken ?? profile.userToken ?? profile.adminToken ?? profile.appToken

  if (token === undefined || token.length === 0) {
    throw new NotAuthenticated(`Profile ${profile.name} does not have a ${tokenType} token`, {
      profile: profile.name,
      tokenType
    })
  }
  return token
}

export const parseTokenType = (value: string | undefined): TokenType => {
  if (value === undefined) {
    return "bot"
  }
  if (value === "user" || value === "bot" || value === "admin" || value === "app") {
    return value
  }
  throw new UsageError("Invalid token type", { tokenType: value })
}

export const requireYes = (input: { readonly yes: boolean; readonly message: string }) => {
  if (!input.yes) {
    throw new UnsafeMethodBlocked(input.message)
  }
}
