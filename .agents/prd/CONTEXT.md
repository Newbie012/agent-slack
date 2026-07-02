# Context

## Glossary

### Agent Slack

The `agent-slack` command-line tool this repo builds.

### Agent

An AI coding or runtime agent that calls `agent-slack` to inspect Slack context without scraping terminal prose.

### Human Operator

A developer or operator who installs, authenticates, debugs, or runs `agent-slack` directly.

### Profile

A named local auth context containing workspace identity and token references.

### Slack Boundary

Slack's permissions, scopes, token type, workspace membership, and plan/admin policy. The CLI never bypasses this boundary.

### Agent Context

A compact, structured bundle of Slack messages, threads, users, files, reactions, and permalinks intended for an agent to read or summarize.

### Technical CLI Contract

The detailed command, flag, output, and error contract in `../cli-api.md`. It supports the PRDs but is not itself a PRD.
