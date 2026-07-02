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
    summary: "Print the full command catalog as JSON.",
    flags: ["--json"],
    safety: "read",
    output: "command metadata",
    examples: ["agent-slack describe --json"]
  },
  {
    path: ["completion"],
    summary: "Generate a shell completion script.",
    args: ["bash|zsh"],
    safety: "read",
    output: "shell completion script",
    examples: ["agent-slack completion zsh > ~/.zfunc/_agent-slack"]
  },
  {
    path: ["auth", "status"],
    summary: "Show the active Slack profile.",
    flags: ["--profile", "--json"],
    safety: "read",
    output: "profile status",
    examples: ["agent-slack auth status --json"]
  },
  {
    path: ["auth", "login"],
    summary: "Connect a Slack workspace profile.",
    flags: ["--profile", "--oauth", "--client-id", "--client-secret", "--scopes", "--user-scopes", "--redirect-uri", "--auth-url-out", "--timeout-ms", "--no-open", "--token", "--json"],
    safety: "read",
    output: "profile status",
    examples: [
      "agent-slack auth login --json",
      "AGENT_SLACK_TOKEN=xoxb-... agent-slack auth login --profile work --scopes channels:read --json",
      "agent-slack auth login --oauth --client-id 123.456 --client-secret secret --scopes channels:read,channels:history --json",
    ]
  },
  {
    path: ["auth", "scopes"],
    summary: "Show scopes granted to the active profile.",
    flags: ["--profile", "--json"],
    safety: "read",
    output: "scope list",
    examples: ["agent-slack auth scopes --json"]
  },
  {
    path: ["auth", "profiles", "list"],
    summary: "List local Slack profiles.",
    flags: ["--json"],
    safety: "read",
    output: "profile list",
    examples: ["agent-slack auth profiles list --json"]
  },
  {
    path: ["auth", "logout"],
    summary: "Delete a local Slack profile.",
    flags: ["--profile", "--json"],
    safety: "destructive",
    output: "deleted profile status",
    examples: ["agent-slack auth logout --profile work --yes --json"]
  },
  {
    path: ["auth", "test"],
    summary: "Test the active Slack profile.",
    methods: ["auth.test"],
    scopes: [],
    safety: "read",
    output: "Slack auth.test response",
    examples: ["agent-slack auth test --json"]
  },
  {
    path: ["team", "get"],
    summary: "Show Slack workspace details.",
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
    summary: "Show enterprise and workspace identity.",
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
    summary: "Call a Slack Web API method with a JSON payload.",
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
    summary: "List bundled Slack Web API metadata.",
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
    summary: "Build channel context for agents.",
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
    summary: "Get a Slack permalink for a message.",
    flags: ["--channel", "--ts", "--json"],
    methods: ["chat.getPermalink"],
    safety: "read",
    output: "permalink",
    examples: ["agent-slack message permalink --channel C123 --ts 1710000000.000100 --json"]
  },
  {
    path: ["search", "context"],
    summary: "Search Slack for relevant context.",
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
  if (path.join(" ") === "auth login") {
    return renderAuthLoginHelp()
  }
  const command = findCommandMetadata(path)
  if (command !== null) {
    return [
      `${PRIMARY_COMMAND_NAME} ${command.path.join(" ")}`,
      "",
      command.summary,
      "",
      command.args === undefined ? "" : `Usage: ${PRIMARY_COMMAND_NAME} ${command.path.join(" ")} ${command.args.join(" ")}`,
      command.scopes === undefined ? "" : `Scopes: ${command.scopes.join(", ")}`,
      "",
      "Examples:",
      ...command.examples.map((example) => `  ${example}`)
    ].filter((line) => line !== "").join("\n") + "\n"
  }

  const commands = path.length === 0 ? commandMetadata : commandMetadata.filter((item) => item.path[0] === path[0])
  return [
    PRIMARY_COMMAND_NAME,
    "",
    "Slack context CLI for agents.",
    "",
    "Commands:",
    ...commands.map((item) => `  ${item.path.join(" ").padEnd(28)} ${item.summary}`)
  ].join("\n") + "\n"
}

const renderAuthLoginHelp = (): string => [
  "agent-slack auth login",
  "",
  "Connect a Slack workspace profile.",
  "",
  "Browser login",
  "  agent-slack auth login",
  "",
  "  Opens Slack in the browser with PKCE and stores a local Slack profile.",
  "  The CLI never stores a Slack app secret.",
  "",
  "Token setup",
  "  agent-slack auth login --token \"$SLACK_BOT_TOKEN\" --scopes channels:read,channels:history,users:read",
  "",
  "  Stores an existing bot token as a local Slack profile.",
  "",
  "Developer fallback: Slack app credentials",
  "  agent-slack auth login --oauth --client-id \"$SLACK_CLIENT_ID\" --client-secret \"$SLACK_CLIENT_SECRET\"",
  "",
  "Options",
  "  --profile NAME          Save as a named profile.",
  "  --token TOKEN           Store an existing Slack bot token.",
  "  --scopes LIST           Scopes to request (PKCE) or record (token setup).",
  "  --user-scopes LIST      User scopes to request during OAuth.",
  "  --oauth                 Use Slack OAuth with app credentials.",
  "  --client-id VALUE       Override the Slack app Client ID.",
  "  --client-secret VALUE   Slack app Client Secret.",
  "  --no-open               Print OAuth URL instead of opening the browser.",
  "  --auth-url-out PATH     Write OAuth URL for headless flows.",
  "  --json                  Emit machine-readable JSON.",
  "",
  "Notes",
  "  Normal users should not create a Slack app or handle client credentials.",
  "  App credentials are only for development and self-hosted setups.",
  ""
].join("\n")

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
