const defaultLocalCallbackUrl = 'http://localhost:45454/oauth/slack/callback';

export function GET(request: Request) {
  const target = localCallbackUrl();
  const url = new URL(request.url);

  let hasCode = false;
  let errorValue: string | null = null;
  for (const key of ['code', 'state', 'error']) {
    const value = url.searchParams.get(key);
    if (value !== null && value.length > 0) {
      target.searchParams.set(key, value);
      if (key === 'code') hasCode = true;
      if (key === 'error') errorValue = value;
    }
  }

  const mode = errorValue ? 'error' : hasCode ? 'success' : 'preview';

  return new Response(renderPage(target.toString(), mode, errorValue), {
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/html; charset=utf-8',
    },
  });
}

const localCallbackUrl = (): URL => {
  const value =
    process.env.AGENT_SLACK_LOCAL_CALLBACK_URL ?? defaultLocalCallbackUrl;
  const url = new URL(value);

  if (url.protocol !== 'http:') {
    throw new Error('AGENT_SLACK_LOCAL_CALLBACK_URL must use http');
  }

  if (!['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname)) {
    throw new Error('AGENT_SLACK_LOCAL_CALLBACK_URL must point to localhost');
  }

  return url;
};

type CallbackMode = 'success' | 'error' | 'preview';

const renderPage = (
  targetUrl: string,
  mode: CallbackMode,
  errorValue: string | null,
): string => {
  const isError = mode === 'error';
  const heading = isError ? "Sign-in didn't finish" : 'Connected to Slack';
  const message = isError
    ? `Slack reported <code>${escapeHtml(errorValue ?? 'an error')}</code>. You can close this tab and run <code>agent-slack auth login</code> again.`
    : mode === 'success'
      ? 'Returning you to the CLI. You can close this tab.'
      : '';

  // Only forward to the local CLI callback during a real OAuth round-trip.
  const forwardScript =
    mode === 'preview'
      ? ''
      : `<script>setTimeout(function(){location.replace(${JSON.stringify(targetUrl)})},1200)</script>`;
  const manualLink =
    mode === 'preview'
      ? ''
      : `<a class="link" href="${escapeHtml(targetUrl)}">Return manually</a>`;

  const mark = isError
    ? `<div class="badge badge-error" aria-hidden="true">!</div>`
    : `<div class="badge badge-ok" aria-hidden="true">
         <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
       </div>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(heading)} | agent-slack</title>
    <style>
      :root {
        color-scheme: light dark;
        --bg: #ffffff;
        --fg: #18181b;
        --muted: #6b6b74;
        --card: #ffffff;
        --border: #e6e6ea;
        --accent: oklch(0.47 0.2 330);
        --ok: #2eb67d;
        --err: #e01e5a;
        --code: #f4f4f5;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --bg: oklch(0.145 0.006 285);
          --fg: oklch(0.92 0.004 285);
          --muted: oklch(0.62 0.006 285);
          --card: oklch(0.17 0.006 285);
          --border: oklch(0.24 0.006 285);
          --accent: oklch(0.68 0.19 330);
          --code: oklch(0.22 0.006 285);
        }
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: var(--bg);
        color: var(--fg);
        font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      main {
        width: min(420px, 100%);
        text-align: center;
      }
      .logo {
        width: 64px;
        height: 64px;
        border-radius: 15px;
        display: block;
        margin: 0 auto 20px;
      }
      .row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin: 0 0 6px;
      }
      .badge {
        flex: none;
        width: 22px;
        height: 22px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        color: #fff;
        font-weight: 700;
        font-size: 13px;
      }
      .badge-ok { background: var(--ok); }
      .badge-error { background: var(--err); }
      h1 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.01em; }
      p { margin: 0 0 20px; color: var(--muted); }
      code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.86em;
        background: var(--code);
        padding: 1px 6px;
        border-radius: 5px;
      }
      .link {
        color: var(--accent);
        text-decoration: none;
        font-size: 14px;
        font-weight: 500;
      }
      .link:hover { text-decoration: underline; text-underline-offset: 3px; }
    </style>
    ${forwardScript}
  </head>
  <body>
    <main>
      <img class="logo" src="/logo.png" alt="agent-slack">
      <div class="row">
        ${mark}
        <h1>${escapeHtml(heading)}</h1>
      </div>
      ${message ? `<p>${message}</p>` : ''}
      ${manualLink}
    </main>
  </body>
</html>`;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
