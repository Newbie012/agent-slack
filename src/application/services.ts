import type { FileDownloader } from "../ports/FileDownloader.js"
import type { MethodCatalog } from "../ports/MethodCatalog.js"
import type { OAuthFlow } from "../ports/OAuthFlow.js"
import type { SlackWebApi } from "../ports/SlackWebApi.js"
import type { TokenStore } from "../ports/TokenStore.js"

export interface CliServices {
  readonly tokenStore: TokenStore
  readonly oauthFlow: OAuthFlow
  readonly fileDownloader: FileDownloader
  readonly slackWebApi: SlackWebApi
  readonly methodCatalog: MethodCatalog
}
