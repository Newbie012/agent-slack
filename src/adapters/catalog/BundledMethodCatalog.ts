import type { MethodCatalog, MethodMetadata, MethodSafety } from "../../ports/MethodCatalog.js"

const methods: readonly MethodMetadata[] = [
  { method: "api.test", family: "api", summary: "Test Slack API reachability.", safety: "read", scopes: [], cursorPaginated: false },
  { method: "auth.test", family: "auth", summary: "Test authentication.", safety: "read", scopes: [], cursorPaginated: false },
  { method: "team.info", family: "team", summary: "Workspace info.", safety: "read", scopes: ["team:read"], cursorPaginated: false },
  { method: "team.profile.get", family: "team", summary: "Workspace profile fields.", safety: "read", scopes: ["users.profile:read"], cursorPaginated: false },
  { method: "conversations.list", family: "conversations", summary: "List conversations.", safety: "read", scopes: ["channels:read", "groups:read", "im:read", "mpim:read"], itemKey: "channels", cursorPaginated: true },
  { method: "conversations.info", family: "conversations", summary: "Conversation info.", safety: "read", scopes: ["channels:read", "groups:read", "im:read", "mpim:read"], cursorPaginated: false },
  { method: "conversations.members", family: "conversations", summary: "Conversation members.", safety: "read", scopes: ["channels:read", "groups:read", "im:read", "mpim:read"], itemKey: "members", cursorPaginated: true },
  { method: "conversations.history", family: "conversations", summary: "Conversation history.", safety: "read", scopes: ["channels:history", "groups:history", "im:history", "mpim:history"], itemKey: "messages", cursorPaginated: true },
  { method: "conversations.replies", family: "conversations", summary: "Thread replies.", safety: "read", scopes: ["channels:history", "groups:history", "im:history", "mpim:history"], itemKey: "messages", cursorPaginated: true },
  { method: "chat.getPermalink", family: "chat", summary: "Message permalink.", safety: "read", scopes: [], cursorPaginated: false },
  { method: "users.list", family: "users", summary: "List users.", safety: "read", scopes: ["users:read"], itemKey: "members", cursorPaginated: true },
  { method: "users.info", family: "users", summary: "User info.", safety: "read", scopes: ["users:read"], cursorPaginated: false },
  { method: "users.lookupByEmail", family: "users", summary: "Find user by email.", safety: "read", scopes: ["users:read.email"], cursorPaginated: false },
  { method: "users.getPresence", family: "users", summary: "User presence.", safety: "read", scopes: ["users:read"], cursorPaginated: false },
  { method: "usergroups.list", family: "usergroups", summary: "List user groups.", safety: "read", scopes: ["usergroups:read"], itemKey: "usergroups", cursorPaginated: false },
  { method: "usergroups.users.list", family: "usergroups", summary: "List users in a user group.", safety: "read", scopes: ["usergroups:read"], itemKey: "users", cursorPaginated: false },
  { method: "files.list", family: "files", summary: "List files.", safety: "read", scopes: ["files:read"], itemKey: "files", cursorPaginated: true },
  { method: "files.info", family: "files", summary: "File info.", safety: "read", scopes: ["files:read"], cursorPaginated: false },
  { method: "reactions.get", family: "reactions", summary: "Message reactions.", safety: "read", scopes: ["reactions:read"], cursorPaginated: false },
  { method: "pins.list", family: "pins", summary: "Pinned items.", safety: "read", scopes: ["pins:read"], itemKey: "items", cursorPaginated: false },
  { method: "bookmarks.list", family: "bookmarks", summary: "Channel bookmarks.", safety: "read", scopes: ["bookmarks:read"], itemKey: "bookmarks", cursorPaginated: false },
  { method: "emoji.list", family: "emoji", summary: "Workspace emoji.", safety: "read", scopes: ["emoji:read"], cursorPaginated: false },
  { method: "dnd.info", family: "dnd", summary: "DND status.", safety: "read", scopes: ["dnd:read"], cursorPaginated: false },
  { method: "search.messages", family: "search", summary: "Legacy message search.", safety: "read", scopes: ["search:read.public", "search:read.private"], itemKey: "matches", cursorPaginated: false },
  { method: "search.files", family: "search", summary: "Legacy file search.", safety: "read", scopes: ["search:read.files"], itemKey: "matches", cursorPaginated: false },
  { method: "assistant.search.context", family: "assistant", summary: "Real-time Search API context.", safety: "read", scopes: ["search:read.public", "search:read.private"], itemKey: "results", cursorPaginated: false },
  { method: "chat.postMessage", family: "chat", summary: "Post message.", safety: "write", scopes: ["chat:write"], cursorPaginated: false },
  { method: "chat.delete", family: "chat", summary: "Delete message.", safety: "destructive", scopes: ["chat:write"], cursorPaginated: false },
  { method: "files.delete", family: "files", summary: "Delete file.", safety: "destructive", scopes: ["files:write"], cursorPaginated: false }
]

const unsafePrefixes = ["admin.", "chat.post", "chat.update", "chat.delete", "files.delete", "conversations.archive", "conversations.kick"]

export class BundledMethodCatalog implements MethodCatalog {
  listMethods(family?: string): readonly MethodMetadata[] {
    return family === undefined ? methods : methods.filter((method) => method.family === family)
  }

  describeMethod(method: string): MethodMetadata | null {
    return methods.find((item) => item.method === method) ?? null
  }

  safetyFor(method: string): MethodSafety {
    const found = this.describeMethod(method)
    if (found !== null) {
      return found.safety
    }
    if (unsafePrefixes.some((prefix) => method.startsWith(prefix))) {
      return method.startsWith("admin.") ? "admin" : "write"
    }
    return "unknown"
  }

  itemKeyFor(method: string): string | null {
    return this.describeMethod(method)?.itemKey ?? null
  }
}
