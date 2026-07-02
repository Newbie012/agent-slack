import type { SlackCallInput, SlackCallResult } from "../domain/slack.js"

export interface SlackWebApi {
  readonly call: (input: SlackCallInput) => Promise<SlackCallResult>
}
