---
"@eliya-oss/agent-slack": patch
---

The CLI now starts far faster. Every invocation used to load hundreds of separate module files, dominating the run time of even quick commands like `auth status`. The CLI now ships as a single bundled file, cutting cold start from over a second to about 45ms on a typical machine.

No commands or output change.
