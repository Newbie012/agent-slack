import { UsageError } from "../domain/errors.js"

// Which token store backs a live session. On macOS the token is ALWAYS stored in
// the Keychain: plaintext file storage is disallowed there, so even
// `AGENT_SLACK_TOKEN_STORE=file` is rejected. On other platforms (no keychain
// adapter) the 0600 file store is the default, with `keychain` honored if set.
// See .agents/adr/ADR-005-default-keychain-token-store.md.
export type TokenStoreKind = "keychain" | "file"

export const selectTokenStoreKind = (
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform
): TokenStoreKind => {
  const explicit = env.AGENT_SLACK_TOKEN_STORE ?? env.SLK_TOKEN_STORE
  if (platform === "darwin") {
    if (explicit === "file") {
      throw new UsageError(
        "Plaintext file token storage is not allowed on macOS; tokens are stored in the Keychain. Unset AGENT_SLACK_TOKEN_STORE.",
        { store: "file", platform }
      )
    }
    return "keychain"
  }
  return explicit === "keychain" ? "keychain" : "file"
}
