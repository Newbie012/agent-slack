// Which token store backs a live session. Default to the OS keychain where it
// exists (macOS) so tokens are encrypted at rest, and fall back to the 0600
// file store elsewhere. An explicit AGENT_SLACK_TOKEN_STORE always wins — set
// it to "file" for headless macOS (SSH, CI) where the keychain would prompt.
// See .agents/adr/ADR-005-default-keychain-token-store.md.
export type TokenStoreKind = "keychain" | "file"

export const selectTokenStoreKind = (
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform
): TokenStoreKind => {
  const explicit = env.AGENT_SLACK_TOKEN_STORE ?? env.SLK_TOKEN_STORE
  if (explicit === "keychain") return "keychain"
  if (explicit === "file") return "file"
  return platform === "darwin" ? "keychain" : "file"
}
