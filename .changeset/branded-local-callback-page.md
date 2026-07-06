---
"@eliya-oss/agent-slack": patch
---

Fix `agent-slack auth login` hanging after approval, and brand the callback page.

Previously the CLI process could hang after a successful browser login because the local callback server kept a keep-alive socket open. It now closes the connection and exits cleanly.

The page shown in the browser after approval is also branded instead of an unstyled line of text: a dark, centered page with the Agent Slack logo that blooms from grayscale to color on success (and stays grayscale on failure, with a message telling you to return to the terminal and retry). It respects `prefers-reduced-motion`.
