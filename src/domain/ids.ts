export type Brand<T, Name extends string> = T & { readonly __brand: Name }

export type TeamId = Brand<string, "TeamId">
export type EnterpriseId = Brand<string, "EnterpriseId">
export type ChannelId = Brand<string, "ChannelId">
export type UserId = Brand<string, "UserId">
export type MessageTs = Brand<string, "MessageTs">
export type SlackMethod = Brand<string, "SlackMethod">
export type ProfileName = Brand<string, "ProfileName">
export type Scope = Brand<string, "Scope">

const nonEmpty = <T extends string, Name extends string>(value: T, name: Name): Brand<T, Name> => {
  if (value.trim() === "") {
    throw new Error(`${name} cannot be empty`)
  }
  return value as Brand<T, Name>
}

export const TeamId = {
  make: (value: string): TeamId => nonEmpty(value, "TeamId")
}

export const EnterpriseId = {
  make: (value: string): EnterpriseId => nonEmpty(value, "EnterpriseId")
}

export const ChannelId = {
  make: (value: string): ChannelId => nonEmpty(value, "ChannelId")
}

export const UserId = {
  make: (value: string): UserId => nonEmpty(value, "UserId")
}

export const MessageTs = {
  make: (value: string): MessageTs => nonEmpty(value, "MessageTs")
}

export const SlackMethod = {
  make: (value: string): SlackMethod => nonEmpty(value, "SlackMethod")
}

export const ProfileName = {
  default: "default" as ProfileName,
  make: (value: string): ProfileName => nonEmpty(value, "ProfileName")
}

export const Scope = {
  make: (value: string): Scope => nonEmpty(value, "Scope")
}
