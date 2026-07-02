import type { CommandEnvelope, ErrorEnvelope } from "../domain/slack.js"

export interface HumanRenderOptions {
  readonly color: boolean
}

type PaintName = "bold" | "cyan" | "dim" | "green" | "red" | "yellow"

const codes: Record<PaintName, readonly [number, number]> = {
  bold: [1, 22],
  cyan: [36, 39],
  dim: [2, 22],
  green: [32, 39],
  red: [31, 39],
  yellow: [33, 39]
}

export const renderHumanEnvelope = (
  envelope: CommandEnvelope,
  options: HumanRenderOptions
): string => {
  const paint = (name: PaintName, value: string) =>
    options.color ? `\u001b[${codes[name][0]}m${value}\u001b[${codes[name][1]}m` : value

  if (isCommandCatalog(envelope.data)) {
    return `${renderCommandCatalog(envelope.data, paint).join("\n")}\n`
  }

  const metadata = renderMetadata(envelope, paint)
  const warnings = envelope.warnings.map((warning) => `${paint("yellow", "Warning")}: ${warning}`)
  const data = renderHumanData(envelope.data, paint)
  const lines = [
    `${paint("green", "OK")} ${paint("bold", envelope.method)}`,
    ...(metadata === "" ? [] : [metadata]),
    ...(warnings.length === 0 ? [] : warnings),
    ...(data.length === 0 ? [] : ["", ...data])
  ]

  return `${lines.join("\n")}\n`
}

export const renderHumanErrorEnvelope = (
  envelope: ErrorEnvelope,
  options: HumanRenderOptions
): string => {
  const paint = (name: PaintName, value: string) =>
    options.color ? `\u001b[${codes[name][0]}m${value}\u001b[${codes[name][1]}m` : value
  const error = envelope.error
  const lines = [
    `${paint("red", "Error")} ${paint("bold", error.type)}`,
    error.title,
    ...(error.slack_error === undefined ? [] : ["", `${paint("dim", "Slack")} ${error.slack_error}`]),
    ...(error.retry_after_seconds === undefined ? [] : [`${paint("dim", "Retry after")} ${error.retry_after_seconds}s`]),
    ...(error.suggestion === undefined ? [] : ["", paint("yellow", "Next"), `  ${error.suggestion}`]),
    "",
    `${paint("dim", "Trace")} ${error.trace_id}`
  ]
  return `${lines.join("\n")}\n`
}

interface HumanCommandMetadata {
  readonly path: readonly string[]
  readonly summary: string
  readonly args?: readonly string[]
  readonly safety?: string
}

interface HumanCommandCatalog {
  readonly name: string
  readonly aliases?: readonly string[]
  readonly version?: string
  readonly commands: readonly HumanCommandMetadata[]
}

const isCommandCatalog = (value: unknown): value is HumanCommandCatalog => {
  if (!isRecord(value) || typeof value.name !== "string" || !Array.isArray(value.commands)) {
    return false
  }
  return value.commands.every((command) =>
    isRecord(command) &&
    Array.isArray(command.path) &&
    command.path.every((part) => typeof part === "string") &&
    typeof command.summary === "string"
  )
}

const renderCommandCatalog = (
  catalog: HumanCommandCatalog,
  paint: (name: PaintName, value: string) => string
): readonly string[] => {
  const title = catalog.version === undefined ? `${titleCase(catalog.name)} Commands` : "Agent Slack"
  const aliases = catalog.aliases?.join(", ")
  const groups = groupCommands(catalog.commands)
  return [
    `${paint("bold", title)}${catalog.version === undefined ? "" : ` ${paint("dim", catalog.version)}`}`,
    paint("dim", "Slack context CLI for agents"),
    "",
    `${paint("dim", "Use")}     ${paint("cyan", `${catalog.name} <command> [--json]`)}`,
    ...(aliases === undefined ? [] : [`${paint("dim", "Alias")}   ${aliases}`]),
    `${paint("dim", "Output")}  readable in terminals; JSON for pipes and --json`,
    "",
    ...groups.flatMap((group) => renderCommandGroup(group, paint)),
    "",
    paint("dim", `Run ${catalog.name} <command> --help for details.`)
  ]
}

const renderCommandGroup = (
  group: CommandGroup,
  paint: (name: PaintName, value: string) => string
): readonly string[] => {
  return [
    paint("yellow", group.title),
    ...group.commands.map((command) => {
      const safety = command.safety === "destructive"
        ? ` ${paint("yellow", "[destructive]")}`
        : command.safety === "unknown"
          ? ` ${paint("yellow", "[review]")}`
          : ""
      return `  ${paint("cyan", commandSignature(command))} - ${command.summary}${safety}`
    }),
    ""
  ]
}

interface CommandGroup {
  readonly key: string
  readonly title: string
  readonly commands: readonly HumanCommandMetadata[]
}

const groupCommands = (commands: readonly HumanCommandMetadata[]): readonly CommandGroup[] => {
  const groups = new Map<string, HumanCommandMetadata[]>()
  for (const command of commands) {
    const key = groupKey(command)
    groups.set(key, [...(groups.get(key) ?? []), command])
  }
  return commandGroupOrder
    .map((group) => ({
      ...group,
      commands: groups.get(group.key) ?? []
    }))
    .filter((group) => group.commands.length > 0)
}

const commandGroupOrder = [
  { key: "system", title: "System" },
  { key: "auth", title: "Auth" },
  { key: "workspace", title: "Workspace" },
  { key: "people", title: "People" },
  { key: "conversations", title: "Conversations" },
  { key: "search", title: "Search" },
  { key: "files", title: "Files" },
  { key: "surfaces", title: "Slack Objects" },
  { key: "api", title: "Web API" }
] as const

const groupKey = (command: HumanCommandMetadata): string => {
  const root = command.path[0]
  if (root === "describe" || root === "completion") {
    return "system"
  }
  if (root === "team" || root === "enterprise") {
    return "workspace"
  }
  if (root === "user" || root === "usergroups") {
    return "people"
  }
  if (root === "conversation" || root === "thread" || root === "message") {
    return "conversations"
  }
  if (root === "file") {
    return "files"
  }
  if (root === "reaction" || root === "pin" || root === "bookmark" || root === "emoji" || root === "dnd") {
    return "surfaces"
  }
  return root ?? "system"
}

const commandSignature = (command: HumanCommandMetadata): string => {
  const args = command.args?.filter((arg) => arg !== "PAYLOAD_STDIN_MARKER").join(" ")
  return [command.path.join(" "), args].filter((part): part is string => part !== undefined && part !== "").join(" ")
}

const renderMetadata = (
  envelope: CommandEnvelope,
  paint: (name: PaintName, value: string) => string
): string => {
  const parts = [
    envelope.profile === null ? undefined : `profile ${envelope.profile}`,
    envelope.team_id === null ? undefined : `team ${envelope.team_id}`,
    envelope.enterprise_id === null ? undefined : `enterprise ${envelope.enterprise_id}`,
    envelope.paging.has_more ? `next ${envelope.paging.next_cursor ?? "cursor"}` : undefined
  ].filter((part): part is string => part !== undefined)

  return parts.length === 0 ? "" : paint("dim", parts.join(" | "))
}

const renderHumanData = (
  value: unknown,
  paint: (name: PaintName, value: string) => string
): readonly string[] => {
  if (Array.isArray(value)) {
    return renderArray(value, paint)
  }
  if (isRecord(value)) {
    const primaryArray = findPrimaryArray(value)
    const excludedKeys = new Set(primaryArray === null ? [] : [primaryArray.key])
    const fieldLines = renderFields(value, excludedKeys, paint)
    const hasComplexValues = hasVisibleComplexValues(value, excludedKeys)
    if (primaryArray !== null) {
      return [
        ...fieldLines,
        fieldLines.length === 0 ? "" : "",
        `${paint("cyan", labelFor(primaryArray.key))} (${primaryArray.items.length})`,
        ...renderArray(primaryArray.items, paint)
      ].filter((line) => line !== "")
    }
    if (fieldLines.length > 0 && !hasComplexValues) {
      return fieldLines
    }
  }
  return ["data:", indent(JSON.stringify(value, null, 2))]
}

const findPrimaryArray = (record: Record<string, unknown>): { readonly key: string; readonly items: readonly unknown[] } | null => {
  const preferred = ["messages", "members", "channels", "files", "users", "results", "items"]
  for (const key of preferred) {
    const value = record[key]
    if (Array.isArray(value) && !value.every(isScalar)) {
      return { key, items: value }
    }
  }
  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value) && !value.every(isScalar)) {
      return { key, items: value }
    }
  }
  return null
}

const renderFields = (
  record: Record<string, unknown>,
  excludedKeys: ReadonlySet<string>,
  paint: (name: PaintName, value: string) => string
): readonly string[] => {
  const entries = Object.entries(record)
    .filter(([key, value]) => !excludedKeys.has(key) && shouldDisplayField(key, value) && isHumanFieldValue(value))
    .map(([key, value]) => ({ key, label: labelFor(key), value }))
    .sort((left, right) => fieldOrder(left.key) - fieldOrder(right.key))

  if (entries.length === 0) {
    return []
  }

  const labelWidth = Math.max(...entries.map((entry) => entry.label.length))
  return entries.map((entry) =>
    `${paint("dim", pad(entry.label, labelWidth))}  ${formatHumanValue(entry.value)}`
  )
}

const hasVisibleComplexValues = (
  record: Record<string, unknown>,
  excludedKeys: ReadonlySet<string>
): boolean =>
  Object.entries(record).some(([key, value]) =>
    !excludedKeys.has(key) && shouldDisplayField(key, value) && !isHumanFieldValue(value)
  )

const renderArray = (
  values: readonly unknown[],
  paint: (name: PaintName, value: string) => string
): readonly string[] => {
  if (values.length === 0) {
    return ["(empty)"]
  }
  if (!values.every(isRecord)) {
    return [indent(JSON.stringify(values, null, 2))]
  }

  const rows = values.map((value) => value as Record<string, unknown>)
  const columns = columnsFor(rows)
  if (columns.length === 0) {
    return [indent(JSON.stringify(values, null, 2))]
  }

  const renderedRows = rows.slice(0, 20).map((row) => columns.map((column) => truncate(formatScalar(row[column]), widthFor(column))))
  const widths = columns.map((column, index) =>
    Math.max(column.length, ...renderedRows.map((row) => row[index]?.length ?? 0))
  )
  const header = columns.map((column, index) => pad(truncate(column, widthFor(column)), widths[index] ?? column.length)).join("  ")
  const divider = widths.map((width) => "-".repeat(width)).join("  ")
  const body = renderedRows.map((row) => row.map((cell, index) => pad(cell, widths[index] ?? cell.length)).join("  "))
  const hiddenCount = values.length - renderedRows.length

  return [
    paint("dim", header),
    paint("dim", divider),
    ...body,
    hiddenCount > 0 ? paint("dim", `... ${hiddenCount} more`) : ""
  ].filter((line) => line !== "")
}

const columnsFor = (rows: readonly Record<string, unknown>[]): readonly string[] => {
  const preferred = ["id", "channel", "ts", "user", "name", "real_name", "type", "subtype", "text"]
  const discovered = new Set(rows.flatMap((row) => Object.keys(row).filter((key) => isScalar(row[key]))))
  const ordered = preferred.filter((key) => discovered.has(key))
  for (const key of discovered) {
    if (!ordered.includes(key)) {
      ordered.push(key)
    }
    if (ordered.length >= 5) {
      break
    }
  }
  return ordered.slice(0, 5)
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isScalar = (value: unknown): value is boolean | number | string | null =>
  value === null || ["boolean", "number", "string"].includes(typeof value)

const isHumanFieldValue = (value: unknown): boolean =>
  isScalar(value) || (Array.isArray(value) && value.every(isScalar))

const shouldDisplayField = (key: string, value: unknown): boolean => {
  if (key === "ok" && value === true) {
    return false
  }
  if (value === null || value === undefined) {
    return false
  }
  if (/^has[A-Z].*Token$/.test(key) && value === false) {
    return false
  }
  return true
}

const labelOverrides: Record<string, string> = {
  botId: "Bot",
  botToken: "Bot token",
  channelId: "Channel",
  enterpriseId: "Enterprise",
  hasAdminToken: "Admin token",
  hasAppToken: "App token",
  hasBotToken: "Bot token",
  hasUserToken: "User token",
  messageTs: "Message TS",
  name: "Name",
  profile: "Profile",
  scopes: "Scopes",
  teamId: "Team",
  tokenType: "Token",
  userId: "User"
}

const orderedFields = [
  "name",
  "teamId",
  "enterpriseId",
  "userId",
  "botId",
  "tokenType",
  "hasBotToken",
  "hasUserToken",
  "hasAdminToken",
  "hasAppToken",
  "scopes"
] as const

const fieldOrder = (key: string): number => {
  const index = orderedFields.indexOf(key as typeof orderedFields[number])
  return index === -1 ? orderedFields.length : index
}

const labelFor = (key: string): string =>
  labelOverrides[key] ?? titleCase(key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " "))

const titleCase = (value: string): string =>
  value.split(" ").map((word) => word.toLowerCase() === "id" ? "ID" : word.charAt(0).toUpperCase() + word.slice(1)).join(" ")

const formatHumanValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.length === 0 ? "(none)" : value.map(formatScalar).join(", ")
  }
  if (typeof value === "boolean") {
    return value ? "yes" : "no"
  }
  return formatScalar(value)
}

const formatScalar = (value: unknown): string => {
  if (value === undefined) {
    return ""
  }
  if (value === null) {
    return "-"
  }
  if (typeof value === "string") {
    return value
  }
  return String(value)
}

const indent = (value: string): string =>
  value.split("\n").map((line) => `  ${line}`).join("\n")

const pad = (value: string, width: number): string =>
  value + " ".repeat(Math.max(0, width - value.length))

const widthFor = (column: string): number =>
  column === "text" ? 72 : 24

const truncate = (value: string, width: number): string =>
  value.length > width ? `${value.slice(0, Math.max(0, width - 3))}...` : value
