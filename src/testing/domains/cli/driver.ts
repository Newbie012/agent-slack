import { executeCli } from "../../../application/execute.js"
import type { CliServices } from "../../../application/services.js"
import type { CliExecutionOptions } from "../../../cli/types.js"
import { generateCliRunTestModel, type CliRunTestModel } from "./model.js"

export interface CliRunResult {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
  readonly envelope: unknown
  readonly errorEnvelope: unknown
}

export class CliTestDriver {
  constructor(private readonly services: CliServices) {}

  async run(options: { readonly model?: Partial<CliRunTestModel>; readonly args?: readonly string[]; readonly terminal?: CliExecutionOptions } = {}): Promise<CliRunResult> {
    const model = generateCliRunTestModel(options.model)
    const execution = await executeCli(options.args ?? model.args, this.services, options.terminal)
    return {
      ...execution,
      envelope: parseMaybeJson(execution.stdout),
      errorEnvelope: parseMaybeJson(execution.stderr)
    }
  }

  async runJson(options: { readonly args: readonly string[] }): Promise<CliRunResult> {
    return this.run({ args: options.args })
  }

  async runNdjson(options: { readonly args: readonly string[] }): Promise<CliRunResult> {
    return this.run({ args: options.args })
  }
}

const parseMaybeJson = (value: string): unknown => {
  if (value.trim() === "") {
    return null
  }
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}
