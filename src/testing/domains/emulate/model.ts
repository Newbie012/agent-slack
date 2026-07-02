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

export const generateOAuthAppTestModel = (overrides: Partial<OAuthAppTestModel> = {}): OAuthAppTestModel => ({
  clientId: overrides.clientId ?? "12345.67890",
  clientSecret: overrides.clientSecret ?? "example_client_secret"
})

export const generateEmulateSlackWorkspaceTestModel = (
  overrides: Partial<EmulateSlackWorkspaceTestModel> = {}
): EmulateSlackWorkspaceTestModel => ({
  token: overrides.token ?? "xoxb-local-test",
  scopes: overrides.scopes ?? ["chat:write", "channels:read", "channels:history", "users:read"],
  channelName: overrides.channelName ?? "engineering",
  userName: overrides.userName ?? "developer"
})

export const toEmulateOAuthAppSeed = (model: OAuthAppTestModel) => ({
  client_id: model.clientId,
  client_secret: model.clientSecret
})

export const toEmulateSlackSeed = (model: EmulateSlackWorkspaceTestModel) => ({
  slack: {
    strict_scopes: true,
    team: {
      name: "Test Workspace",
      domain: "test-workspace"
    },
    users: [
      {
        name: model.userName,
        real_name: "Developer",
        email: "dev@example.com",
        is_admin: true
      }
    ],
    channels: [
      {
        name: model.channelName,
        topic: "Engineering discussion"
      }
    ],
    tokens: [
      {
        token: model.token,
        user: model.userName,
        scopes: model.scopes
      }
    ]
  }
})
