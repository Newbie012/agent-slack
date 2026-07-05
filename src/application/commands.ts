import { flagBoolean, flagString, requireFlag, splitCsv } from "../cli/args.js"
import { CLI_VERSION, PRIMARY_COMMAND_NAME, describeAllCommands, describeCommandGroup, findCommandMetadata, renderCompletion, renderHumanHelp } from "../cli/metadata.js"
import type { CliExecutionOptions, ParsedArgs } from "../cli/types.js"
import { ResourceNotFound, UnsupportedMethod, UsageError } from "../domain/errors.js"
import { ProfileName, Scope } from "../domain/ids.js"
import type { AuthProfile } from "../domain/slack.js"
import { pagingFrom, serializeJson, successEnvelope, toNdjson } from "../output/envelope.js"
import { renderHumanEnvelope } from "../output/human.js"
import { normalizeResponse, slimFile, slimMessage, slimUser } from "../output/normalize.js"
import { projectFields } from "../output/projection.js"
import { getProfile, parseTokenType, requireYes, tokenFor } from "./auth.js"
import { parseJsonPayload, requirePositional } from "./payload.js"
import type { CliServices } from "./services.js"
import { callSlack } from "./slack-call.js"

export interface DispatchResult {
  readonly stdoutValue: unknown
  readonly rawStdout?: string
  readonly method: string
  readonly profile: AuthProfile | null
  readonly response?: Record<string, unknown>
  readonly items?: readonly unknown[]
  // Typed records streamed after `items` in ndjson mode so `--include`
  // hydration is not lost in the streaming format. See ADR-004.
  readonly enrichmentRecords?: readonly unknown[]
  readonly warnings?: readonly string[]
}

export const dispatch = async (parsed: ParsedArgs, services: CliServices): Promise<DispatchResult> => {
  const pos = parsed.positionals
  const [first, second, third] = pos

  if (flagBoolean(parsed, "version")) {
    return {
      method: "version",
      profile: null,
      stdoutValue: null,
      rawStdout: `${CLI_VERSION}\n`
    }
  }

  if (flagBoolean(parsed, "help") && !flagBoolean(parsed, "json")) {
    return {
      method: "help",
      profile: null,
      stdoutValue: null,
      rawStdout: renderHumanHelp(pos)
    }
  }

  if (pos.length === 0 || first === "describe") {
    return {
      method: "describe",
      profile: null,
      stdoutValue: describeAllCommands()
    }
  }

  if (first === "completion") {
    const shell = requirePositional(pos, 1, "SHELL")
    const completion = renderCompletion(shell)
    if (completion === "") {
      throw new UsageError("Unsupported completion shell", { shell })
    }
    return {
      method: "completion",
      profile: null,
      stdoutValue: null,
      rawStdout: completion
    }
  }

  if (flagBoolean(parsed, "help") && flagBoolean(parsed, "json")) {
    return describePath(pos, null)
  }

  if (second === "describe") {
    return describePath(first === undefined ? [] : [first], null)
  }

  if (first === "api") {
    if (second === "methods" && third === "list") {
      const family = flagString(parsed, "family")
      return { method: "api.methods.list", profile: null, stdoutValue: services.methodCatalog.listMethods(family) }
    }
    if (second === "method" && third === "describe") {
      const method = requirePositional(pos, 3, "METHOD")
      const described = services.methodCatalog.describeMethod(method)
      if (described === null) {
        throw new UnsupportedMethod(`No bundled metadata for ${method}`, { method })
      }
      return { method: "api.method.describe", profile: null, stdoutValue: described }
    }
    if (second === "call") {
      return apiCall(parsed, services)
    }
  }

  if (first === "auth") {
    return authCommand(parsed, services)
  }

  if (first === "team") {
    return teamCommand(parsed, services)
  }

  if (first === "enterprise" && second === "get") {
    return methodCall(parsed, services, { method: "team.info", payload: {} })
  }

  if (first === "user") {
    return userCommand(parsed, services)
  }

  if (first === "usergroups") {
    return usergroupsCommand(parsed, services)
  }

  if (first === "conversation") {
    return conversationCommand(parsed, services)
  }

  if (first === "thread" && second === "get") {
    return threadGet(parsed, services)
  }

  if (first === "message") {
    if (second === "get") {
      const ts = requireFlag(parsed, "ts")
      return methodCall(parsed, services, {
        method: "conversations.history",
        payload: {
          channel: requireFlag(parsed, "channel"),
          latest: ts,
          oldest: ts,
          inclusive: true,
          limit: 1
        }
      })
    }
    if (second === "permalink") {
      return methodCall(parsed, services, {
        method: "chat.getPermalink",
        payload: { channel: requireFlag(parsed, "channel"), message_ts: requireFlag(parsed, "ts") }
      })
    }
  }

  if (first === "search") {
    return searchCommand(parsed, services)
  }

  if (first === "file") {
    return fileCommand(parsed, services)
  }

  if (first === "reaction" && second === "get") {
    return methodCall(parsed, services, {
      method: "reactions.get",
      payload: { channel: requireFlag(parsed, "channel"), timestamp: requireFlag(parsed, "ts") }
    })
  }

  if (first === "pin" && second === "list") {
    return methodCall(parsed, services, {
      method: "pins.list",
      payload: { channel: requirePositional(pos, 2, "CHANNEL_ID") }
    })
  }

  if (first === "bookmark" && second === "list") {
    return methodCall(parsed, services, {
      method: "bookmarks.list",
      payload: { channel_id: requirePositional(pos, 2, "CHANNEL_ID") }
    })
  }

  if (first === "emoji" && second === "list") {
    return methodCall(parsed, services, { method: "emoji.list", payload: {} })
  }

  if (first === "dnd" && second === "status") {
    return methodCall(parsed, services, {
      method: "dnd.info",
      payload: pos[2] === undefined ? {} : { user: pos[2] }
    })
  }

  return describePath(pos, new UsageError(`Unknown command: ${pos.join(" ")}`, { command: pos.join(" ") }))
}

const describePath = (path: readonly string[], error: UsageError | null): DispatchResult => {
  const metadata = findCommandMetadata(path)
  const value = metadata ?? describeCommandGroup(path[0] ?? PRIMARY_COMMAND_NAME)
  if (error !== null && metadata === null) {
    throw error
  }
  return { method: "describe", profile: null, stdoutValue: value }
}

const authCommand = async (parsed: ParsedArgs, services: CliServices): Promise<DispatchResult> => {
  const pos = parsed.positionals
  const profileName = flagString(parsed, "profile", "default") ?? "default"
  const second = pos[1]
  if (second === "profiles" && pos[2] === "list") {
    return {
      method: "auth.profiles.list",
      profile: null,
      stdoutValue: sanitizeProfiles(await services.tokenStore.listProfiles())
    }
  }
  if (second === "logout") {
    requireYes({ yes: flagBoolean(parsed, "yes"), message: "Refusing to delete auth profile without --yes" })
    return {
      method: "auth.logout",
      profile: null,
      stdoutValue: { deleted: await services.tokenStore.deleteProfile(profileName), profile: profileName }
    }
  }
  if (second === "status" || second === "scopes") {
    const profile = await getProfile(services, profileName)
    return {
      method: `auth.${second}`,
      profile,
      stdoutValue: second === "scopes" ? { scopes: profile.scopes } : sanitizeProfile(profile)
    }
  }
  if (second === "test") {
    return methodCall(parsed, services, { method: "auth.test", payload: {} })
  }
  if (second === "login") {
    const token = flagString(parsed, "token") ?? process.env.AGENT_SLACK_TOKEN ?? process.env.SLK_TOKEN ?? process.env.SLACK_BOT_TOKEN
    if (token !== undefined && !flagBoolean(parsed, "oauth")) {
      const profile: AuthProfile = {
        name: ProfileName.make(profileName),
        tokenType: "bot",
        botToken: token,
        scopes: splitCsv(flagString(parsed, "scopes")).map(Scope.make)
      }
      await services.tokenStore.setProfile(profile)
      return { method: "auth.login", profile, stdoutValue: sanitizeProfile(profile) }
    }

    const clientId = flagString(parsed, "client-id") ?? process.env.AGENT_SLACK_CLIENT_ID ?? process.env.AGENT_SLACK_PUBLIC_CLIENT_ID ?? process.env.SLK_CLIENT_ID ?? process.env.SLACK_CLIENT_ID ?? defaultPkceClientId
    const clientSecret = flagString(parsed, "client-secret") ?? process.env.AGENT_SLACK_CLIENT_SECRET ?? process.env.SLK_CLIENT_SECRET ?? process.env.SLACK_CLIENT_SECRET
    const byoOAuth = flagBoolean(parsed, "oauth")
    if (byoOAuth && (clientId === undefined || clientSecret === undefined)) {
      throw new UsageError("Slack OAuth with app credentials needs both --client-id and --client-secret.", {
        suggestion: "Use --token with an existing Slack bot token, or pass both app credentials from Basic Information > App Credentials."
      })
    }
    const scopes = splitCsv(flagString(parsed, "scopes"))
    const userScopes = splitCsv(flagString(parsed, "user-scopes"))
    const pkceUserScopes = userScopes.length > 0 ? userScopes : scopes.length > 0 ? scopes : defaultPkceUserScopes
    const redirectUri = flagString(parsed, "redirect-uri") ?? (
      !byoOAuth && clientId === defaultPkceClientId ? defaultPkceRedirectUri : undefined
    )
    const profile = await services.oauthFlow.login({
      profileName,
      clientId,
      ...(byoOAuth ? { clientSecret } : { pkce: true }),
      scopes: byoOAuth ? (scopes.length === 0 ? defaultOAuthScopes : scopes) : [],
      userScopes: byoOAuth ? userScopes : pkceUserScopes,
      redirectUri,
      authUrlOut: flagString(parsed, "auth-url-out"),
      timeoutMs: numberFlag(parsed, "timeout-ms"),
      openBrowser: !flagBoolean(parsed, "no-open")
    })
    await services.tokenStore.setProfile(profile)
    return { method: "auth.login", profile, stdoutValue: sanitizeProfile(profile) }
  }
  throw new UsageError("Unknown auth command", { command: pos.join(" ") })
}

const defaultOAuthScopes = [
  "channels:read",
  "channels:history",
  "groups:read",
  "groups:history",
  "im:read",
  "im:history",
  "mpim:read",
  "mpim:history",
  "users:read",
  "files:read",
  "reactions:read",
  "pins:read",
  "bookmarks:read",
  "team:read"
] as const

const defaultPkceUserScopes = defaultOAuthScopes
const defaultPkceClientId = "11499810382723.11506074725874"
const defaultPkceRedirectUri = "https://aslk.vercel.app/oauth/slack/callback"

const apiCall = async (parsed: ParsedArgs, services: CliServices): Promise<DispatchResult> => {
  const method = requirePositional(parsed.positionals, 2, "METHOD")
  const payload = await parseJsonPayload({
    inline: flagString(parsed, "payload"),
    positional: parsed.positionals[3]
  })
  return methodCall(parsed, services, { method, payload }, { normalize: false })
}

const teamCommand = async (parsed: ParsedArgs, services: CliServices): Promise<DispatchResult> => {
  const second = parsed.positionals[1]
  if (second === "get") {
    return methodCall(parsed, services, { method: "team.info", payload: {} })
  }
  if (second === "profile" && parsed.positionals[2] === "get") {
    return methodCall(parsed, services, { method: "team.profile.get", payload: {} })
  }
  throw new UsageError("Unknown team command", { command: parsed.positionals.join(" ") })
}

const userCommand = async (parsed: ParsedArgs, services: CliServices): Promise<DispatchResult> => {
  const second = parsed.positionals[1]
  if (second === "list") {
    return methodCall(parsed, services, { method: "users.list", payload: { limit: numberFlag(parsed, "limit") } })
  }
  if (second === "get") {
    return methodCall(parsed, services, { method: "users.info", payload: { user: requirePositional(parsed.positionals, 2, "USER_ID") } })
  }
  if (second === "lookup") {
    return methodCall(parsed, services, { method: "users.lookupByEmail", payload: { email: requireFlag(parsed, "email") } })
  }
  if (second === "presence" && parsed.positionals[2] === "get") {
    return methodCall(parsed, services, { method: "users.getPresence", payload: { user: requirePositional(parsed.positionals, 3, "USER_ID") } })
  }
  throw new UsageError("Unknown user command", { command: parsed.positionals.join(" ") })
}

const usergroupsCommand = async (parsed: ParsedArgs, services: CliServices): Promise<DispatchResult> => {
  const second = parsed.positionals[1]
  if (second === "list") {
    return methodCall(parsed, services, { method: "usergroups.list", payload: {} })
  }
  if (second === "users" && parsed.positionals[2] === "list") {
    return methodCall(parsed, services, {
      method: "usergroups.users.list",
      payload: { usergroup: requirePositional(parsed.positionals, 3, "USERGROUP_ID") }
    })
  }
  throw new UsageError("Unknown usergroups command", { command: parsed.positionals.join(" ") })
}

const conversationCommand = async (parsed: ParsedArgs, services: CliServices): Promise<DispatchResult> => {
  const second = parsed.positionals[1]
  if (second === "list") {
    return methodCall(parsed, services, {
      method: "conversations.list",
      payload: {
        types: flagString(parsed, "types", "public_channel,private_channel,mpim,im"),
        exclude_archived: true,
        limit: numberFlag(parsed, "limit")
      }
    })
  }
  if (second === "get") {
    return methodCall(parsed, services, {
      method: "conversations.info",
      payload: { channel: requirePositional(parsed.positionals, 2, "CHANNEL_ID") }
    })
  }
  if (second === "members") {
    return methodCall(parsed, services, {
      method: "conversations.members",
      payload: { channel: requirePositional(parsed.positionals, 2, "CHANNEL_ID"), limit: numberFlag(parsed, "limit") }
    })
  }
  if (second === "context") {
    return conversationContext(parsed, services)
  }
  if (second === "history") {
    const channel = requirePositional(parsed.positionals, 2, "CHANNEL_ID")
    return methodCall(parsed, services, {
      method: "conversations.history",
      payload: {
        channel,
        oldest: flagString(parsed, "oldest") ?? sinceToOldest(flagString(parsed, "since")),
        latest: flagString(parsed, "latest"),
        inclusive: flagBoolean(parsed, "inclusive"),
        limit: numberFlag(parsed, "limit")
      }
    })
  }
  throw new UsageError("Unknown conversation command", { command: parsed.positionals.join(" ") })
}

const hasScope = (profile: AuthProfile, scope: string): boolean =>
  (profile.scopes as readonly string[]).includes(scope)

const conversationContext = async (parsed: ParsedArgs, services: CliServices): Promise<DispatchResult> => {
  const channel = requirePositional(parsed.positionals, 2, "CHANNEL_ID")
  const profileName = flagString(parsed, "profile", "default") ?? "default"
  const tokenType = parseTokenType(flagString(parsed, "token"))
  const profile = await getProfile(services, profileName)
  const token = tokenFor(profile, tokenType)
  const include = new Set(splitCsv(flagString(parsed, "include")))
  const history = await callSlack(services, {
    method: "conversations.history",
    payload: cleanObject({
      channel,
      oldest: flagString(parsed, "oldest") ?? sinceToOldest(flagString(parsed, "since")),
      latest: flagString(parsed, "latest"),
      inclusive: flagBoolean(parsed, "inclusive"),
      limit: numberFlag(parsed, "limit")
    }),
    token,
    profile,
    all: flagBoolean(parsed, "all"),
    allowWrite: false,
    yes: false
  })
  const full = flagBoolean(parsed, "full")
  const shape = (message: unknown): unknown => (full ? message : slimMessage(message))
  const messages = extractArray(history.response.messages)
  const warnings: string[] = []
  const context: Record<string, unknown> = {
    channel,
    messages: messages.map(shape)
  }

  // Fetch threads first so authors who appear only in replies still get hydrated.
  const threadReplies: Record<string, readonly unknown[]> = {}
  if (include.has("threads")) {
    const threads: Record<string, unknown> = {}
    for (const message of messages) {
      const record = extractLooseRecord(message)
      const ts = stringField(record, "thread_ts") ?? stringField(record, "ts")
      const hasReplies = typeof record.reply_count === "number" && record.reply_count > 0
      if (ts !== undefined && hasReplies) {
        const thread = await callSlack(services, {
          method: "conversations.replies",
          payload: { channel, ts },
          token,
          profile,
          all: false,
          allowWrite: false,
          yes: false
        })
        // Drop the root; it is already present in `messages`.
        const replies = extractArray(thread.response.messages).filter(
          (reply) => stringField(extractLooseRecord(reply), "ts") !== ts
        )
        threadReplies[ts] = replies
        threads[ts] = replies.map(shape)
      }
    }
    context.threads = threads
  }

  if (include.has("users")) {
    if (hasScope(profile, "users:read")) {
      const replyAuthors = Object.values(threadReplies)
        .flat()
        .map((reply) => stringField(extractLooseRecord(reply), "user"))
      const authorIds = uniqueStrings([
        ...messages.map((message) => stringField(extractLooseRecord(message), "user")),
        ...replyAuthors
      ])
      const users: Record<string, unknown> = {}
      for (const userId of authorIds) {
        const user = await callSlack(services, {
          method: "users.info",
          payload: { user: userId },
          token,
          profile,
          all: false,
          allowWrite: false,
          yes: false
        })
        const raw = user.response.user ?? user.response
        users[userId] = full ? raw : slimUser(raw)
      }
      context.users = users
    } else {
      warnings.push(
        "users:read scope is missing, so message authors are returned as IDs only. Reconnect with users:read to hydrate names."
      )
    }
  }

  if (include.has("permalinks")) {
    const permalinks: Record<string, string> = {}
    for (const ts of uniqueStrings(messages.map((message) => stringField(extractLooseRecord(message), "ts")))) {
      const permalink = await callSlack(services, {
        method: "chat.getPermalink",
        payload: { channel, message_ts: ts },
        token,
        profile,
        all: false,
        allowWrite: false,
        yes: false
      })
      const value = stringField(permalink.response, "permalink")
      if (value !== undefined) {
        permalinks[ts] = value
      }
    }
    context.permalinks = permalinks
  }

  return {
    method: "conversation.context",
    profile,
    response: history.response,
    stdoutValue: context,
    items: messages.map(shape),
    enrichmentRecords: [
      ...recordsFromMap(context.users, (_, data) => ({ type: "slack.user", data })),
      ...recordsFromMap(context.threads, (ts, replies) => ({ type: "slack.thread", data: { ts, replies } })),
      ...recordsFromMap(context.permalinks, (ts, permalink) => ({ type: "slack.permalink", data: { ts, permalink } }))
    ],
    ...(warnings.length > 0 ? { warnings } : {})
  }
}

const threadGet = async (parsed: ParsedArgs, services: CliServices): Promise<DispatchResult> => {
  const profileName = flagString(parsed, "profile", "default") ?? "default"
  const tokenType = parseTokenType(flagString(parsed, "token"))
  const profile = await getProfile(services, profileName)
  const token = tokenFor(profile, tokenType)
  const channel = requireFlag(parsed, "channel")
  const ts = requireFlag(parsed, "ts")
  const full = flagBoolean(parsed, "full")
  const include = new Set(splitCsv(flagString(parsed, "include")))
  const result = await callSlack(services, {
    method: "conversations.replies",
    payload: cleanObject({ channel, ts, limit: numberFlag(parsed, "limit") }),
    token,
    profile,
    all: flagBoolean(parsed, "all"),
    allowWrite: false,
    yes: false
  })

  if (flagBoolean(parsed, "raw")) {
    return {
      method: "conversations.replies",
      profile,
      stdoutValue: result.response,
      rawStdout: serializeJson(result.response, flagBoolean(parsed, "pretty")),
      response: result.response,
      items: result.items
    }
  }

  const shape = (message: unknown): unknown => (full ? message : slimMessage(message))
  const rawMessages = extractArray(result.response.messages)
  const warnings: string[] = []
  const data: Record<string, unknown> = { messages: rawMessages.map(shape) }

  if (include.has("users")) {
    if (hasScope(profile, "users:read")) {
      const users: Record<string, unknown> = {}
      for (const userId of uniqueStrings(rawMessages.map((message) => stringField(extractLooseRecord(message), "user")))) {
        const user = await callSlack(services, {
          method: "users.info",
          payload: { user: userId },
          token,
          profile,
          all: false,
          allowWrite: false,
          yes: false
        })
        const raw = user.response.user ?? user.response
        users[userId] = full ? raw : slimUser(raw)
      }
      data.users = users
    } else {
      warnings.push(
        "users:read scope is missing, so message authors are returned as IDs only. Reconnect with users:read to hydrate names."
      )
    }
  }

  if (include.has("permalinks")) {
    const permalinks: Record<string, string> = {}
    for (const messageTs of uniqueStrings(rawMessages.map((message) => stringField(extractLooseRecord(message), "ts")))) {
      const permalink = await callSlack(services, {
        method: "chat.getPermalink",
        payload: { channel, message_ts: messageTs },
        token,
        profile,
        all: false,
        allowWrite: false,
        yes: false
      })
      const value = stringField(permalink.response, "permalink")
      if (value !== undefined) {
        permalinks[messageTs] = value
      }
    }
    data.permalinks = permalinks
  }

  return {
    method: "conversations.replies",
    profile,
    response: result.response,
    stdoutValue: data,
    items: rawMessages.map(shape),
    enrichmentRecords: [
      ...recordsFromMap(data.users, (_, user) => ({ type: "slack.user", data: user })),
      ...recordsFromMap(data.permalinks, (ts, permalink) => ({ type: "slack.permalink", data: { ts, permalink } }))
    ],
    ...(warnings.length > 0 ? { warnings } : {})
  }
}

const searchCommand = async (parsed: ParsedArgs, services: CliServices): Promise<DispatchResult> => {
  const second = parsed.positionals[1]
  const query = requireFlag(parsed, "query")
  if (second === "context") {
    return methodCall(parsed, services, {
      method: "assistant.search.context",
      payload: { query, content_types: splitCsv(flagString(parsed, "content-types")) }
    })
  }
  if (second === "messages") {
    return methodCall(parsed, services, { method: "search.messages", payload: { query } })
  }
  if (second === "files") {
    return methodCall(parsed, services, { method: "search.files", payload: { query } })
  }
  throw new UsageError("Unknown search command", { command: parsed.positionals.join(" ") })
}

const fileCommand = async (parsed: ParsedArgs, services: CliServices): Promise<DispatchResult> => {
  const second = parsed.positionals[1]
  if (second === "list") {
    return methodCall(parsed, services, {
      method: "files.list",
      payload: {
        channel: flagString(parsed, "channel"),
        user: flagString(parsed, "user"),
        count: numberFlag(parsed, "limit")
      }
    })
  }
  if (second === "get") {
    return methodCall(parsed, services, { method: "files.info", payload: { file: requirePositional(parsed.positionals, 2, "FILE_ID") } })
  }
  if (second === "download") {
    return fileDownload(parsed, services)
  }
  throw new UsageError("Unknown file command", { command: parsed.positionals.join(" ") })
}

const fileDownload = async (parsed: ParsedArgs, services: CliServices): Promise<DispatchResult> => {
  const profileName = flagString(parsed, "profile", "default") ?? "default"
  const tokenType = parseTokenType(flagString(parsed, "token"))
  const profile = await getProfile(services, profileName)
  const token = tokenFor(profile, tokenType)
  const fileId = requirePositional(parsed.positionals, 2, "FILE_ID")
  const outPath = requireFlag(parsed, "out")
  const result = await callSlack(services, {
    method: "files.info",
    payload: { file: fileId },
    token,
    profile,
    all: false,
    allowWrite: false,
    yes: false
  })
  const file = extractRecord(result.response.file)
  const url = stringField(file, "url_private_download") ?? stringField(file, "url_private")
  if (url === undefined) {
    throw new ResourceNotFound("Slack file metadata did not include a private download URL", { file: fileId })
  }
  const download = await services.fileDownloader.download({ url, token, outPath })
  return {
    method: "file.download",
    profile,
    response: result.response,
    stdoutValue: { file: flagBoolean(parsed, "full") ? file : slimFile(file), download }
  }
}

const methodCall = async (
  parsed: ParsedArgs,
  services: CliServices,
  input: { readonly method: string; readonly payload: Record<string, unknown> },
  options: { readonly normalize?: boolean } = {}
): Promise<DispatchResult> => {
  const profileName = flagString(parsed, "profile", "default") ?? "default"
  const tokenType = parseTokenType(flagString(parsed, "token"))
  const profile = await getProfile(services, profileName)
  const token = tokenFor(profile, tokenType)
  const cleanPayload = Object.fromEntries(Object.entries(input.payload).filter(([, value]) => value !== undefined && value !== ""))
  const result = await callSlack(services, {
    method: input.method,
    payload: cleanPayload,
    token,
    profile,
    all: flagBoolean(parsed, "all"),
    allowWrite: flagBoolean(parsed, "allow-write"),
    yes: flagBoolean(parsed, "yes")
  })

  if (flagBoolean(parsed, "raw")) {
    return {
      method: input.method,
      profile,
      stdoutValue: result.response,
      rawStdout: serializeJson(result.response, flagBoolean(parsed, "pretty")),
      response: result.response,
      items: result.items
    }
  }

  const normalize = options.normalize !== false && !flagBoolean(parsed, "full")
  return {
    method: input.method,
    profile,
    stdoutValue: normalize ? normalizeResponse(input.method, result.response) : result.response,
    response: result.response,
    items: result.items
  }
}

export const renderDispatchResult = (
  parsed: ParsedArgs,
  result: DispatchResult,
  options: CliExecutionOptions = {}
): string => {
  if (result.rawStdout !== undefined) {
    return result.rawStdout
  }
  if (flagString(parsed, "format") === "ndjson") {
    return toNdjson([...(result.items ?? []), ...(result.enrichmentRecords ?? [])])
  }
  const data = projectFields(result.stdoutValue, flagString(parsed, "fields"))
  const envelope = successEnvelope({
    method: result.method,
    profile: result.profile,
    data,
    ...(result.response === undefined ? {} : { paging: pagingFrom(result.response) }),
    ...(result.warnings === undefined ? {} : { warnings: result.warnings })
  })
  if (shouldRenderJson(parsed, options)) {
    return serializeJson(envelope, flagBoolean(parsed, "pretty"))
  }
  return renderHumanEnvelope(envelope, {
    color: options.stdoutIsTty === true && options.env?.NO_COLOR === undefined && !flagBoolean(parsed, "no-color")
  })
}

const shouldRenderJson = (parsed: ParsedArgs, options: CliExecutionOptions): boolean => {
  const format = flagString(parsed, "format")
  return flagBoolean(parsed, "json") || format === "json" || options.stdoutIsTty !== true
}

const numberFlag = (parsed: ParsedArgs, name: string): number | undefined => {
  const value = flagString(parsed, name)
  if (value === undefined) {
    return undefined
  }
  const parsedNumber = Number(value)
  if (!Number.isInteger(parsedNumber) || parsedNumber < 1) {
    throw new UsageError(`--${name} must be a positive integer`, { flag: name, value })
  }
  return parsedNumber
}

const sinceToOldest = (since: string | undefined): string | undefined => {
  if (since === undefined) {
    return undefined
  }
  const match = since.match(/^(\d+)([hd])$/)
  if (match === null) {
    return undefined
  }
  const amount = Number(match[1])
  const unit = match[2]
  const seconds = unit === "h" ? amount * 60 * 60 : amount * 24 * 60 * 60
  return String(Math.floor(Date.now() / 1000) - seconds)
}

const cleanObject = (input: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined && value !== ""))

const sanitizeProfiles = (profiles: readonly AuthProfile[]) =>
  profiles.map(sanitizeProfile)

const sanitizeProfile = (profile: AuthProfile) => ({
  name: profile.name,
  teamId: profile.teamId ?? null,
  enterpriseId: profile.enterpriseId ?? null,
  userId: profile.userId ?? null,
  botId: profile.botId ?? null,
  tokenType: profile.tokenType,
  scopes: profile.scopes,
  hasBotToken: profile.botToken !== undefined,
  hasUserToken: profile.userToken !== undefined,
  hasAdminToken: profile.adminToken !== undefined,
  hasAppToken: profile.appToken !== undefined
})

const extractRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  throw new ResourceNotFound("Slack response did not include a file object")
}

const stringField = (record: Record<string, unknown>, name: string): string | undefined =>
  typeof record[name] === "string" && record[name].length > 0 ? record[name] : undefined

const extractArray = (value: unknown): readonly unknown[] =>
  Array.isArray(value) ? value : []

const extractLooseRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {}

const uniqueStrings = (values: readonly (string | undefined)[]): readonly string[] =>
  [...new Set(values.filter((value): value is string => value !== undefined))]

// Turn an include-hydration map (keyed by user/thread/message id) into the
// typed records streamed after item lines in ndjson mode. See ADR-004.
const recordsFromMap = (
  value: unknown,
  toRecord: (key: string, entry: unknown) => unknown
): readonly unknown[] =>
  Object.entries(extractLooseRecord(value)).map(([key, entry]) => toRecord(key, entry))
