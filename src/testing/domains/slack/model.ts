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

export const generateWorkspaceTestModel = (overrides: Partial<WorkspaceTestModel> = {}): WorkspaceTestModel => ({
  id: overrides.id ?? "T123",
  name: overrides.name ?? "Test Workspace"
})

export const generateSlackUserTestModel = (overrides: Partial<SlackUserTestModel> = {}): SlackUserTestModel => ({
  id: overrides.id ?? "U123",
  name: overrides.name ?? "dev"
})

export const generateSlackChannelTestModel = (overrides: Partial<SlackChannelTestModel> = {}): SlackChannelTestModel => ({
  id: overrides.id ?? "C123",
  name: overrides.name ?? "engineering"
})

export const generateSlackMessageTestModel = (overrides: Partial<SlackMessageTestModel> = {}): SlackMessageTestModel => ({
  channelId: overrides.channelId ?? "C123",
  userId: overrides.userId ?? "U123",
  ts: overrides.ts ?? "1710000000.000100",
  text: overrides.text ?? "hello"
})

export const generateSlackThreadTestModel = (overrides: Partial<SlackThreadTestModel> = {}): SlackThreadTestModel => ({
  channelId: overrides.channelId ?? "C123",
  parentTs: overrides.parentTs ?? "1710000000.000100",
  authorId: overrides.authorId ?? "U123",
  replyCount: overrides.replyCount ?? 2
})

export const toSlackMessagePayload = (model: SlackMessageTestModel) => ({
  type: "message",
  channel: model.channelId,
  user: model.userId,
  ts: model.ts,
  text: model.text
})

export const toSlackThreadMessages = (model: SlackThreadTestModel) => [
  toSlackMessagePayload({
    channelId: model.channelId,
    userId: model.authorId,
    ts: model.parentTs,
    text: "parent"
  }),
  ...Array.from({ length: model.replyCount }, (_, index) =>
    toSlackMessagePayload({
      channelId: model.channelId,
      userId: model.authorId,
      ts: `171000000${index + 1}.000100`,
      text: `reply ${index + 1}`
    })
  )
]
