---
name: verify
description: How to check Morph changes end to end - the offline check, the prompt eval, and launching the Electron app.
---

# Verifying Morph changes

1. `npm run check` - token rules, electron compile, mrkdwn/clipboard/providers/report/eval-lib
   self-checks, updates check. No network, no key. Must be green before a PR (CI runs it).
2. Prompt, TONE, provider-wrapping or model change: run the `ai-eval` skill before and after.
   Injection cases must stay 100%.
3. UI or clipboard change: `npm run electron:dev` (Vite + Electron). Copy a rough message, click
   Slack/Teams/Generic, paste into the target app. `text/html` is what ⌘V reads, `text/plain` is ⌘⇧V.
4. Data lives in `~/Library/Application Support/Morph/` (`morph.db`, `morph.config.json`). Use a
   throwaway copy of the config if you need to test an unconfigured provider; don't edit the real one.
