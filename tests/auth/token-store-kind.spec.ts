import { describe, expect, it } from "vitest"
import { selectTokenStoreKind } from "../../src/adapters/token-store-kind.js"

describe("token store selection", () => {
  it("always uses the keychain on macOS and file elsewhere", () => {
    expect(selectTokenStoreKind({}, "darwin")).toBe("keychain")
    expect(selectTokenStoreKind({ AGENT_SLACK_TOKEN_STORE: "keychain" }, "darwin")).toBe("keychain")
    expect(selectTokenStoreKind({}, "linux")).toBe("file")
    expect(selectTokenStoreKind({}, "win32")).toBe("file")
  })

  it("rejects forcing plaintext file storage on macOS", () => {
    expect(() => selectTokenStoreKind({ AGENT_SLACK_TOKEN_STORE: "file" }, "darwin")).toThrow(/macOS|Keychain|plaintext/i)
    expect(() => selectTokenStoreKind({ SLK_TOKEN_STORE: "file" }, "darwin")).toThrow(/macOS|Keychain|plaintext/i)
  })

  it("honors an explicit store on other platforms", () => {
    expect(selectTokenStoreKind({ AGENT_SLACK_TOKEN_STORE: "keychain" }, "linux")).toBe("keychain")
    expect(selectTokenStoreKind({ AGENT_SLACK_TOKEN_STORE: "file" }, "linux")).toBe("file")
  })
})
