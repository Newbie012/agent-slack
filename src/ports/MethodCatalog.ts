export type MethodSafety = "read" | "write" | "destructive" | "admin" | "unknown"

export interface MethodMetadata {
  readonly method: string
  readonly family: string
  readonly summary: string
  readonly safety: MethodSafety
  readonly scopes: readonly string[]
  readonly itemKey?: string
  readonly cursorPaginated: boolean
}

export interface MethodCatalog {
  readonly listMethods: (family?: string) => readonly MethodMetadata[]
  readonly describeMethod: (method: string) => MethodMetadata | null
  readonly safetyFor: (method: string) => MethodSafety
  readonly itemKeyFor: (method: string) => string | null
}
