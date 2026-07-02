# Agent Slack OAuth Relay

Tiny Vercel app for Slack OAuth distribution.

Slack requires a public HTTPS redirect URL for distributed apps. This relay receives Slack's `code` and `state`, then sends the browser back to the local CLI callback:

```text
http://localhost:45454/oauth/slack/callback
```

## Deploy

Deploy this folder as a Vercel project, then add the deployed URL to Slack:

```text
https://aslk.vercel.app/oauth/slack/callback
```

For local CLI testing with another relay URL:

```bash
AGENT_SLACK_OAUTH_REDIRECT_URI=https://your-vercel-app.vercel.app/oauth/slack/callback aslk auth login
```

Optional Vercel env:

```text
AGENT_SLACK_LOCAL_CALLBACK_URL=http://localhost:45454/oauth/slack/callback
```
