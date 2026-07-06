import { AGENT_SLACK_LOGO_DATA_URI, GEIST_WOFF2_DATA_URI } from "./logo"

const defaultLocalCallbackUrl = "http://localhost:45454/oauth/slack/callback"

export default function handler(request: { readonly query: Record<string, unknown> }, response: {
  statusCode: number
  setHeader: (name: string, value: string) => void
  end: (body: string) => void
}) {
  const target = localCallbackUrl()
  for (const key of ["code", "state", "error"]) {
    const value = firstQueryValue(request.query[key])
    if (value !== undefined) {
      target.searchParams.set(key, value)
    }
  }

  response.statusCode = 200
  response.setHeader("content-type", "text/html; charset=utf-8")
  response.setHeader("cache-control", "no-store")
  response.end(renderPage(target.toString()))
}

const localCallbackUrl = (): URL => {
  const value = process.env.AGENT_SLACK_LOCAL_CALLBACK_URL ?? defaultLocalCallbackUrl
  const url = new URL(value)
  if (url.protocol !== "http:") {
    throw new Error("AGENT_SLACK_LOCAL_CALLBACK_URL must use http")
  }
  if (!["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname)) {
    throw new Error("AGENT_SLACK_LOCAL_CALLBACK_URL must point to localhost")
  }
  return url
}

const firstQueryValue = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.length > 0) {
    return value
  }
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].length > 0) {
    return value[0]
  }
  return undefined
}

const renderPage = (targetUrl: string): string => `<!doctype html>
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
      /* Reserve consistent height below the logo so this page and the CLI's
         success page center identically — the logo does not jump on redirect. */
      .copy { min-height: 4.5em; }
      .logo {
        width: 76px; height: 76px; display: block; margin: 0 auto 24px;
        filter: grayscale(1); opacity: 0.6;
        animation: pending 1.6s ease-in-out infinite;
      }
      h1 { margin: 0 0 12px; font-size: 20px; font-weight: 400; letter-spacing: 0; }
      p { margin: 0 0 18px; color: #cfcfcf; }
      a { color: #fff; text-decoration: underline; text-underline-offset: 3px; }
      @keyframes pending {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 0.8; }
      }
      @media (prefers-reduced-motion: reduce) { .logo { animation: none; } }
    </style>
    <script>
      location.replace(${JSON.stringify(targetUrl)});
    </script>
  </head>
  <body>
    <main>
      <img class="logo" alt="Agent Slack" src="${AGENT_SLACK_LOGO_DATA_URI}">
      <div class="copy">
        <h1>Returning to Agent Slack</h1>
        <a href="${escapeHtml(targetUrl)}">Continue manually</a>
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
