export type SlkError =
  | NotAuthenticated
  | MissingScope
  | PermissionDenied
  | SlackRateLimited
  | SlackApiFailed
  | InvalidPayload
  | ResourceNotFound
  | UnsafeMethodBlocked
  | UsageError
  | UnsupportedMethod

export abstract class TaggedSlkError extends Error {
  abstract readonly _tag: SlkError["_tag"]
  abstract readonly exitCode: number
  readonly details: Record<string, unknown>

  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.name = new.target.name
    this.details = details
  }
}

export class NotAuthenticated extends TaggedSlkError {
  readonly _tag = "NotAuthenticated"
  readonly exitCode = 4
}

export class MissingScope extends TaggedSlkError {
  readonly _tag = "MissingScope"
  readonly exitCode = 4
}

export class PermissionDenied extends TaggedSlkError {
  readonly _tag = "PermissionDenied"
  readonly exitCode = 4
}

export class SlackRateLimited extends TaggedSlkError {
  readonly _tag = "SlackRateLimited"
  readonly exitCode = 6
  readonly retryAfterSeconds: number | undefined

  constructor(message: string, details: Record<string, unknown> & { retryAfterSeconds?: number } = {}) {
    super(message, details)
    this.retryAfterSeconds = details.retryAfterSeconds
  }
}

export class SlackApiFailed extends TaggedSlkError {
  readonly _tag = "SlackApiFailed"
  readonly exitCode = 1
  readonly slackError: string | undefined

  constructor(message: string, details: Record<string, unknown> & { slackError?: string } = {}) {
    super(message, details)
    this.slackError = details.slackError
  }
}

export class InvalidPayload extends TaggedSlkError {
  readonly _tag = "InvalidPayload"
  readonly exitCode = 2
}

export class ResourceNotFound extends TaggedSlkError {
  readonly _tag = "ResourceNotFound"
  readonly exitCode = 3
}

export class UnsafeMethodBlocked extends TaggedSlkError {
  readonly _tag = "UnsafeMethodBlocked"
  readonly exitCode = 5
}

export class UsageError extends TaggedSlkError {
  readonly _tag = "UsageError"
  readonly exitCode = 2
}

export class UnsupportedMethod extends TaggedSlkError {
  readonly _tag = "UnsupportedMethod"
  readonly exitCode = 2
}

export const isSlkError = (error: unknown): error is SlkError =>
  error instanceof TaggedSlkError

export const normalizeUnknownError = (error: unknown): SlkError => {
  if (isSlkError(error)) {
    return error
  }
  if (error instanceof Error) {
    return new SlackApiFailed(error.message, { cause: error.name })
  }
  return new SlackApiFailed("Unexpected failure", { cause: String(error) })
}
