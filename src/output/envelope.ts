import { randomUUID } from "node:crypto"
import { isSlkError, normalizeUnknownError } from "../domain/errors.js"
import type { AuthProfile, CommandEnvelope, ErrorEnvelope, Paging } from "../domain/slack.js"

export const pagingFrom = (response: Record<string, unknown>): Paging => {
  const metadata = response.response_metadata
  const nextCursor =
    typeof metadata === "object" && metadata !== null && "next_cursor" in metadata
      ? (metadata as { next_cursor?: unknown }).next_cursor
      : undefined
  return {
    next_cursor: typeof nextCursor === "string" && nextCursor.length > 0 ? nextCursor : null,
    has_more: response.has_more === true || (typeof nextCursor === "string" && nextCursor.length > 0)
  }
}

export const successEnvelope = (input: {
  readonly method: string
  readonly profile: AuthProfile | null
  readonly data: unknown
  readonly paging?: Paging
  readonly warnings?: readonly string[]
}): CommandEnvelope => ({
  ok: true,
  method: input.method,
  team_id: input.profile?.teamId ?? null,
  enterprise_id: input.profile?.enterpriseId ?? null,
  profile: input.profile?.name ?? null,
  data: input.data,
  paging: input.paging ?? { next_cursor: null, has_more: false },
  warnings: input.warnings ?? []
})

export const errorEnvelope = (error: unknown): { readonly envelope: ErrorEnvelope; readonly exitCode: number } => {
  const normalized = normalizeUnknownError(error)
  const details = Object.fromEntries(
    Object.entries(normalized.details).filter(([key]) => key !== "suggestion")
  )
  const detailsSlackError = typeof details.slackError === "string" ? details.slackError : undefined
  const slackError = "slackError" in normalized ? normalized.slackError ?? detailsSlackError : detailsSlackError
  const retryAfterSeconds = "retryAfterSeconds" in normalized ? normalized.retryAfterSeconds : undefined
  const detailSuggestion = typeof normalized.details.suggestion === "string" ? normalized.details.suggestion : undefined
  const suggestion = detailSuggestion ?? suggestionFor(normalized._tag)
  const envelope: ErrorEnvelope = {
    ok: false,
    error: {
      type: normalized._tag,
      title: normalized.message,
      ...(slackError === undefined ? {} : { slack_error: slackError }),
      retriable: normalized._tag === "SlackRateLimited",
      ...(retryAfterSeconds === undefined ? {} : { retry_after_seconds: retryAfterSeconds }),
      ...(suggestion === undefined ? {} : { suggestion }),
      trace_id: `slk_${randomUUID()}`,
      ...(Object.keys(details).length === 0 ? {} : { details })
    }
  }
  return { envelope, exitCode: normalized.exitCode }
}

const suggestionFor = (tag: string): string | undefined => {
  switch (tag) {
    case "NotAuthenticated":
      return "Run agent-slack auth login, or use --token with an existing Slack bot token."
    case "MissingScope":
      return "Reinstall or reauthorize the Slack app with the missing scope."
    case "SlackRateLimited":
      return "Retry after the provided delay or reduce page size."
    case "UnsafeMethodBlocked":
      return "Pass --allow-write --yes only when the operator intentionally allows this call."
    default:
      return undefined
  }
}

export const stringifyJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`

// Machine output is compact by default to minimize token cost; `--pretty`
// restores indentation for humans. See ADR-002.
export const serializeJson = (value: unknown, pretty: boolean): string =>
  pretty ? `${JSON.stringify(value, null, 2)}\n` : `${JSON.stringify(value)}\n`

export const toNdjson = (items: readonly unknown[]): string =>
  items.map((item) => JSON.stringify(item)).join("\n") + (items.length > 0 ? "\n" : "")

export const exitCodeOf = (error: unknown): number =>
  isSlkError(error) ? error.exitCode : 1
