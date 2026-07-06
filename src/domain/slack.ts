import type { ProfileName, Scope } from "./ids.js"

export type TokenType = "user" | "bot" | "admin" | "app"

export interface AuthProfile {
  readonly name: ProfileName
  readonly teamId?: string
  readonly enterpriseId?: string | null
  readonly userId?: string
  readonly botId?: string
  readonly tokenType: TokenType
  readonly botToken?: string
  readonly userToken?: string
  readonly adminToken?: string
  readonly appToken?: string
  readonly scopes: readonly Scope[]
  // Token rotation (PKCE/public-client logins only). `refreshToken` is a secret
  // used to mint a new access token; `tokenExpiresAt` is epoch seconds for when
  // the current access token expires; `clientId` is the public client used to
  // refresh (no secret needed). Absent for static and confidential logins.
  readonly refreshToken?: string
  readonly tokenExpiresAt?: number
  readonly clientId?: string
}

export interface SlackCallInput {
  readonly method: string
  readonly token: string
  readonly payload: Record<string, unknown>
}

export interface SlackCallResult {
  readonly method: string
  readonly response: Record<string, unknown>
}

export interface Paging {
  readonly next_cursor: string | null
  readonly has_more: boolean
}

export interface CommandEnvelope {
  readonly ok: true
  readonly method: string
  readonly team_id: string | null
  readonly enterprise_id: string | null
  readonly profile: string | null
  readonly data: unknown
  readonly paging: Paging
  readonly warnings: readonly string[]
}

export interface ErrorEnvelope {
  readonly ok: false
  readonly error: {
    readonly type: string
    readonly title: string
    readonly slack_error?: string
    readonly retriable: boolean
    readonly retry_after_seconds?: number
    readonly suggestion?: string
    readonly trace_id: string
    readonly details?: Record<string, unknown>
  }
}
