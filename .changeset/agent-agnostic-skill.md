---
"@eliya-oss/agent-slack": patch
---

Make the bundled agent-slack skill agent-agnostic. The skill description no longer names a specific agent and instead lists the Slack contexts that should trigger it (reading or summarizing a thread or channel, finding a message, checking membership, pulling Slack context), which improves how reliably any agent picks it up. Also dropped a local-repo dev note that was noise for installed users.
