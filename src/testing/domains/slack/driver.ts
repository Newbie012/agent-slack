import type { DriverState } from "../../state.js"
import {
  generateSlackChannelTestModel,
  generateSlackMessageTestModel,
  generateSlackThreadTestModel,
  generateSlackUserTestModel,
  generateWorkspaceTestModel,
  toSlackMessagePayload,
  toSlackThreadMessages,
  type SlackChannelTestModel,
  type SlackMessageTestModel,
  type SlackThreadTestModel,
  type SlackUserTestModel,
  type WorkspaceTestModel
} from "./model.js"

export class SlackTestDriver {
  constructor(private readonly state: DriverState) {}

  createWorkspace(options: { readonly model?: Partial<WorkspaceTestModel> } = {}) {
    return generateWorkspaceTestModel(options.model)
  }

  createUser(options: { readonly model?: Partial<SlackUserTestModel> } = {}) {
    return generateSlackUserTestModel(options.model)
  }

  createChannel(options: { readonly model?: Partial<SlackChannelTestModel> } = {}) {
    return generateSlackChannelTestModel(options.model)
  }

  createMessage(options: { readonly model?: Partial<SlackMessageTestModel> } = {}) {
    const model = generateSlackMessageTestModel(options.model)
    this.overrideMethod({ method: "conversations.history", response: { ok: true, messages: [toSlackMessagePayload(model)] } })
    return model
  }

  createThread(options: { readonly model?: Partial<SlackThreadTestModel> } = {}) {
    const model = generateSlackThreadTestModel(options.model)
    this.overrideMethod({ method: "conversations.replies", response: { ok: true, messages: toSlackThreadMessages(model) } })
    return model
  }

  overrideMethod(options: { readonly method: string; readonly response: Record<string, unknown> }) {
    const index = this.state.slackStubs.findIndex((stub) => stub.method === options.method)
    if (index >= 0) {
      this.state.slackStubs[index] = options
    } else {
      this.state.slackStubs.push(options)
    }
  }

  overrideMethodSequence(options: { readonly method: string; readonly responses: readonly Record<string, unknown>[] }) {
    const stub = { method: options.method, responses: [...options.responses] }
    const index = this.state.slackStubs.findIndex((item) => item.method === options.method)
    if (index >= 0) {
      this.state.slackStubs[index] = stub
    } else {
      this.state.slackStubs.push(stub)
    }
  }

  overrideFileDownload(options: { readonly url: string; readonly content: string | Buffer }) {
    const index = this.state.fileDownloads.findIndex((stub) => stub.url === options.url)
    if (index >= 0) {
      this.state.fileDownloads[index] = options
    } else {
      this.state.fileDownloads.push(options)
    }
  }

  listCalls() {
    return this.state.slackCalls
  }
}
