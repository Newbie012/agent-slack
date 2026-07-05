// Slim, token-efficient shapes for Slack read output.
//
// Raw Slack objects carry far more than an agent needs to reason: users.info
// returns ~7 avatar URLs plus color/status/tz/team; messages carry `blocks`
// (a structured duplicate of `text`), `client_msg_id`, `team`, and verbose
// reactions. These transforms keep the reasoning-relevant fields and drop the
// rest. `--full` bypasses them and returns the raw objects. See ADR-002.

type Rec = Record<string, unknown>

const isRec = (value: unknown): value is Rec =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const asArray = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : [])

const str = (record: Rec, key: string): string | undefined =>
  typeof record[key] === "string" && (record[key] as string).length > 0 ? (record[key] as string) : undefined

export const slimFile = (input: unknown): unknown => {
  if (!isRec(input)) return input
  const out: Rec = { id: input.id, name: input.name }
  if (typeof input.mimetype === "string") out.mimetype = input.mimetype
  if (typeof input.size === "number") out.size = input.size
  const permalink = str(input, "permalink")
  if (permalink) out.permalink = permalink
  return out
}

export const slimMessage = (input: unknown): unknown => {
  if (!isRec(input)) return input
  const m = input
  const out: Rec = {}
  if (typeof m.user === "string") out.user = m.user
  else if (typeof m.bot_id === "string") out.bot_id = m.bot_id
  const username = str(m, "username")
  if (username) out.username = username
  const subtype = str(m, "subtype")
  if (subtype) out.subtype = subtype
  if (typeof m.ts === "string") out.ts = m.ts
  out.text = typeof m.text === "string" ? m.text : ""
  if (typeof m.thread_ts === "string" && m.thread_ts !== m.ts) out.thread_ts = m.thread_ts
  if (typeof m.reply_count === "number") out.reply_count = m.reply_count
  const reactions = asArray(m.reactions)
    .filter(isRec)
    .map((r) => ({ name: r.name, count: r.count }))
  if (reactions.length > 0) out.reactions = reactions
  const files = asArray(m.files).map(slimFile)
  if (files.length > 0) out.files = files
  if (m.edited !== undefined && m.edited !== null) out.edited = true
  return out
}

export const slimUser = (input: unknown): unknown => {
  if (!isRec(input)) return input
  const u = input
  const profile = isRec(u.profile) ? u.profile : {}
  const out: Rec = { id: u.id, name: u.name }
  const real = str(profile, "display_name") ?? str(u, "real_name") ?? str(profile, "real_name")
  if (real) out.real_name = real
  if (u.is_bot === true) out.is_bot = true
  if (u.deleted === true) out.deleted = true
  const title = str(profile, "title")
  if (title) out.title = title
  return out
}

export const slimConversation = (input: unknown): unknown => {
  if (!isRec(input)) return input
  const c = input
  const out: Rec = { id: c.id, name: c.name }
  if (c.is_private === true) out.is_private = true
  if (c.is_archived === true) out.is_archived = true
  if (c.is_im === true) out.is_im = true
  if (c.is_mpim === true) out.is_mpim = true
  // Membership is reasoning-relevant in both states, so keep the explicit
  // boolean rather than only-when-true: absence would otherwise be ambiguous.
  if (typeof c.is_member === "boolean") out.is_member = c.is_member
  const topic = isRec(c.topic) ? str(c.topic, "value") : undefined
  if (topic) out.topic = topic
  const purpose = isRec(c.purpose) ? str(c.purpose, "value") : undefined
  if (purpose) out.purpose = purpose
  if (typeof c.num_members === "number") out.num_members = c.num_members
  return out
}

export const slimTeam = (input: unknown): unknown => {
  if (!isRec(input)) return input
  const t = input
  const out: Rec = { id: t.id, name: t.name }
  const domain = str(t, "domain")
  if (domain) out.domain = domain
  const emailDomain = str(t, "email_domain")
  if (emailDomain) out.email_domain = emailDomain
  const enterpriseId = str(t, "enterprise_id")
  if (enterpriseId) out.enterprise_id = enterpriseId
  const enterpriseName = str(t, "enterprise_name")
  if (enterpriseName) out.enterprise_name = enterpriseName
  return out
}

// Drop the always-present envelope noise from an unmapped response.
const stripResponseEnvelope = (response: Rec): Rec => {
  const { ok, response_metadata, ...rest } = response
  void ok
  void response_metadata
  return rest
}

// The key under `data` that holds a command's primary payload, mirroring
// normalizeResponse. `describe` surfaces this so agents know where the result
// lives (e.g. conversation list returns its array at `data.channels`).
export const dataKeyFor = (method: string): string | undefined => {
  switch (method) {
    case "conversations.history":
    case "conversations.replies":
      return "messages"
    case "conversations.info":
      return "channel"
    case "conversations.list":
      return "channels"
    case "conversations.members":
      return "members"
    case "users.info":
    case "users.lookupByEmail":
      return "user"
    case "users.list":
      return "users"
    case "files.info":
      return "file"
    case "files.list":
      return "files"
    case "team.info":
      return "team"
    default:
      return undefined
  }
}

// Normalize a raw Slack Web API response for a given method into slim `data`.
export const normalizeResponse = (method: string, response: unknown): unknown => {
  if (!isRec(response)) return response
  const r = response
  switch (method) {
    case "conversations.history":
    case "conversations.replies":
      return { messages: asArray(r.messages).map(slimMessage) }
    case "conversations.info":
      return { channel: slimConversation(r.channel) }
    case "conversations.list":
      return { channels: asArray(r.channels).map(slimConversation) }
    case "users.info":
    case "users.lookupByEmail":
      return { user: slimUser(r.user) }
    case "users.list":
      return { users: asArray(r.members).map(slimUser) }
    case "files.info":
      return { file: slimFile(r.file) }
    case "files.list":
      return { files: asArray(r.files).map(slimFile) }
    case "team.info":
      return { team: slimTeam(r.team) }
    case "reactions.get":
      return isRec(r.message) ? { ...stripResponseEnvelope(r), message: slimMessage(r.message) } : stripResponseEnvelope(r)
    default:
      return stripResponseEnvelope(r)
  }
}
