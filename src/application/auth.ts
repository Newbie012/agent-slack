import { NotAuthenticated, UnsafeMethodBlocked, UsageError } from "../domain/errors.js"
import type { AuthProfile, TokenType } from "../domain/slack.js"
import type { CliServices } from "./services.js"

// Refresh a rotating token slightly before it expires so calls don't fail on a
// just-expired token.
const REFRESH_SKEW_SECONDS = 120

// For a refreshable (PKCE/public-client) profile whose access token is expired
// or about to expire, mint a fresh token, persist it, and return the updated
// profile. Non-rotating profiles pass through untouched. A failed refresh means
// the session is dead, so surface a re-login error rather than a stale token.
const ensureFreshTokens = async (services: CliServices, profile: AuthProfile): Promise<AuthProfile> => {
  if (profile.refreshToken === undefined || profile.clientId === undefined || profile.tokenExpiresAt === undefined) {
    return profile
  }
  const now = Math.floor(Date.now() / 1000)
  if (profile.tokenExpiresAt - REFRESH_SKEW_SECONDS > now) {
    return profile
  }
  let refreshed
  try {
    refreshed = await services.oauthFlow.refresh({ clientId: profile.clientId, refreshToken: profile.refreshToken })
  } catch {
    throw new NotAuthenticated(
      `Slack session for profile ${profile.name} expired and could not be refreshed. Run agent-slack auth login.`,
      { profile: profile.name }
    )
  }
  const updated: AuthProfile = {
    ...profile,
    userToken: refreshed.accessToken,
    ...(refreshed.refreshToken === undefined ? {} : { refreshToken: refreshed.refreshToken }),
    ...(refreshed.expiresIn === undefined ? {} : { tokenExpiresAt: now + refreshed.expiresIn })
  }
  await services.tokenStore.setProfile(updated)
  return updated
}

export const getProfile = async (services: CliServices, name: string): Promise<AuthProfile> => {
  const profile = await services.tokenStore.getProfile(name)
  if (profile === null) {
    throw new NotAuthenticated(`No auth profile named ${name}`, { profile: name })
  }
  return ensureFreshTokens(services, profile)
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
