import { BundledMethodCatalog } from "./catalog/BundledMethodCatalog.js"
import { HttpFileDownloader } from "./http-file-downloader/HttpFileDownloader.js"
import { KeychainTokenStore } from "./keychain/KeychainTokenStore.js"
import { NodeLocalhostOAuthFlow } from "./localhost-oauth/NodeLocalhostOAuthFlow.js"
import { FileTokenStore } from "./profile-file/FileTokenStore.js"
import { SlackSdkWebApi } from "./slack-sdk/SlackSdkWebApi.js"
import type { CliServices } from "../application/services.js"

export const createLiveServices = (env: NodeJS.ProcessEnv = process.env): CliServices => {
  const tokenStore = env.AGENT_SLACK_TOKEN_STORE ?? env.SLK_TOKEN_STORE
  const slackApiUrl = env.AGENT_SLACK_API_BASE_URL ?? env.SLK_SLACK_API_BASE_URL
  return {
    tokenStore: tokenStore === "keychain" ? KeychainTokenStore.fromEnv(env) : FileTokenStore.fromEnv(env),
    oauthFlow: NodeLocalhostOAuthFlow.fromEnv(env),
    fileDownloader: new HttpFileDownloader(),
    slackWebApi: new SlackSdkWebApi(slackApiUrl === undefined ? {} : { slackApiUrl }),
    methodCatalog: new BundledMethodCatalog()
  }
}
