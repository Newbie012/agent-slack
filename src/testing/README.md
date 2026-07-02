# TestDriver

Fidelity:

- CLI/runtime behavior tests use `SlackCliTestDriver`.
- `driver.cli.runJson` executes the same command engine as the binary and returns stdout/stderr/exit code plus parsed envelopes.
- `driver.slack.overrideMethod` is the fake Slack boundary for deterministic tests.
- `driver.emulate.start` starts a real local Slack emulator and switches CLI calls to the Slack SDK adapter pointed at that emulator.

Rules:

- Arrange through domain sub-drivers.
- Assert in the test body.
- Use `// ARRANGE`, `// ACT`, `// ASSERT`.
- Do not construct Slack SDK DTOs in tests.
- Keep Emulate tests focused on Slack boundary fidelity; use fake Slack for exact rate limits and hard-to-seed failures.
