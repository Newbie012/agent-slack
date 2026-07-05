import { UsageError } from "../domain/errors.js"
import type { ParsedArgs } from "./types.js"

const booleanFlags = new Set([
  "all",
  "allow-write",
  "help",
  "version",
  "json",
  "no-color",
  "raw",
  "pretty",
  "full",
  "trace",
  "yes",
  "no-cache",
  "inclusive",
  "oauth",
  "no-open"
])

export const parseArgs = (argv: readonly string[]): ParsedArgs => {
  const flags = new Map<string, string | boolean>()
  const positionals: string[] = []

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === undefined) {
      continue
    }
    if (token === "--") {
      positionals.push(...argv.slice(index + 1))
      break
    }
    if (!token.startsWith("--") || token === "-") {
      positionals.push(token)
      continue
    }

    const raw = token.slice(2)
    const eq = raw.indexOf("=")
    const name = eq >= 0 ? raw.slice(0, eq) : raw
    if (name === "") {
      throw new UsageError("Invalid empty flag")
    }
    if (eq >= 0) {
      flags.set(name, raw.slice(eq + 1))
      continue
    }
    if (booleanFlags.has(name)) {
      flags.set(name, true)
      continue
    }
    const value = argv[index + 1]
    if (value === undefined || value.startsWith("--")) {
      throw new UsageError(`Missing value for --${name}`, { flag: name })
    }
    flags.set(name, value)
    index += 1
  }

  return { tokens: argv, flags, positionals }
}

export const flagString = (
  parsed: ParsedArgs,
  name: string,
  fallback?: string
): string | undefined => {
  const value = parsed.flags.get(name)
  if (typeof value === "string") {
    return value
  }
  return fallback
}

export const flagBoolean = (parsed: ParsedArgs, name: string): boolean =>
  parsed.flags.get(name) === true

export const requireFlag = (parsed: ParsedArgs, name: string): string => {
  const value = flagString(parsed, name)
  if (value === undefined) {
    throw new UsageError(`Missing required --${name}`, { flag: name })
  }
  return value
}

export const splitCsv = (value: string | undefined): readonly string[] =>
  value === undefined || value.trim() === ""
    ? []
    : value.split(",").map((item) => item.trim()).filter(Boolean)
