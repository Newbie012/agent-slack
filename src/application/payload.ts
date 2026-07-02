import { readFile } from "node:fs/promises"
import { InvalidPayload, UsageError } from "../domain/errors.js"

export const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks).toString("utf8")
}

export const parseJsonPayload = async (input: {
  readonly inline?: string | undefined
  readonly positional?: string | undefined
}): Promise<Record<string, unknown>> => {
  const source = input.inline ?? input.positional
  if (source === undefined) {
    return {}
  }
  const raw = source === "-"
    ? await readStdin()
    : source.startsWith("@")
      ? await readFile(source.slice(1), "utf8")
      : source

  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new InvalidPayload("Payload JSON must be an object")
    }
    return parsed as Record<string, unknown>
  } catch (error) {
    if (error instanceof InvalidPayload) {
      throw error
    }
    throw new InvalidPayload("Invalid JSON payload", { source: source === "-" ? "stdin" : source })
  }
}

export const requirePositional = (positionals: readonly string[], index: number, label: string): string => {
  const value = positionals[index]
  if (value === undefined) {
    throw new UsageError(`Missing ${label}`, { argument: label })
  }
  return value
}
