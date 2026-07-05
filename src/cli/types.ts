import type { MethodSafety } from "../ports/MethodCatalog.js"

export interface CommandMetadata {
  readonly path: readonly string[]
  readonly summary: string
  readonly args?: readonly string[]
  readonly flags?: readonly string[]
  // Key under the response envelope's `data` that holds this command's primary
  // payload (e.g. "channels"). Derived from the command's method; see dataKeyFor.
  readonly dataKey?: string
  readonly methods?: readonly string[]
  readonly scopes?: readonly string[]
  readonly safety: MethodSafety
  readonly output: string
  readonly examples: readonly string[]
}

export interface ParsedArgs {
  readonly tokens: readonly string[]
  readonly flags: ReadonlyMap<string, string | boolean>
  readonly positionals: readonly string[]
}

export interface CliExecution {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
}

export interface CliExecutionOptions {
  readonly stdoutIsTty?: boolean
  readonly env?: Readonly<Record<string, string | undefined>>
}
