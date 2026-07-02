import { parseArgs } from "../cli/args.js"
import type { CliExecution, CliExecutionOptions } from "../cli/types.js"
import { errorEnvelope } from "../output/envelope.js"
import { dispatch, renderDispatchResult } from "./commands.js"
import type { CliServices } from "./services.js"

export const executeCli = async (
  argv: readonly string[],
  services: CliServices,
  options: CliExecutionOptions = {}
): Promise<CliExecution> => {
  try {
    const parsed = parseArgs(argv)
    const result = await dispatch(parsed, services)
    return {
      exitCode: 0,
      stdout: renderDispatchResult(parsed, result, options),
      stderr: ""
    }
  } catch (error) {
    const { envelope, exitCode } = errorEnvelope(error)
    return {
      exitCode,
      stdout: "",
      stderr: `${JSON.stringify(envelope, null, 2)}\n`
    }
  }
}
