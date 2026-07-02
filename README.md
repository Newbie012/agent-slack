<div align="center">

# agent-slack

Slack context for AI agents via the `agent-slack` CLI.
Short alias: `aslk`.

<pre align="center">npm install -g @eliya-oss/agent-slack</pre>

<img src="./assets/terminal.webp" alt="Agent Slack terminal screenshot" width="820">

</div>

## Usage

```bash
agent-slack auth login --json
agent-slack conversation history C123 --limit 50 --json
agent-slack thread get --channel C123 --ts 1710000000.000100 --include users,permalinks --json
agent-slack conversation context C123 --include users,threads,permalinks --format ndjson
agent-slack api call conversations.info --payload '{"channel":"C123"}' --json
```

## Auth

Browser login:

```bash
agent-slack auth login
```

Agent Slack opens Slack in the browser with PKCE and stores a local Slack profile. Users do not create Slack apps or handle Slack client secrets.

Token setup:

```bash
agent-slack auth login --token "$SLACK_BOT_TOKEN" --scopes channels:read,channels:history,users:read
```

Developer/self-hosted fallback:

1. Create a Slack app at <https://api.slack.com/apps>.
2. Add the needed scopes under **OAuth & Permissions**.
3. Install it to your workspace and copy the bot token.
4. Run `agent-slack auth login --token "$SLACK_BOT_TOKEN" --scopes ...`.

OAuth with `--client-id` and `--client-secret` is only for development and self-hosted setups.

## Skill

```bash
npx skills add Newbie012/agent-slack --skill agent-slack
```

## Notes

Agent Slack respects Slack permissions: it only returns data allowed by the active token, scopes, channel membership, workspace policy, and Slack plan.

Project docs live in `.agents/`.

## License

MIT

## Sponsors

<p align="center">
	<a href="https://github.com/sponsors/Newbie012">
		<img src="https://cdn.jsdelivr.net/gh/newbie012/sponsors/sponsors.svg">
	</a>
</p>
