import {
  generateTokenGrantTestModel as generateTokenGrantTestModelImpl,
  toAuthProfile as toAuthProfileImpl
} from "./domains/auth/model.js"
import {
  generateCliRunTestModel as generateCliRunTestModelImpl,
  toCliRunOptions as toCliRunOptionsImpl
} from "./domains/cli/model.js"
import {
  generateEmulateSlackWorkspaceTestModel as generateEmulateSlackWorkspaceTestModelImpl,
  generateOAuthAppTestModel as generateOAuthAppTestModelImpl,
  toEmulateSlackSeed as toEmulateSlackSeedImpl,
  toEmulateOAuthAppSeed as toEmulateOAuthAppSeedImpl
} from "./domains/emulate/model.js"
import {
  generateSlackChannelTestModel as generateSlackChannelTestModelImpl,
  generateSlackMessageTestModel as generateSlackMessageTestModelImpl,
  generateSlackThreadTestModel as generateSlackThreadTestModelImpl,
  generateSlackUserTestModel as generateSlackUserTestModelImpl,
  generateWorkspaceTestModel as generateWorkspaceTestModelImpl,
  toSlackMessagePayload as toSlackMessagePayloadImpl,
  toSlackThreadMessages as toSlackThreadMessagesImpl
} from "./domains/slack/model.js"

export interface TokenGrantTestModel {
  readonly profileName: string
  readonly token: string
  readonly scopes: readonly string[]
}

export interface CliRunTestModel {
  readonly args: readonly string[]
}

export interface OAuthAppTestModel {
  readonly clientId: string
  readonly clientSecret: string
}

export interface EmulateSlackWorkspaceTestModel {
  readonly token: string
  readonly scopes: readonly string[]
  readonly channelName: string
  readonly userName: string
}

export interface WorkspaceTestModel {
  readonly id: string
  readonly name: string
}

export interface SlackUserTestModel {
  readonly id: string
  readonly name: string
}

export interface SlackChannelTestModel {
  readonly id: string
  readonly name: string
}

export interface SlackMessageTestModel {
  readonly channelId: string
  readonly userId: string
  readonly ts: string
  readonly text: string
}

export interface SlackThreadTestModel {
  readonly channelId: string
  readonly parentTs: string
  readonly authorId: string
  readonly replyCount: number
}

export const generateTokenGrantTestModel = (overrides: Partial<TokenGrantTestModel> = {}): TokenGrantTestModel =>
  generateTokenGrantTestModelImpl(overrides)

export const generateCliRunTestModel = (overrides: Partial<CliRunTestModel> = {}): CliRunTestModel =>
  generateCliRunTestModelImpl(overrides)

export const generateOAuthAppTestModel = (overrides: Partial<OAuthAppTestModel> = {}): OAuthAppTestModel =>
  generateOAuthAppTestModelImpl(overrides)

export const generateEmulateSlackWorkspaceTestModel = (
  overrides: Partial<EmulateSlackWorkspaceTestModel> = {}
): EmulateSlackWorkspaceTestModel =>
  generateEmulateSlackWorkspaceTestModelImpl(overrides)

export const generateWorkspaceTestModel = (overrides: Partial<WorkspaceTestModel> = {}): WorkspaceTestModel =>
  generateWorkspaceTestModelImpl(overrides)

export const generateSlackUserTestModel = (overrides: Partial<SlackUserTestModel> = {}): SlackUserTestModel =>
  generateSlackUserTestModelImpl(overrides)

export const generateSlackChannelTestModel = (overrides: Partial<SlackChannelTestModel> = {}): SlackChannelTestModel =>
  generateSlackChannelTestModelImpl(overrides)

export const generateSlackMessageTestModel = (overrides: Partial<SlackMessageTestModel> = {}): SlackMessageTestModel =>
  generateSlackMessageTestModelImpl(overrides)

export const generateSlackThreadTestModel = (overrides: Partial<SlackThreadTestModel> = {}): SlackThreadTestModel =>
  generateSlackThreadTestModelImpl(overrides)

export const toAuthProfile = toAuthProfileImpl
export const toCliRunOptions = toCliRunOptionsImpl
export const toEmulateOAuthAppSeed = toEmulateOAuthAppSeedImpl
export const toEmulateSlackSeed = toEmulateSlackSeedImpl
export const toSlackMessagePayload = toSlackMessagePayloadImpl
export const toSlackThreadMessages = toSlackThreadMessagesImpl
