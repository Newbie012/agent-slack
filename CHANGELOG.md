# @eliya-oss/agent-slack

## 0.1.8

### Patch Changes

- Keep README auth onboarding focused on browser login and clean up auth help copy.

## 0.1.7

### Patch Changes

- Polish CLI, README, bundled skill, and agent docs copy.

## 0.1.6

### Patch Changes

- Clean up the command catalog output-mode copy.

## 0.1.5

### Patch Changes

- Update the bundled Agent Slack public Client ID used by PKCE browser login.

## 0.1.4

### Patch Changes

- Add Slack PKCE browser login.

  No-flag `auth login` now uses the bundled Agent Slack public Client ID with Slack OAuth PKCE for browser login without a client secret. Token setup and OAuth with app credentials remain available for bot-token, development, and self-hosted workflows.

## 0.1.3

### Patch Changes

- Open Slack OAuth login in the default browser by default.

  Headless flows can still use `--auth-url-out PATH` or `--no-open`, and the CLI now reads its displayed version from package metadata so releases stay in sync.

## 0.1.2

### Patch Changes

- Fix the displayed CLI version and make the human command catalog copy-safe in terminals.

## 0.1.1

### Patch Changes

- Expose `agent-slack` as the primary binary, add the `aslk` alias, and render human-friendly TTY output while preserving JSON for agent and piped runs.

## 0.1.0

### Minor Changes

- Initial public release of the Slack agent CLI.
