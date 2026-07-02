import { UsageError } from "../domain/errors.js"

export const projectFields = (value: unknown, fields: string | undefined): unknown => {
  if (fields === undefined || fields.trim() === "") {
    return value
  }
  const paths = fields.split(",").map((field) => field.trim()).filter(Boolean)
  if (paths.length === 0) {
    return value
  }
  const projected: Record<string, unknown> = {}
  for (const path of paths) {
    assignPath(projected, path, readPath(value, path))
  }
  return projected
}

const readPath = (value: unknown, path: string): unknown => {
  let current = value
  for (const segment of path.split(".")) {
    if (segment === "") {
      throw new UsageError("--fields paths cannot contain empty segments", { path })
    }
    if (Array.isArray(current)) {
      const index = Number(segment)
      if (!Number.isInteger(index) || index < 0) {
        return undefined
      }
      current = current[index]
      continue
    }
    if (typeof current !== "object" || current === null || !(segment in current)) {
      return undefined
    }
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

const assignPath = (target: Record<string, unknown>, path: string, value: unknown): void => {
  const segments = path.split(".")
  let current = target
  for (const segment of segments.slice(0, -1)) {
    const next = current[segment]
    if (typeof next === "object" && next !== null && !Array.isArray(next)) {
      current = next as Record<string, unknown>
      continue
    }
    const created: Record<string, unknown> = {}
    current[segment] = created
    current = created
  }
  const last = segments.at(-1)
  if (last === undefined || last === "") {
    throw new UsageError("--fields paths cannot contain empty segments", { path })
  }
  current[last] = value
}
