import { flagBoolean, flagString, parseArgs } from "../cli/args.js"
import type { CliExecution, CliExecutionOptions, ParsedArgs } from "../cli/types.js"
import { errorEnvelope } from "../output/envelope.js"
import { renderHumanErrorEnvelope } from "../output/human.js"
import { dispatch, renderDispatchResult } from "./commands.js"
import type { CliServices } from "./services.js"

export const executeCli = async (
  argv: readonly string[],
  services: CliServices,
  options: CliExecutionOptions = {}
): Promise<CliExecution> => {
  let parsed: ParsedArgs | null = null
  try {
    parsed = parseArgs(argv)
    const result = await dispatch(parsed, services)
    return {
      exitCode: 0,
      stdout: renderDispatchResult(parsed, result, options),
      stderr: ""
    }
  } catch (error) {
    const { envelope, exitCode } = errorEnvelope(error)
    const stderr = shouldRenderJsonError(argv, parsed, options)
      ? `${JSON.stringify(envelope, null, 2)}\n`
      : renderHumanErrorEnvelope(envelope, {
        color: shouldColorError(argv, parsed, options)
      })
    return {
      exitCode,
      stdout: "",
      stderr
    }
  }
}

const shouldRenderJsonError = (
  argv: readonly string[],
  parsed: ParsedArgs | null,
  options: CliExecutionOptions
): boolean =>
  parsed === null
    ? argv.includes("--json") || options.stdoutIsTty !== true
    : flagBoolean(parsed, "json") || flagString(parsed, "format") === "json" || options.stdoutIsTty !== true

const shouldColorError = (
  argv: readonly string[],
  parsed: ParsedArgs | null,
  options: CliExecutionOptions
): boolean =>
  options.stdoutIsTty === true &&
  options.env?.NO_COLOR === undefined &&
  (parsed === null ? !argv.includes("--no-color") : !flagBoolean(parsed, "no-color"))
