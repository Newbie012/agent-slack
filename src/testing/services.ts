import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { BundledMethodCatalog } from "../adapters/catalog/BundledMethodCatalog.js"
import { HttpFileDownloader } from "../adapters/http-file-downloader/HttpFileDownloader.js"
import { NodeLocalhostOAuthFlow } from "../adapters/localhost-oauth/NodeLocalhostOAuthFlow.js"
import { SlackApiFailed } from "../domain/errors.js"
import type { AuthProfile, SlackCallInput, SlackCallResult } from "../domain/slack.js"
import type { CliServices } from "../application/services.js"
import type { TokenStore } from "../ports/TokenStore.js"
import type { SlackWebApi } from "../ports/SlackWebApi.js"
import type { OAuthFlow, OAuthLoginRequest, OAuthRefreshRequest, OAuthRefreshResult } from "../ports/OAuthFlow.js"
import type { FileDownloader, FileDownloadRequest, FileDownloadResult } from "../ports/FileDownloader.js"
import { SlackSdkWebApi } from "../adapters/slack-sdk/SlackSdkWebApi.js"
import type { DriverState } from "./state.js"

class InMemoryTokenStore implements TokenStore {
  constructor(private readonly state: DriverState) {}

  async getProfile(name: string): Promise<AuthProfile | null> {
    return this.state.profiles.find((profile) => profile.name === name) ?? null
  }

  async setProfile(profile: AuthProfile): Promise<void> {
    const index = this.state.profiles.findIndex((item) => item.name === profile.name)
    if (index >= 0) {
      this.state.profiles[index] = profile
      return
    }
    this.state.profiles.push(profile)
  }

  async listProfiles(): Promise<readonly AuthProfile[]> {
    return this.state.profiles
  }

  async deleteProfile(name: string): Promise<boolean> {
    const before = this.state.profiles.length
    const next = this.state.profiles.filter((profile) => profile.name !== name)
    this.state.profiles.length = 0
    this.state.profiles.push(...next)
    return next.length !== before
  }
}

class FakeSlackWebApi implements SlackWebApi {
  constructor(private readonly state: DriverState) {}

  async call(input: SlackCallInput): Promise<SlackCallResult> {
    this.state.slackCalls.push(input)
    const stub = this.state.slackStubs.find((item) => item.method === input.method)
    if (stub === undefined) {
      throw new SlackApiFailed(`No Slack stub for ${input.method}`, { method: input.method })
    }
    if (stub.responses !== undefined) {
      const response = stub.responses.shift()
      if (response === undefined) {
        throw new SlackApiFailed(`No queued Slack stub response for ${input.method}`, { method: input.method })
      }
      return { method: input.method, response }
    }
    if (stub.response === undefined) {
      throw new SlackApiFailed(`No Slack stub response for ${input.method}`, { method: input.method })
    }
    return { method: input.method, response: stub.response }
  }
}

class TestSlackWebApi implements SlackWebApi {
  constructor(private readonly state: DriverState) {}

  async call(input: SlackCallInput): Promise<SlackCallResult> {
    if (this.state.emulateUrl !== null) {
      return new SlackSdkWebApi({ slackApiUrl: `${this.state.emulateUrl}/api/` }).call(input)
    }
    return new FakeSlackWebApi(this.state).call(input)
  }
}

class TestOAuthFlow implements OAuthFlow {
  constructor(private readonly state: DriverState) {}

  async login(input: OAuthLoginRequest): Promise<AuthProfile> {
    if (this.state.emulateUrl === null) {
      return new NodeLocalhostOAuthFlow({
        authorizeUrl: "https://slack.com/oauth/v2/authorize",
        tokenUrl: "https://slack.com/api/oauth.v2.access",
        openBrowser: async (url) => {
          this.state.openedOAuthUrls.push(url)
          return true
        }
      }).login(input)
    }
    return new NodeLocalhostOAuthFlow({
      authorizeUrl: `${this.state.emulateUrl}/oauth/v2/authorize`,
      tokenUrl: `${this.state.emulateUrl}/api/oauth.v2.access`,
      openBrowser: async (url) => {
        this.state.openedOAuthUrls.push(url)
        return true
      }
    }).login(input)
  }

  async refresh(input: OAuthRefreshRequest): Promise<OAuthRefreshResult> {
    const tokenUrl = this.state.emulateUrl === null
      ? "https://slack.com/api/oauth.v2.access"
      : `${this.state.emulateUrl}/api/oauth.v2.access`
    return new NodeLocalhostOAuthFlow({ authorizeUrl: "https://slack.com/oauth/v2/authorize", tokenUrl }).refresh(input)
  }
}

class FakeFileDownloader implements FileDownloader {
  constructor(private readonly state: DriverState) {}

  async download(input: FileDownloadRequest): Promise<FileDownloadResult> {
    const stub = this.state.fileDownloads.find((item) => item.url === input.url)
    if (stub === undefined && this.state.emulateUrl !== null) {
      return new HttpFileDownloader().download(input)
    }
    if (stub === undefined) {
      throw new SlackApiFailed(`No file download stub for ${input.url}`, { url: input.url })
    }
    const content = Buffer.isBuffer(stub.content) ? stub.content : Buffer.from(stub.content)
    await mkdir(dirname(input.outPath), { recursive: true })
    await writeFile(input.outPath, content, { mode: 0o600 })
    return { path: input.outPath, bytes: content.byteLength }
  }
}

export const createTestServices = (state: DriverState): CliServices => ({
  tokenStore: new InMemoryTokenStore(state),
  oauthFlow: new TestOAuthFlow(state),
  fileDownloader: new FakeFileDownloader(state),
  slackWebApi: new TestSlackWebApi(state),
  methodCatalog: new BundledMethodCatalog()
})
