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
      :root { color-scheme: dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #000;
        color: #fff;
        font: 16px/1.5 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      }
      main { width: min(520px, calc(100vw - 48px)); }
      h1 { margin: 0 0 12px; font-size: 20px; font-weight: 700; letter-spacing: 0; }
      p { margin: 0 0 18px; color: #cfcfcf; }
      a { color: #fff; text-decoration: underline; text-underline-offset: 3px; }
    </style>
    <script>
      location.replace(${JSON.stringify(targetUrl)});
    </script>
  </head>
  <body>
    <main>
      <h1>Returning to Agent Slack</h1>
      <p>Keep the terminal open. This tab will hand the Slack approval back to the CLI.</p>
      <a href="${escapeHtml(targetUrl)}">Continue manually</a>
    </main>
  </body>
</html>`

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
