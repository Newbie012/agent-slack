import { randomBytes } from "node:crypto"
import { spawn } from "node:child_process"
import { writeFile } from "node:fs/promises"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { AddressInfo } from "node:net"
import { PermissionDenied, SlackApiFailed, UsageError } from "../../domain/errors.js"
import { ProfileName, Scope } from "../../domain/ids.js"
import type { AuthProfile } from "../../domain/slack.js"
import type { OAuthFlow, OAuthLoginRequest } from "../../ports/OAuthFlow.js"

interface OAuthFlowOptions {
  readonly authorizeUrl: string
  readonly tokenUrl: string
  readonly defaultRedirectHost?: string
  readonly defaultRedirectPath?: string
  readonly defaultTimeoutMs?: number
  readonly openBrowser?: (url: string) => Promise<boolean>
}

interface SlackOAuthAccessResponse {
  readonly ok?: boolean
  readonly error?: string
  readonly access_token?: string
  readonly token_type?: string
  readonly scope?: string
  readonly bot_user_id?: string
  readonly app_id?: string
  readonly team?: { readonly id?: string; readonly name?: string } | null
  readonly enterprise?: { readonly id?: string } | null
  readonly authed_user?: {
    readonly id?: string
    readonly access_token?: string
    readonly token_type?: string
    readonly scope?: string
  }
}

export class NodeLocalhostOAuthFlow implements OAuthFlow {
  constructor(private readonly options: OAuthFlowOptions) {}

  static fromEnv(env: NodeJS.ProcessEnv = process.env): NodeLocalhostOAuthFlow {
    const apiBaseUrl = env.AGENT_SLACK_API_BASE_URL ?? env.SLK_SLACK_API_BASE_URL
    const emulatorBaseUrl = apiBaseUrl?.replace(/\/api\/?$/, "")
    const redirectHost = env.AGENT_SLACK_OAUTH_REDIRECT_HOST ?? env.SLK_OAUTH_REDIRECT_HOST
    const redirectPath = env.AGENT_SLACK_OAUTH_REDIRECT_PATH ?? env.SLK_OAUTH_REDIRECT_PATH
    const timeoutMs = env.AGENT_SLACK_OAUTH_TIMEOUT_MS ?? env.SLK_OAUTH_TIMEOUT_MS
    return new NodeLocalhostOAuthFlow({
      authorizeUrl: env.AGENT_SLACK_OAUTH_AUTHORIZE_URL ?? env.SLK_SLACK_OAUTH_AUTHORIZE_URL ?? (emulatorBaseUrl === undefined ? "https://slack.com/oauth/v2/authorize" : `${emulatorBaseUrl}/oauth/v2/authorize`),
      tokenUrl: env.AGENT_SLACK_OAUTH_ACCESS_URL ?? env.SLK_SLACK_OAUTH_ACCESS_URL ?? (apiBaseUrl === undefined ? "https://slack.com/api/oauth.v2.access" : `${apiBaseUrl.replace(/\/?$/, "/")}oauth.v2.access`),
      ...(redirectHost === undefined ? {} : { defaultRedirectHost: redirectHost }),
      ...(redirectPath === undefined ? {} : { defaultRedirectPath: redirectPath }),
      ...(timeoutMs === undefined ? {} : { defaultTimeoutMs: Number(timeoutMs) })
    })
  }

  async login(input: OAuthLoginRequest): Promise<AuthProfile> {
    const state = randomBytes(24).toString("base64url")
    const timeoutMs = input.timeoutMs ?? this.options.defaultTimeoutMs ?? 120_000
    const server = createServer()
    const started = await listen(server, input.redirectUri, {
      host: this.options.defaultRedirectHost ?? "127.0.0.1",
      path: this.options.defaultRedirectPath ?? "/oauth/slack/callback"
    })
    const authorizationUrl = buildAuthorizationUrl({
      authorizeUrl: this.options.authorizeUrl,
      clientId: input.clientId,
      redirectUri: started.redirectUri,
      scopes: input.scopes,
      userScopes: input.userScopes,
      state
    })

    if (input.authUrlOut !== undefined) {
      await writeFile(input.authUrlOut, authorizationUrl, "utf8")
    } else if (input.openBrowser !== false) {
      const opened = await (this.options.openBrowser ?? openSystemBrowser)(authorizationUrl)
      process.stderr.write(opened
        ? `Opening Slack OAuth in your browser.\nIf it did not open, visit:\n${authorizationUrl}\n`
        : `Could not open a browser automatically. Visit this Slack OAuth URL:\n${authorizationUrl}\n`)
    } else {
      process.stderr.write(`Open this Slack OAuth URL:\n${authorizationUrl}\n`)
    }

    return await new Promise<AuthProfile>((resolve, reject) => {
      const timer = setTimeout(() => {
        closeServer(server)
        reject(new UsageError("Timed out waiting for Slack OAuth callback", { timeoutMs }))
      }, timeoutMs)

      server.on("request", async (request, response) => {
        try {
          const requestUrl = new URL(request.url ?? "/", started.redirectUri)
          if (requestUrl.pathname !== started.path) {
            response.writeHead(404).end("Not found")
            return
          }
          if (requestUrl.searchParams.get("state") !== state) {
            throw new PermissionDenied("Slack OAuth state mismatch")
          }
          const code = requestUrl.searchParams.get("code")
          const oauthError = requestUrl.searchParams.get("error")
          if (oauthError !== null) {
            throw new PermissionDenied(`Slack OAuth failed: ${oauthError}`, { slackError: oauthError })
          }
          if (code === null || code === "") {
            throw new UsageError("Slack OAuth callback did not include a code")
          }
          const access = await exchangeCode({
            tokenUrl: this.options.tokenUrl,
            code,
            clientId: input.clientId,
            clientSecret: input.clientSecret,
            redirectUri: started.redirectUri
          })
          const profile = toAuthProfile(input.profileName, access)
          response.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end("<html><body>Slack auth complete. You can close this tab.</body></html>")
          clearTimeout(timer)
          closeServer(server)
          resolve(profile)
        } catch (error) {
          response.writeHead(400, { "content-type": "text/plain; charset=utf-8" }).end(error instanceof Error ? error.message : String(error))
          clearTimeout(timer)
          closeServer(server)
          reject(error)
        }
      })
    })
  }
}

const listen = (
  server: ReturnType<typeof createServer>,
  redirectUri: string | undefined,
  fallback: { readonly host: string; readonly path: string }
): Promise<{ readonly redirectUri: string; readonly path: string }> =>
  new Promise((resolve, reject) => {
    const parsed = redirectUri === undefined ? null : new URL(redirectUri)
    const host = parsed?.hostname ?? fallback.host
    const path = parsed?.pathname ?? fallback.path
    const port = parsed === null || parsed.port === "" ? 0 : Number(parsed.port)
    if (!Number.isInteger(port) || port < 0) {
      reject(new UsageError("OAuth redirect URI must include a valid port", { redirectUri }))
      return
    }
    server.once("error", reject)
    server.listen(port, host, () => {
      const address = server.address() as AddressInfo
      const actualPort = parsed === null || parsed.port === "" ? address.port : port
      resolve({
        redirectUri: redirectUri ?? `http://${host}:${actualPort}${path}`,
        path
      })
    })
  })

const buildAuthorizationUrl = (input: {
  readonly authorizeUrl: string
  readonly clientId: string
  readonly redirectUri: string
  readonly scopes: readonly string[]
  readonly userScopes: readonly string[]
  readonly state: string
}): string => {
  const url = new URL(input.authorizeUrl)
  url.searchParams.set("client_id", input.clientId)
  url.searchParams.set("scope", input.scopes.join(","))
  if (input.userScopes.length > 0) {
    url.searchParams.set("user_scope", input.userScopes.join(","))
  }
  url.searchParams.set("redirect_uri", input.redirectUri)
  url.searchParams.set("state", input.state)
  return url.toString()
}

const exchangeCode = async (input: {
  readonly tokenUrl: string
  readonly code: string
  readonly clientId: string
  readonly clientSecret: string
  readonly redirectUri: string
}): Promise<SlackOAuthAccessResponse> => {
  const response = await fetch(input.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code,
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri
    })
  })
  const body = await response.json() as SlackOAuthAccessResponse
  if (body.ok === false) {
    throw new PermissionDenied(`Slack OAuth token exchange failed: ${body.error ?? "unknown_error"}`, {
      slackError: body.error ?? "unknown_error"
    })
  }
  if (body.access_token === undefined && body.authed_user?.access_token === undefined) {
    throw new SlackApiFailed("Slack OAuth token exchange did not return a token")
  }
  return body
}

const toAuthProfile = (profileName: string, response: SlackOAuthAccessResponse): AuthProfile => {
  const botScopes = splitScopes(response.scope)
  const userScopes = splitScopes(response.authed_user?.scope)
  return {
    name: ProfileName.make(profileName),
    tokenType: response.access_token === undefined ? "user" : "bot",
    enterpriseId: response.enterprise?.id ?? null,
    ...(response.team?.id === undefined ? {} : { teamId: response.team.id }),
    ...(response.authed_user?.id === undefined ? {} : { userId: response.authed_user.id }),
    ...(response.bot_user_id === undefined ? {} : { botId: response.bot_user_id }),
    ...(response.access_token === undefined ? {} : { botToken: response.access_token }),
    ...(response.authed_user?.access_token === undefined ? {} : { userToken: response.authed_user.access_token }),
    scopes: [...new Set([...botScopes, ...userScopes])].map(Scope.make)
  }
}

const splitScopes = (value: string | undefined): readonly string[] =>
  value === undefined || value.trim() === "" ? [] : value.split(",").map((scope) => scope.trim()).filter(Boolean)

const closeServer = (server: ReturnType<typeof createServer>): void => {
  server.close()
}

const openSystemBrowser = (url: string): Promise<boolean> =>
  new Promise((resolve) => {
    const command = browserCommand(url)
    const child = spawn(command.file, command.args, {
      detached: true,
      stdio: "ignore"
    })
    child.once("error", () => resolve(false))
    child.once("spawn", () => {
      child.unref()
      resolve(true)
    })
  })

const browserCommand = (url: string): { readonly file: string; readonly args: readonly string[] } => {
  if (process.platform === "darwin") {
    return { file: "open", args: [url] }
  }
  if (process.platform === "win32") {
    return { file: "cmd", args: ["/c", "start", "", url] }
  }
  return { file: "xdg-open", args: [url] }
}
