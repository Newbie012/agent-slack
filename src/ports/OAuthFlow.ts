import type { AuthProfile } from "../domain/slack.js"

export interface OAuthLoginRequest {
  readonly profileName: string
  readonly clientId: string
  readonly clientSecret: string
  readonly scopes: readonly string[]
  readonly userScopes: readonly string[]
  readonly redirectUri?: string | undefined
  readonly authUrlOut?: string | undefined
  readonly timeoutMs?: number | undefined
  readonly openBrowser?: boolean | undefined
}

export interface OAuthFlow {
  login(input: OAuthLoginRequest): Promise<AuthProfile>
}
