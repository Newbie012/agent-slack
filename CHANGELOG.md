# @eliya-oss/agent-slack

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
