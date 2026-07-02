import type { AuthProfile, SlackCallInput, SlackCallResult } from "../domain/slack.js"

export interface SlackStub {
  readonly method: string
  readonly response?: Record<string, unknown>
  readonly responses?: Record<string, unknown>[]
}

export interface FileDownloadStub {
  readonly url: string
  readonly content: string | Buffer
}

export interface DriverState {
  readonly profiles: AuthProfile[]
  readonly slackStubs: SlackStub[]
  readonly slackCalls: SlackCallInput[]
  readonly fileDownloads: FileDownloadStub[]
  readonly openedOAuthUrls: string[]
  emulateUrl: string | null
}

export const createDriverState = (): DriverState => ({
  profiles: [],
  slackStubs: [],
  slackCalls: [],
  fileDownloads: [],
  openedOAuthUrls: [],
  emulateUrl: null
})
