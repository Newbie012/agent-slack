import { describe, expect, it } from "vitest"
import { selectTokenStoreKind } from "../../src/adapters/token-store-kind.js"

describe("token store selection", () => {
  it("defaults to keychain on macOS and file elsewhere", () => {
    expect(selectTokenStoreKind({}, "darwin")).toBe("keychain")
    expect(selectTokenStoreKind({}, "linux")).toBe("file")
    expect(selectTokenStoreKind({}, "win32")).toBe("file")
  })

  it("honors an explicit AGENT_SLACK_TOKEN_STORE on any platform", () => {
    expect(selectTokenStoreKind({ AGENT_SLACK_TOKEN_STORE: "file" }, "darwin")).toBe("file")
    expect(selectTokenStoreKind({ AGENT_SLACK_TOKEN_STORE: "keychain" }, "linux")).toBe("keychain")
  })

  it("accepts the SLK_TOKEN_STORE alias", () => {
    expect(selectTokenStoreKind({ SLK_TOKEN_STORE: "file" }, "darwin")).toBe("file")
  })
})
