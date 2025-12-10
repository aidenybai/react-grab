---
"@react-grab/claude-code": patch
---

fix: replace cross-spawn with native node:child_process to fix Node.js v24 compatibility

The CLI was failing on Node.js v24 with "Dynamic require of child_process is not supported" because cross-spawn uses dynamic require() for native modules. Replacing it with the native node:child_process module resolves this issue.
