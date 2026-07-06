import { createHash, randomBytes } from "node:crypto"
import { spawn } from "node:child_process"
import { writeFile } from "node:fs/promises"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { AddressInfo } from "node:net"
import { PermissionDenied, SlackApiFailed, UsageError } from "../../domain/errors.js"
import { ProfileName, Scope } from "../../domain/ids.js"
import type { AuthProfile } from "../../domain/slack.js"
import type { OAuthFlow, OAuthLoginRequest, OAuthRefreshRequest, OAuthRefreshResult } from "../../ports/OAuthFlow.js"
import { AGENT_SLACK_LOGO_DATA_URI, GEIST_WOFF2_DATA_URI } from "./logo.js"

interface OAuthFlowOptions {
  readonly authorizeUrl: string
  readonly tokenUrl: string
  readonly defaultSlackRedirectUri?: string
  readonly defaultLocalCallbackUri?: string
  readonly defaultRedirectHost?: string
  readonly defaultRedirectPort?: number
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
  readonly expires_in?: number
  readonly refresh_token?: string
  readonly bot_user_id?: string
  readonly app_id?: string
  readonly team?: { readonly id?: string; readonly name?: string } | null
  readonly enterprise?: { readonly id?: string } | null
  readonly authed_user?: {
    readonly id?: string
    readonly access_token?: string
    readonly token_type?: string
    readonly scope?: string
    readonly expires_in?: number
    readonly refresh_token?: string
  }
}

export class NodeLocalhostOAuthFlow implements OAuthFlow {
  constructor(private readonly options: OAuthFlowOptions) {}

  static fromEnv(env: NodeJS.ProcessEnv = process.env): NodeLocalhostOAuthFlow {
    const apiBaseUrl = env.AGENT_SLACK_API_BASE_URL ?? env.SLK_SLACK_API_BASE_URL
    const emulatorBaseUrl = apiBaseUrl?.replace(/\/api\/?$/, "")
    const redirectHost = env.AGENT_SLACK_OAUTH_REDIRECT_HOST ?? env.SLK_OAUTH_REDIRECT_HOST
    const redirectPort = env.AGENT_SLACK_OAUTH_REDIRECT_PORT ?? env.SLK_OAUTH_REDIRECT_PORT
    const redirectPath = env.AGENT_SLACK_OAUTH_REDIRECT_PATH ?? env.SLK_OAUTH_REDIRECT_PATH
    const slackRedirectUri = env.AGENT_SLACK_OAUTH_REDIRECT_URI ?? env.AGENT_SLACK_OAUTH_PUBLIC_REDIRECT_URI
    const localCallbackUri = env.AGENT_SLACK_OAUTH_LOCAL_CALLBACK_URI
    const timeoutMs = env.AGENT_SLACK_OAUTH_TIMEOUT_MS ?? env.SLK_OAUTH_TIMEOUT_MS
    return new NodeLocalhostOAuthFlow({
      authorizeUrl: env.AGENT_SLACK_OAUTH_AUTHORIZE_URL ?? env.SLK_SLACK_OAUTH_AUTHORIZE_URL ?? (emulatorBaseUrl === undefined ? "https://slack.com/oauth/v2/authorize" : `${emulatorBaseUrl}/oauth/v2/authorize`),
      tokenUrl: env.AGENT_SLACK_OAUTH_ACCESS_URL ?? env.SLK_SLACK_OAUTH_ACCESS_URL ?? (apiBaseUrl === undefined ? "https://slack.com/api/oauth.v2.access" : `${apiBaseUrl.replace(/\/?$/, "/")}oauth.v2.access`),
      ...(slackRedirectUri === undefined ? {} : { defaultSlackRedirectUri: slackRedirectUri }),
      ...(localCallbackUri === undefined ? {} : { defaultLocalCallbackUri: localCallbackUri }),
      ...(redirectHost === undefined ? {} : { defaultRedirectHost: redirectHost }),
      ...(redirectPort === undefined ? {} : { defaultRedirectPort: Number(redirectPort) }),
      ...(redirectPath === undefined ? {} : { defaultRedirectPath: redirectPath }),
      ...(timeoutMs === undefined ? {} : { defaultTimeoutMs: Number(timeoutMs) })
    })
  }

  async login(input: OAuthLoginRequest): Promise<AuthProfile> {
    const state = randomBytes(24).toString("base64url")
    const codeVerifier = input.pkce === true ? randomBytes(32).toString("base64url") : undefined
    const timeoutMs = input.timeoutMs ?? this.options.defaultTimeoutMs ?? 120_000
    const server = createServer()
    const slackRedirectUri = input.redirectUri ?? this.options.defaultSlackRedirectUri
    const localCallbackUri =
      input.localCallbackUri ??
      this.options.defaultLocalCallbackUri ??
      (slackRedirectUri !== undefined && isLocalCallbackUri(slackRedirectUri) ? slackRedirectUri : undefined)
    const started = await listen(server, localCallbackUri, {
      host: this.options.defaultRedirectHost ?? defaultRedirectHost,
      port: this.options.defaultRedirectPort ?? defaultRedirectPort,
      path: this.options.defaultRedirectPath ?? "/oauth/slack/callback"
    })
    const redirectUri = slackRedirectUri ?? started.redirectUri
    const authorizationUrl = buildAuthorizationUrl({
      authorizeUrl: this.options.authorizeUrl,
      clientId: input.clientId,
      redirectUri,
      scopes: input.scopes,
      userScopes: input.userScopes,
      state,
      ...(codeVerifier === undefined ? {} : { codeChallenge: codeChallengeFor(codeVerifier) })
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
            codeVerifier,
            redirectUri
          })
          const profile = toAuthProfile(
            input.profileName,
            access,
            input.pkce === true ? "user" : "bot",
            input.pkce === true ? { clientId: input.clientId } : undefined
          )
          clearTimeout(timer)
          // Close the socket after the response so the browser does not hold a
          // keep-alive connection open, then tear down the server once the page
          // has flushed. Otherwise the CLI process hangs after a successful login.
          response.writeHead(200, { "content-type": "text/html; charset=utf-8", "connection": "close" }).end(
            renderCallbackPage({
              tone: "success",
              title: "Slack connected"
            }),
            () => closeServer(server)
          )
          resolve(profile)
        } catch (error) {
          clearTimeout(timer)
          response.writeHead(400, { "content-type": "text/html; charset=utf-8", "connection": "close" }).end(
            renderCallbackPage({
              tone: "error",
              title: "Slack authentication failed",
              body: `${error instanceof Error ? error.message : String(error)} Return to the terminal and run agent-slack auth login again.`
            }),
            () => closeServer(server)
          )
          reject(error)
        }
      })
    })
  }

  async refresh(input: OAuthRefreshRequest): Promise<OAuthRefreshResult> {
    const response = await fetch(this.options.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: input.clientId,
        refresh_token: input.refreshToken
      })
    })
    const body = await response.json() as SlackOAuthAccessResponse
    if (body.ok === false) {
      throw new PermissionDenied(`Slack token refresh failed: ${body.error ?? "unknown_error"}`, {
        slackError: body.error ?? "unknown_error"
      })
    }
    const accessToken = body.authed_user?.access_token ?? body.access_token
    if (accessToken === undefined) {
      throw new SlackApiFailed("Slack token refresh did not return an access token")
    }
    const refreshToken = body.authed_user?.refresh_token ?? body.refresh_token
    const expiresIn = body.authed_user?.expires_in ?? body.expires_in
    return {
      accessToken,
      ...(refreshToken === undefined ? {} : { refreshToken }),
      ...(typeof expiresIn === "number" ? { expiresIn } : {})
    }
  }
}

// Branded callback page shown in the browser after Slack approval. Matches the
// hosted relay's look (apps/oauth-relay) so the round trip feels like one flow:
// the relay shows the logo in grayscale while pending, and this page blooms it
// to full color on success (and leaves it grayscale on failure).
const renderCallbackPage = (input: {
  readonly title: string
  readonly body?: string
  readonly tone: "success" | "error"
}): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Agent Slack</title>
    <style>
      @font-face {
        font-family: "Geist";
        src: url(${GEIST_WOFF2_DATA_URI}) format("woff2");
        font-weight: 100 900;
        font-style: normal;
        font-display: swap;
      }
      :root { color-scheme: dark; }
      body {
        margin: 0;
        min-height: 100vh;
        box-sizing: border-box;
        display: grid;
        place-items: center;
        padding: 24px;
        background: #000;
        color: #fff;
        font: 16px/1.6 "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      }
      main { width: min(520px, 100%); text-align: center; }
      .logo { width: 76px; height: 76px; display: block; margin: 0 auto 24px; }
      /* Reserve consistent height below the logo so this page and the relay's
         pending page center identically — the logo does not jump on redirect. */
      .copy { min-height: 4.5em; }
      h1 { margin: 0 0 12px; font-size: 20px; font-weight: 400; }
      p { margin: 0; color: #cfcfcf; }
      .success .logo { animation: bloom 900ms ease-out both; }
      .error .logo { filter: grayscale(1); opacity: 0.55; }
      @keyframes bloom {
        from { filter: grayscale(1); opacity: 0.5; transform: scale(0.94); }
        to   { filter: grayscale(0); opacity: 1;   transform: scale(1); }
      }
      @media (prefers-reduced-motion: reduce) {
        .success .logo { animation: none; }
      }
    </style>
  </head>
  <body class="${input.tone}">
    <main>
      <img class="logo" alt="Agent Slack" src="${AGENT_SLACK_LOGO_DATA_URI}">
      <div class="copy">
        <h1>${escapeHtml(input.title)}</h1>
        ${input.body === undefined ? "" : `<p>${escapeHtml(input.body)}</p>`}
      </div>
    </main>
  </body>
</html>`

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

const listen = (
  server: ReturnType<typeof createServer>,
  redirectUri: string | undefined,
  fallback: { readonly host: string; readonly port: number; readonly path: string }
): Promise<{ readonly redirectUri: string; readonly path: string }> =>
  new Promise((resolve, reject) => {
    const parsed = redirectUri === undefined ? null : new URL(redirectUri)
    const host = parsed?.hostname ?? fallback.host
    const path = parsed?.pathname ?? fallback.path
    const port = parsed === null || parsed.port === "" ? fallback.port : Number(parsed.port)
    if (!Number.isInteger(port) || port < 0) {
      reject(new UsageError("OAuth redirect URI must include a valid port", { redirectUri }))
      return
    }
    server.once("error", reject)
    server.listen(port, host, () => {
      const address = server.address() as AddressInfo
      const actualPort = parsed === null || parsed.port === "" ? port : address.port
      resolve({
        redirectUri: redirectUri ?? `http://${host}:${actualPort}${path}`,
        path
      })
    })
  })

const defaultRedirectHost = "localhost"
const defaultRedirectPort = 45454

const isLocalCallbackUri = (value: string): boolean => {
  const parsed = new URL(value)
  return parsed.protocol === "http:" && (
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "[::1]" ||
    parsed.hostname === "::1"
  )
}

const buildAuthorizationUrl = (input: {
  readonly authorizeUrl: string
  readonly clientId: string
  readonly redirectUri: string
  readonly scopes: readonly string[]
  readonly userScopes: readonly string[]
  readonly state: string
  readonly codeChallenge?: string | undefined
}): string => {
  const url = new URL(input.authorizeUrl)
  url.searchParams.set("client_id", input.clientId)
  if (input.scopes.length > 0) {
    url.searchParams.set("scope", input.scopes.join(","))
  }
  if (input.userScopes.length > 0) {
    url.searchParams.set("user_scope", input.userScopes.join(","))
  }
  url.searchParams.set("redirect_uri", input.redirectUri)
  url.searchParams.set("state", input.state)
  if (input.codeChallenge !== undefined) {
    url.searchParams.set("code_challenge", input.codeChallenge)
    url.searchParams.set("code_challenge_method", "S256")
  }
  return url.toString()
}

const exchangeCode = async (input: {
  readonly tokenUrl: string
  readonly code: string
  readonly clientId: string
  readonly clientSecret?: string | undefined
  readonly codeVerifier?: string | undefined
  readonly redirectUri: string
}): Promise<SlackOAuthAccessResponse> => {
  const requestBody = new URLSearchParams({
    code: input.code,
    client_id: input.clientId,
    redirect_uri: input.redirectUri
  })
  if (input.clientSecret !== undefined) {
    requestBody.set("client_secret", input.clientSecret)
  }
  if (input.codeVerifier !== undefined) {
    requestBody.set("code_verifier", input.codeVerifier)
  }
  const response = await fetch(input.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: requestBody
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

const toAuthProfile = (
  profileName: string,
  response: SlackOAuthAccessResponse,
  preferredTokenType: "bot" | "user",
  rotation?: { readonly clientId: string }
): AuthProfile => {
  const botScopes = splitScopes(response.scope)
  const userScopes = splitScopes(response.authed_user?.scope)
  const rootTokenIsUser = preferredTokenType === "user" && response.access_token !== undefined && response.token_type !== "bot"
  const userToken = response.authed_user?.access_token ?? (rootTokenIsUser ? response.access_token : undefined)
  const useUserToken = preferredTokenType === "user" && userToken !== undefined
  const scopes = useUserToken && userScopes.length > 0 ? userScopes : [...botScopes, ...userScopes]
  // Capture rotation state only for a public-client (PKCE) user token: refresh
  // needs client_id + refresh_token and no secret, so we can refresh it later.
  const refreshToken = response.authed_user?.refresh_token
  const expiresIn = response.authed_user?.expires_in
  const rotationFields = rotation !== undefined && useUserToken && refreshToken !== undefined
    ? {
        refreshToken,
        clientId: rotation.clientId,
        ...(typeof expiresIn === "number" ? { tokenExpiresAt: Math.floor(Date.now() / 1000) + expiresIn } : {})
      }
    : {}
  return {
    name: ProfileName.make(profileName),
    tokenType: useUserToken || response.access_token === undefined ? "user" : "bot",
    enterpriseId: response.enterprise?.id ?? null,
    ...(response.team?.id === undefined ? {} : { teamId: response.team.id }),
    ...(response.authed_user?.id === undefined ? {} : { userId: response.authed_user.id }),
    ...(response.bot_user_id === undefined ? {} : { botId: response.bot_user_id }),
    ...(response.access_token === undefined || useUserToken ? {} : { botToken: response.access_token }),
    ...(userToken === undefined ? {} : { userToken }),
    ...rotationFields,
    scopes: [...new Set(scopes)].map(Scope.make)
  }
}

const codeChallengeFor = (codeVerifier: string): string =>
  createHash("sha256").update(codeVerifier).digest("base64url")

const splitScopes = (value: string | undefined): readonly string[] =>
  value === undefined || value.trim() === "" ? [] : value.split(",").map((scope) => scope.trim()).filter(Boolean)

const closeServer = (server: ReturnType<typeof createServer>): void => {
  server.close()
  // Destroy any lingering keep-alive sockets (the callback page, a favicon
  // request) so no open handle keeps the CLI process alive after login.
  server.closeAllConnections()
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
