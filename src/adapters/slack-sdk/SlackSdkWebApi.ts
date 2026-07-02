import { WebClient } from "@slack/web-api"
import { MissingScope, PermissionDenied, SlackApiFailed, SlackRateLimited } from "../../domain/errors.js"
import type { SlackCallInput, SlackCallResult } from "../../domain/slack.js"
import type { SlackWebApi } from "../../ports/SlackWebApi.js"

export class SlackSdkWebApi implements SlackWebApi {
  constructor(private readonly options: { readonly slackApiUrl?: string } = {}) {}

  async call(input: SlackCallInput): Promise<SlackCallResult> {
    const client = new WebClient(input.token, {
      ...(this.options.slackApiUrl === undefined ? {} : { slackApiUrl: this.options.slackApiUrl }),
      allowAbsoluteUrls: false
    })
    try {
      const response = await client.apiCall(input.method, input.payload)
      const record = response as unknown as Record<string, unknown>
      if (record.ok === false) {
        throw slackError(input.method, record)
      }
      return { method: input.method, response: record }
    } catch (error) {
      if (error instanceof SlackApiFailed || error instanceof MissingScope || error instanceof PermissionDenied || error instanceof SlackRateLimited) {
        throw error
      }
      const maybe = error as { code?: string; data?: { error?: string }; retryAfter?: number }
      if (maybe.code === "slack_webapi_rate_limited") {
        throw new SlackRateLimited(
          "Slack rate limit reached",
          maybe.retryAfter === undefined ? {} : { retryAfterSeconds: maybe.retryAfter }
        )
      }
      if (maybe.code === "slack_webapi_platform_error" && maybe.data !== undefined) {
        throw slackError(input.method, maybe.data as Record<string, unknown>)
      }
      throw new SlackApiFailed(`Slack method failed: ${input.method}`, { method: input.method, cause: error instanceof Error ? error.message : String(error) })
    }
  }
}

const slackError = (method: string, response: Record<string, unknown>) => {
  const slackErrorText = typeof response.error === "string" ? response.error : "unknown_error"
  if (slackErrorText === "missing_scope") {
    throw new MissingScope("Slack method is missing required scope", { method, slackError: slackErrorText, response })
  }
  if (slackErrorText === "invalid_auth" || slackErrorText === "not_authed" || slackErrorText === "account_inactive") {
    throw new PermissionDenied("Slack authentication failed", { method, slackError: slackErrorText })
  }
  if (slackErrorText === "ratelimited") {
    throw new SlackRateLimited("Slack rate limit reached", { method, slackError: slackErrorText })
  }
  throw new SlackApiFailed(`Slack method returned ${slackErrorText}`, { method, slackError: slackErrorText, response })
}
