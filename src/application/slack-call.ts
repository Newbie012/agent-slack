import { UnsafeMethodBlocked } from "../domain/errors.js"
import type { AuthProfile } from "../domain/slack.js"
import { pagingFrom } from "../output/envelope.js"
import type { MethodSafety } from "../ports/MethodCatalog.js"
import type { CliServices } from "./services.js"

export interface CallOptions {
  readonly method: string
  readonly payload: Record<string, unknown>
  readonly token: string
  readonly profile: AuthProfile
  readonly all: boolean
  readonly allowWrite: boolean
  readonly yes: boolean
}

export interface NormalizedCallResult {
  readonly method: string
  readonly response: Record<string, unknown>
  readonly items: readonly unknown[]
}

export const callSlack = async (services: CliServices, options: CallOptions): Promise<NormalizedCallResult> => {
  const safety = services.methodCatalog.safetyFor(options.method)
  if (isUnsafe(safety) && (!options.allowWrite || !options.yes)) {
    throw new UnsafeMethodBlocked(`Refusing unsafe Slack method ${options.method}`, {
      method: options.method,
      safety
    })
  }

  if (!options.all) {
    const result = await services.slackWebApi.call({
      method: options.method,
      token: options.token,
      payload: options.payload
    })
    return {
      method: options.method,
      response: result.response,
      items: extractItems(services, options.method, result.response)
    }
  }

  const itemKey = services.methodCatalog.itemKeyFor(options.method)
  const collected: unknown[] = []
  let cursor: string | undefined
  let lastResponse: Record<string, unknown> = {}

  for (let page = 0; page < 100; page += 1) {
    const payload = cursor === undefined ? options.payload : { ...options.payload, cursor }
    const result = await services.slackWebApi.call({
      method: options.method,
      token: options.token,
      payload
    })
    lastResponse = result.response
    collected.push(...extractItems(services, options.method, result.response))
    const paging = pagingFrom(result.response)
    if (paging.next_cursor === null || itemKey === null) {
      break
    }
    cursor = paging.next_cursor
  }

  return {
    method: options.method,
    response: itemKey === null ? lastResponse : { ...lastResponse, [itemKey]: collected },
    items: collected
  }
}

const isUnsafe = (safety: MethodSafety) =>
  safety === "write" || safety === "destructive" || safety === "admin"

const extractItems = (
  services: CliServices,
  method: string,
  response: Record<string, unknown>
): readonly unknown[] => {
  const itemKey = services.methodCatalog.itemKeyFor(method)
  if (itemKey === null) {
    return []
  }
  const value = response[itemKey]
  if (Array.isArray(value)) {
    return value
  }
  if (value !== undefined && typeof value === "object" && value !== null) {
    return Object.entries(value).map(([key, entry]) => ({ key, value: entry }))
  }
  return []
}
