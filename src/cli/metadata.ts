import { createRequire } from "node:module"
import type { CommandMetadata } from "./types.js"

const require = createRequire(import.meta.url)
const packageJson = require("../../package.json") as { readonly version?: string }

export const PRIMARY_COMMAND_NAME = "agent-slack"
export const SHORT_COMMAND_NAME = "aslk"
export const COMMAND_NAMES = [PRIMARY_COMMAND_NAME, SHORT_COMMAND_NAME] as const
export const CLI_VERSION = packageJson.version ?? "0.0.0"

export const commandMetadata: readonly CommandMetadata[] = [
  {
    path: ["describe"],
    summary: "Describe the full CLI command tree as JSON.",
    flags: ["--json"],
    safety: "read",
    output: "command metadata",
    examples: ["agent-slack describe --json"]
  },
  {
    path: ["completion"],
    summary: "Generate shell completion words.",
    args: ["bash|zsh"],
    safety: "read",
    output: "shell completion script",
    examples: ["agent-slack completion zsh > ~/.zfunc/_agent-slack"]
  },
  {
    path: ["auth", "status"],
    summary: "Show the active Slack auth profile.",
    flags: ["--profile", "--json"],
    safety: "read",
    output: "profile status",
    examples: ["agent-slack auth status --json"]
  },
  {
    path: ["auth", "login"],
    summary: "Create a Slack auth profile with OAuth or a seeded token.",
    flags: ["--profile", "--oauth", "--client-id", "--client-secret", "--scopes", "--user-scopes", "--redirect-uri", "--auth-url-out", "--timeout-ms", "--no-open", "--token", "--json"],
    safety: "read",
    output: "profile status",
    examples: [
      "agent-slack auth login --oauth --client-id 123.456 --client-secret secret --scopes channels:read,channels:history --json",
      "AGENT_SLACK_TOKEN=xoxb-... agent-slack auth login --profile work --scopes channels:read --json"
    ]
  },
  {
    path: ["auth", "scopes"],
    summary: "Show granted scopes for the active profile.",
    flags: ["--profile", "--json"],
    safety: "read",
    output: "scope list",
    examples: ["agent-slack auth scopes --json"]
  },
  {
    path: ["auth", "profiles", "list"],
    summary: "List local auth profiles.",
    flags: ["--json"],
    safety: "read",
    output: "profile list",
    examples: ["agent-slack auth profiles list --json"]
  },
  {
    path: ["auth", "logout"],
    summary: "Delete a local auth profile.",
    flags: ["--profile", "--json"],
    safety: "destructive",
    output: "deleted profile status",
    examples: ["agent-slack auth logout --profile work --yes --json"]
  },
  {
    path: ["auth", "test"],
    summary: "Call Slack auth.test for the active profile.",
    methods: ["auth.test"],
    scopes: [],
    safety: "read",
    output: "Slack auth.test response",
    examples: ["agent-slack auth test --json"]
  },
  {
    path: ["team", "get"],
    summary: "Show workspace info.",
    methods: ["team.info"],
    scopes: ["team:read"],
    safety: "read",
    output: "team info",
    examples: ["agent-slack team get --json"]
  },
  {
    path: ["team", "profile", "get"],
    summary: "Show workspace profile fields.",
    methods: ["team.profile.get"],
    scopes: ["users.profile:read"],
    safety: "read",
    output: "team profile fields",
    examples: ["agent-slack team profile get --json"]
  },
  {
    path: ["enterprise", "get"],
    summary: "Show enterprise/workspace identity from team info.",
    methods: ["team.info"],
    scopes: ["team:read"],
    safety: "read",
    output: "team or enterprise info",
    examples: ["agent-slack enterprise get --json"]
  },
  {
    path: ["user", "list"],
    summary: "List users visible to the active profile.",
    flags: ["--limit", "--all", "--json"],
    methods: ["users.list"],
    scopes: ["users:read"],
    safety: "read",
    output: "user list",
    examples: ["agent-slack user list --limit 50 --json"]
  },
  {
    path: ["user", "get"],
    summary: "Show one user.",
    args: ["USER_ID"],
    methods: ["users.info"],
    scopes: ["users:read"],
    safety: "read",
    output: "user info",
    examples: ["agent-slack user get U123 --json"]
  },
  {
    path: ["user", "lookup"],
    summary: "Find a user by email.",
    flags: ["--email", "--json"],
    methods: ["users.lookupByEmail"],
    scopes: ["users:read.email"],
    safety: "read",
    output: "user info",
    examples: ["agent-slack user lookup --email dev@example.com --json"]
  },
  {
    path: ["user", "presence", "get"],
    summary: "Show user presence.",
    args: ["USER_ID"],
    methods: ["users.getPresence"],
    scopes: ["users:read"],
    safety: "read",
    output: "presence",
    examples: ["agent-slack user presence get U123 --json"]
  },
  {
    path: ["usergroups", "list"],
    summary: "List Slack user groups.",
    methods: ["usergroups.list"],
    scopes: ["usergroups:read"],
    safety: "read",
    output: "user group list",
    examples: ["agent-slack usergroups list --json"]
  },
  {
    path: ["usergroups", "users", "list"],
    summary: "List users in a Slack user group.",
    args: ["USERGROUP_ID"],
    methods: ["usergroups.users.list"],
    scopes: ["usergroups:read"],
    safety: "read",
    output: "user IDs",
    examples: ["agent-slack usergroups users list S123 --json"]
  },
  {
    path: ["api", "call"],
    summary: "Call any Slack Web API method using a raw JSON payload.",
    args: ["METHOD", "PAYLOAD_STDIN_MARKER"],
    flags: ["--payload", "--profile", "--token", "--all", "--raw", "--format", "--allow-write", "--yes", "--json"],
    safety: "unknown",
    output: "Slack Web API response",
    examples: [
      "agent-slack api call conversations.history --payload '{\"channel\":\"C123\"}' --json",
      "cat payload.json | agent-slack api call conversations.history -"
    ]
  },
  {
    path: ["api", "methods", "list"],
    summary: "List bundled Slack method metadata.",
    flags: ["--family", "--json"],
    safety: "read",
    output: "method metadata list",
    examples: ["agent-slack api methods list --family conversations --json"]
  },
  {
    path: ["api", "method", "describe"],
    summary: "Describe one Slack method.",
    args: ["METHOD"],
    flags: ["--json"],
    safety: "read",
    output: "method metadata",
    examples: ["agent-slack api method describe conversations.replies --json"]
  },
  {
    path: ["conversation", "list"],
    summary: "List conversations visible to the active profile.",
    methods: ["conversations.list"],
    scopes: ["channels:read", "groups:read", "im:read", "mpim:read"],
    safety: "read",
    output: "conversation list",
    examples: ["agent-slack conversation list --types public_channel,private_channel --json"]
  },
  {
    path: ["conversation", "history"],
    summary: "Read conversation history.",
    args: ["CHANNEL_ID"],
    methods: ["conversations.history"],
    scopes: ["channels:history", "groups:history", "im:history", "mpim:history"],
    safety: "read",
    output: "message list",
    examples: ["agent-slack conversation history C123 --limit 20 --json"]
  },
  {
    path: ["conversation", "context"],
    summary: "Return agent-friendly channel context.",
    args: ["CHANNEL_ID"],
    methods: ["conversations.history", "conversations.replies", "users.info"],
    scopes: ["channels:history", "users:read"],
    safety: "read",
    output: "hydrated conversation context",
    examples: ["agent-slack conversation context C123 --since 24h --include users,threads --format ndjson"]
  },
  {
    path: ["thread", "get"],
    summary: "Read a complete Slack thread.",
    flags: ["--channel", "--ts", "--include", "--json"],
    methods: ["conversations.replies"],
    scopes: ["channels:history", "groups:history", "im:history", "mpim:history"],
    safety: "read",
    output: "thread messages",
    examples: ["agent-slack thread get --channel C123 --ts 1710000000.000100 --include users --json"]
  },
  {
    path: ["message", "get"],
    summary: "Read one Slack message by channel and timestamp.",
    flags: ["--channel", "--ts", "--json"],
    methods: ["conversations.history"],
    scopes: ["channels:history"],
    safety: "read",
    output: "message",
    examples: ["agent-slack message get --channel C123 --ts 1710000000.000100 --json"]
  },
  {
    path: ["message", "permalink"],
    summary: "Return a Slack permalink for a message.",
    flags: ["--channel", "--ts", "--json"],
    methods: ["chat.getPermalink"],
    safety: "read",
    output: "permalink",
    examples: ["agent-slack message permalink --channel C123 --ts 1710000000.000100 --json"]
  },
  {
    path: ["search", "context"],
    summary: "Search Slack for agent context.",
    flags: ["--query", "--content-types", "--json"],
    methods: ["assistant.search.context"],
    scopes: ["search:read.public", "search:read.private"],
    safety: "read",
    output: "search context",
    examples: ["agent-slack search context --query 'project atlas' --json"]
  },
  {
    path: ["file", "list"],
    summary: "List files visible to the active profile.",
    methods: ["files.list"],
    scopes: ["files:read"],
    safety: "read",
    output: "file list",
    examples: ["agent-slack file list --channel C123 --json"]
  },
  {
    path: ["file", "download"],
    summary: "Download a Slack file to disk.",
    args: ["FILE_ID"],
    flags: ["--out", "--profile", "--token", "--json"],
    methods: ["files.info"],
    scopes: ["files:read"],
    safety: "read",
    output: "download status",
    examples: ["agent-slack file download F123 --out ./artifact.pdf --json"]
  }
]

export const describeAllCommands = () => ({
  name: PRIMARY_COMMAND_NAME,
  aliases: [SHORT_COMMAND_NAME],
  version: CLI_VERSION,
  commands: commandMetadata
})

export const findCommandMetadata = (path: readonly string[]) =>
  commandMetadata.find((command) => command.path.join(" ") === path.join(" ")) ?? null

export const describeCommandGroup = (group: string) => ({
  name: group,
  commands: commandMetadata.filter((command) => command.path[0] === group)
})

export const renderHumanHelp = (path: readonly string[]): string => {
  const command = findCommandMetadata(path)
  if (command !== null) {
    return [
      `${PRIMARY_COMMAND_NAME} ${command.path.join(" ")}`,
      "",
      command.summary,
      "",
      command.args === undefined ? "" : `Arguments: ${command.args.join(" ")}`,
      command.flags === undefined ? "" : `Flags: ${command.flags.join(", ")}`,
      command.scopes === undefined ? "" : `Scopes: ${command.scopes.join(", ")}`,
      `Safety: ${command.safety}`,
      `Output: ${command.output}`,
      "",
      "Examples:",
      ...command.examples.map((example) => `  ${example}`)
    ].filter((line) => line !== "").join("\n") + "\n"
  }

  const commands = path.length === 0 ? commandMetadata : commandMetadata.filter((item) => item.path[0] === path[0])
  return [
    PRIMARY_COMMAND_NAME,
    "",
    "Agent-readable Slack CLI.",
    "",
    "Commands:",
    ...commands.map((item) => `  ${item.path.join(" ").padEnd(28)} ${item.summary}`)
  ].join("\n") + "\n"
}

export const renderCompletion = (shell: string): string => {
  const words = [...new Set(commandMetadata.flatMap((command) => command.path))]
  const commandWords = commandMetadata.map((command) => command.path.join(" "))
  if (shell === "bash") {
    return `complete -W '${words.join(" ")}' ${COMMAND_NAMES.join(" ")}\n`
  }
  if (shell === "zsh") {
    return [
      `#compdef ${COMMAND_NAMES.join(" ")}`,
      "_agent_slack_commands=(",
      ...commandWords.map((command) => `  '${command}:${summaryFor(command)}'`),
      ")",
      `_describe '${PRIMARY_COMMAND_NAME} command' _agent_slack_commands`,
      ""
    ].join("\n")
  }
  return ""
}

const summaryFor = (path: string): string =>
  commandMetadata.find((command) => command.path.join(" ") === path)?.summary.replace(/'/g, "") ?? ""
