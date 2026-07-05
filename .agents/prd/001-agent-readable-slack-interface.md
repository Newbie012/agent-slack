# PRD-001 - Agent-Readable Slack Interface

> `agent-slack` gives humans and agents a reliable way to authenticate to Slack and retrieve permitted Slack context.

- **Status:** `accepted`
- **Last updated:** 2026-07-05

## User Problem

Agents need Slack context to answer questions about threads, channels, files, and workspace activity, but Slack's raw web interface is not a stable tool surface. Human operators also need to know what the agent can access and why a request failed.

## Interface Behavior

The CLI lets a human operator authenticate a named Slack profile, inspect the profile's workspace and granted scopes, and remove that profile later.

The CLI lets an agent retrieve Slack data through resource-oriented commands: conversations, threads, messages, users, files, reactions, pins, bookmarks, and search/context results. Results are returned as structured data, normalized to a compact, agent-readable shape so an agent spends its context on content rather than Slack boilerplate. Large result sets are streamable record-by-record.

The CLI includes a generic Slack Web API escape hatch so agents can call newly available Slack read methods before a convenience command exists. The CLI blocks known unsafe write or destructive calls unless the operator opts in explicitly.

## User Stories

1. As a human operator, I want to log in with Slack OAuth and name the profile, so agents can use the right workspace context.
2. As an agent, I want to read a Slack thread by channel and timestamp, so I can answer questions with the full conversation.
3. As an agent, I want a channel-context command, so I can prepare compact input for summarization.
4. As an agent, I want structured errors for missing scopes or rate limits, so I can stop, retry, or ask for operator help.
5. As a human operator, I want auth status and scope inspection, so I can understand what the CLI is allowed to read.
6. As a security reviewer, I want the CLI to refuse unsafe calls by default, so an agent cannot accidentally mutate Slack.

## Product Contract

The CLI accepts a named profile and Slack resource identifiers such as channel IDs, timestamps, user IDs, file IDs, and search queries.

The CLI returns stable structured output for successful reads and stable structured errors for failures. It keeps data output separate from diagnostic output.

Read output is token-efficient by default: commands return normalized shapes carrying the reasoning-relevant fields, and machine output is serialized compactly. `--pretty` restores indentation for humans; `--full` returns the raw Slack objects for the rare case that needs them.

The CLI refuses to imply access Slack has not granted. Missing scopes, invalid auth, inaccessible conversations, not-found resources, and rate limits are visible outcomes. When a scope the token lacks would make a result more complete or efficient, the CLI reports it as a warning rather than failing silently.

The technical command, flag, schema, and exit-code details live in `../cli-api.md`.

## Testing Decisions

Verification must use public interfaces:

- CLI black-box tests for stdout, stderr, exit codes, stdin payloads, and JSON/NDJSON parsing.
- Emulate-backed tests for OAuth, auth.test, conversations, messages, threads, users, files, reactions, pins, and bookmarks.
- Fake Effect-layer tests for exact rate limits, retries, unsupported Slack surfaces, unsafe write blocking, and malformed upstream responses.

Tests follow `../testing.md`.

## Security Impact

- **Attack surface introduced:** OAuth token handling, local profile storage, Slack Web API calls, file downloads, and generic API method calls.
- **Poisoning vectors:** Slack message text, file metadata, user profile fields, channel names/topics, search results, and API error bodies.
- **Least-privilege guardrails:** named profiles, token type selection, missing-scope reporting, write blocking by default, no token files in the project, bounded context output.
- **Red-team coverage:** malicious Slack content must remain data, not become CLI instructions; unsafe API calls must be refused without explicit operator opt-in.

## Out of Scope

- Summarizing Slack content. Agents can summarize returned context.
- Bypassing Slack scopes, channel membership, or admin policy.
- Full write automation.
- Live Slack CI tests.

## Further Notes

The CLI is designed for internal and agentic use first. Marketplace distribution constraints and commercial Slack app policies must be revisited before external distribution.
