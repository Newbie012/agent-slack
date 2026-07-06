import { createServer } from "node:net"
import { WebClient } from "@slack/web-api"
import type { Emulator, SeedConfig } from "emulate"
import { ProfileName, Scope } from "../../../domain/ids.js"
import type { DriverState } from "../../state.js"
import {
  generateEmulateSlackWorkspaceTestModel,
  toEmulateSlackSeed,
  type EmulateSlackWorkspaceTestModel
} from "./model.js"

export class EmulateTestDriver {
  private emulator: Emulator | null = null
  private token = "xoxb-local-test"

  constructor(private readonly state: DriverState) {}

  async start(options: { readonly model?: Partial<EmulateSlackWorkspaceTestModel>; readonly port?: number } = {}) {
    const { createEmulator } = await import("emulate")
    const model = generateEmulateSlackWorkspaceTestModel(options.model)
    this.token = model.token
    const port = options.port ?? await findOpenPort()
    this.emulator = await createEmulator({
      service: "slack",
      port,
      seed: toEmulateSlackSeed(model) as SeedConfig
    })
    this.state.emulateUrl = this.emulator.url
    this.state.profiles.length = 0
    this.state.profiles.push({
      name: ProfileName.default,
      tokenType: "bot",
      botToken: model.token,
      scopes: model.scopes.map(Scope.make)
    })
    return { url: this.emulator.url, token: model.token, channelName: model.channelName }
  }

  reset() {
    this.emulator?.reset()
  }

  async close() {
    if (this.emulator !== null) {
      await this.emulator.close()
      this.emulator = null
    }
    this.state.emulateUrl = null
  }

  async createMessage(options: { readonly channelName?: string; readonly text?: string } = {}) {
    const url = this.requireUrl()
    const client = new WebClient(this.token, {
      slackApiUrl: `${url}/api/`,
      allowAbsoluteUrls: false
    })
    const channel = await this.getChannel({ name: options.channelName ?? "engineering" })
    const response = await client.apiCall("chat.postMessage", {
      channel: channel.id,
      text: options.text ?? "hello from Emulate"
    }) as unknown as { channel: string; ts: string; message?: { user?: string; text?: string; ts?: string } }
    return {
      channelId: response.channel,
      userId: response.message?.user ?? "unknown",
      ts: response.ts,
      text: response.message?.text ?? options.text ?? "hello from Emulate"
    }
  }

  async createThread(options: { readonly channelName?: string; readonly parentText?: string; readonly replyText?: string } = {}) {
    const url = this.requireUrl()
    const client = new WebClient(this.token, {
      slackApiUrl: `${url}/api/`,
      allowAbsoluteUrls: false
    })
    const parent = await this.createMessage({
      ...(options.channelName === undefined ? {} : { channelName: options.channelName }),
      text: options.parentText ?? "thread parent"
    })
    const reply = await client.apiCall("chat.postMessage", {
      channel: parent.channelId,
      thread_ts: parent.ts,
      text: options.replyText ?? "thread reply"
    }) as unknown as { channel: string; ts: string; message?: { user?: string; text?: string; ts?: string; thread_ts?: string } }
    return {
      channelId: parent.channelId,
      parentTs: parent.ts,
      replyTs: reply.ts,
      parentText: parent.text,
      replyText: reply.message?.text ?? options.replyText ?? "thread reply"
    }
  }

  async addReaction(options: { readonly channelId: string; readonly ts: string; readonly name?: string }) {
    const url = this.requireUrl()
    const client = new WebClient(this.token, {
      slackApiUrl: `${url}/api/`,
      allowAbsoluteUrls: false
    })
    await client.apiCall("reactions.add", {
      channel: options.channelId,
      timestamp: options.ts,
      name: options.name ?? "white_check_mark"
    })
  }

  async addPin(options: { readonly channelId: string; readonly ts: string }) {
    const url = this.requireUrl()
    const client = new WebClient(this.token, {
      slackApiUrl: `${url}/api/`,
      allowAbsoluteUrls: false
    })
    await client.apiCall("pins.add", {
      channel: options.channelId,
      timestamp: options.ts
    })
  }

  async addBookmark(options: { readonly channelId: string; readonly title?: string; readonly link?: string }) {
    const url = this.requireUrl()
    const client = new WebClient(this.token, {
      slackApiUrl: `${url}/api/`,
      allowAbsoluteUrls: false
    })
    await client.apiCall("bookmarks.add", {
      channel_id: options.channelId,
      title: options.title ?? "Docs",
      type: "link",
      link: options.link ?? "https://example.com"
    })
  }

  async uploadFile(options: { readonly channelName?: string; readonly filename?: string; readonly content?: string } = {}) {
    const url = this.requireUrl()
    const client = new WebClient(this.token, {
      slackApiUrl: `${url}/api/`,
      allowAbsoluteUrls: false
    })
    const channel = await this.getChannel({ name: options.channelName ?? "engineering" })
    const filename = options.filename ?? "notes.txt"
    const content = options.content ?? "hello from file"
    const upload = await client.apiCall("files.getUploadURLExternal", {
      filename,
      length: Buffer.byteLength(content)
    }) as unknown as { upload_url: string; file_id: string }
    const form = new FormData()
    form.set("file", new Blob([content], { type: "text/plain" }), filename)
    const uploadResponse = await fetch(upload.upload_url, {
      method: "POST",
      body: form
    })
    if (!uploadResponse.ok) {
      throw new Error(`Emulate file upload failed with ${uploadResponse.status}: ${await uploadResponse.text()}`)
    }
    await client.apiCall("files.completeUploadExternal", {
      files: [{ id: upload.file_id, title: filename }],
      channel_id: channel.id
    })
    return {
      channelId: channel.id,
      fileId: upload.file_id,
      filename,
      content
    }
  }

  async getChannel(options: { readonly name?: string } = {}) {
    const url = this.requireUrl()
    const client = new WebClient(this.token, {
      slackApiUrl: `${url}/api/`,
      allowAbsoluteUrls: false
    })
    const channelName = options.name ?? "engineering"
    const list = await client.apiCall("conversations.list", { types: "public_channel" }) as unknown as {
      channels?: Array<{ id: string; name: string }>
    }
    const channel = list.channels?.find((item) => item.name === channelName)
    if (channel === undefined) {
      throw new Error(`No Emulate Slack channel named ${channelName}`)
    }
    return channel
  }

  async completeOAuthInstall(options: { readonly authorizationUrl: string; readonly localCallbackUrl?: string }) {
    const authorizationUrl = new URL(options.authorizationUrl)
    const page = await fetch(authorizationUrl).then((response) => response.text())
    const body = new URLSearchParams({
      user_id: extractHiddenValue(page, "user_id"),
      redirect_uri: authorizationUrl.searchParams.get("redirect_uri") ?? "",
      scope: authorizationUrl.searchParams.get("scope") ?? "",
      user_scope: authorizationUrl.searchParams.get("user_scope") ?? "",
      state: authorizationUrl.searchParams.get("state") ?? "",
      client_id: authorizationUrl.searchParams.get("client_id") ?? ""
    })
    const response = await fetch(`${authorizationUrl.origin}/oauth/v2/authorize/callback`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      redirect: options.localCallbackUrl === undefined ? "follow" : "manual"
    })
    if (options.localCallbackUrl !== undefined) {
      const location = response.headers.get("location")
      if (location === null) {
        throw new Error("Emulate OAuth install did not return a redirect location")
      }
      const redirected = new URL(location)
      const callback = new URL(options.localCallbackUrl)
      callback.search = redirected.search
      const callbackResponse = await fetch(callback)
      const callbackBody = await callbackResponse.text()
      if (!callbackResponse.ok) {
        throw new Error(`Local OAuth callback failed with ${callbackResponse.status}: ${callbackBody}`)
      }
      return {
        status: callbackResponse.status,
        contentType: callbackResponse.headers.get("content-type"),
        body: callbackBody
      }
    }
    if (!response.ok) {
      throw new Error(`Emulate OAuth install failed with ${response.status}: ${await response.text()}`)
    }
  }

  private requireUrl(): string {
    if (this.state.emulateUrl === null) {
      throw new Error("Start Emulate before using the Emulate driver")
    }
    return this.state.emulateUrl
  }
}

const findOpenPort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = createServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      const port = typeof address === "object" && address !== null ? address.port : 4403
      server.close((error) => {
        if (error !== undefined) {
          reject(error)
          return
        }
        resolve(port)
      })
    })
  })

const extractHiddenValue = (html: string, name: string): string => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pattern = new RegExp(`name="${escapedName}"\\s+value="([^"]*)"`)
  const match = html.match(pattern)
  if (match?.[1] === undefined) {
    throw new Error(`No hidden field named ${name} in Emulate OAuth page`)
  }
  return match[1]
}
