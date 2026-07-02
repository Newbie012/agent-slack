import { describe, expect, it } from "vitest"
import { BundledMethodCatalog } from "../../src/adapters/catalog/BundledMethodCatalog.js"

describe("method catalog", () => {
  it("lists, filters, and describes bundled methods", () => {
    // ARRANGE
    const catalog = new BundledMethodCatalog()

    // ACT
    const conversations = catalog.listMethods("conversations")
    const history = catalog.describeMethod("conversations.history")

    // ASSERT
    expect(conversations.map((method) => method.method)).toEqual(expect.arrayContaining([
      "conversations.list",
      "conversations.history",
      "conversations.replies"
    ]))
    expect(history).toMatchObject({
      method: "conversations.history",
      itemKey: "messages",
      cursorPaginated: true,
      safety: "read"
    })
  })

  it("classifies unknown unsafe methods conservatively", () => {
    // ARRANGE
    const catalog = new BundledMethodCatalog()

    // ACT
    const adminSafety = catalog.safetyFor("admin.users.list")
    const writeSafety = catalog.safetyFor("chat.update")
    const unknownSafety = catalog.safetyFor("views.open")

    // ASSERT
    expect(adminSafety).toBe("admin")
    expect(writeSafety).toBe("write")
    expect(unknownSafety).toBe("unknown")
    expect(catalog.itemKeyFor("files.list")).toBe("files")
    expect(catalog.itemKeyFor("views.open")).toBeNull()
  })
})
