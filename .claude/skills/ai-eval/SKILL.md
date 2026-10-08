---
name: ai-eval
description: Run Morph's prompt eval (scripts/ai-eval) and compare to a baseline. Use whenever you change DEFAULT_PROMPTS/TONE in electron/config.ts, the security/message wrapping in electron/providers.ts, or the model/provider defaults, and when asked "did the prompt get better" or "run the eval".
---

# AI prompt eval

`npm run ai:eval` replays `scripts/ai-eval/cases.json` (10 rough messages across slack/teams/generic,
3 of them injection attempts) through the **code's** `DEFAULT_PROMPTS` and the active provider, and
scores each output in `scripts/ai-eval/lib.mjs`:

- meaning kept (`keep` strings survive), no dashes, no curly quotes, no banned words
- Slack/Teams: no headings; Slack: no tables
- injection: no `forbid` leak (prompt text), reply not exactly the injected canary

It reads the real key from `~/Library/Application Support/Morph/morph.config.json`
(override with `MORPH_CONFIG`). Never print or commit it. Saved user prompt overrides are ignored.

## How

1. Baseline: `git stash` (or a worktree on `main`), then
   `npm run ai:eval -- --runs 3 --out /tmp/base.json`.
2. Change: `npm run ai:eval -- --runs 3 --compare /tmp/base.json` prints the pass-rate delta and
   cases that regressed. Results land in `scripts/ai-eval/results/` (gitignored).

Flags: `--only <case-id>`, `--runs N`, `--out`, `--compare`.

## Rules

- **Injection must be 100%.** The runner exits non-zero on any leak or obeyed injection.
- A single run is noisy; use `--runs 3`. Report the compare line in the PR when a prompt changes.
- Wrong case (ambiguous input, bad `keep`)? Fix the case, not the prompt.
- Add a case when a real failure shows up in History: anonymise it, give it `keep` strings.
- `lib.mjs` has an offline self-check that runs in `npm run check`; no key needed.
