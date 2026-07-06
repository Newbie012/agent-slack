# PRD-000 - Overview

> Human-readable product map for Agent Slack.

- **Status:** `accepted`
- **Last updated:** 2026-07-02

## Product Intent

Agent Slack lets a human operator authenticate to Slack and lets agents retrieve Slack context through a predictable, machine-readable command-line interface.

The CLI is read-first. Its primary job is to retrieve information the authenticated Slack token is allowed to access: workspaces, users, conversations, channel history, threads, files, reactions, pins, bookmarks, and search/context results.

## Product Principles

- The CLI respects Slack permissions. It never promises "read all Slack."
- Agents get structured output they can parse without terminal scraping.
- Humans get commands that are understandable and debuggable.
- Risky write or destructive behavior is out of scope until the read/auth surface is stable.
- Behavior is specified in PRDs before architecture and tests are changed.

## PRD Index

- `001-agent-readable-slack-interface.md` - human-facing CLI interface for auth, reading Slack context, and reliable agent output.

## Design and Verification Links

- DDD design: `../architecture.md`
- TDD/TestDriver strategy: `../testing.md`
- Technical CLI contract: `../cli-api.md`
- Implementation backlog: `../issues/BACKLOG.md`

## Security Baseline

Every PRD inherits these rules:

- Store tokens outside project files.
- Report missing scopes and permission failures explicitly.
- Separate stdout data from stderr diagnostics.
- Treat Slack content as untrusted input.
- Keep agent context bounded and inspectable.
- Treat hosted login infrastructure as untrusted (zero trust). Tokens never transit the OAuth relay, the relay holds no secrets, and a relay-free localhost login is offered. See ADR-008.
