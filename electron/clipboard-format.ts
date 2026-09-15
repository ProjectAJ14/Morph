import MarkdownIt from "markdown-it";
import { toMrkdwn } from "./mrkdwn";
import type { Target } from "./config";

const md = new MarkdownIt({ html: false, linkify: true, breaks: false });

// Slack and Teams both drop CSS margins when they ingest pasted HTML, so every block
// runs straight into the next one (see the "stuck together" paste). An explicit <br>
// between top-level blocks is the only separator both clients actually honour.
const ENDS_BLOCK = /_close$|^(fence|code_block|hr|html_block)$/;
// Lists already get their own breathing room in both clients — a <br> would double it.
const SELF_SPACED = /^(bullet_list|ordered_list)_(open|close)$/;

md.core.ruler.push("block_spacing", (state) => {
  const spaced: typeof state.tokens = [];
  state.tokens.forEach((token, i) => {
    spaced.push(token);
    const next = state.tokens[i + 1];
    if (
      next &&
      token.level === 0 &&
      ENDS_BLOCK.test(token.type) &&
      !SELF_SPACED.test(token.type) &&
      !SELF_SPACED.test(next.type)
    ) {
      const br = new state.Token("html_block", "", 0);
      br.content = "<br>\n";
      spaced.push(br);
    }
  });
  state.tokens = spaced;
});

export function renderHtml(markdown: string): string {
  return md.render(markdown);
}

/**
 * Writes both clipboard flavors. Teams and Slack both prefer text/html on paste
 * (that is the only way Teams gets real tables), and fall back to text/plain when
 * the user pastes with Cmd+Shift+V or has rich-text paste disabled.
 *
 * ponytail: if the model emits a Markdown table for Slack despite the prompt, the
 * HTML <table> gets flattened by Slack. Add a table->aligned-text renderer if that
 * turns out to happen in practice.
 */
export function writeFormatted(markdown: string, target: Target): void {
  // Required lazily so the self-check below runs under plain node.
  const { clipboard } = require("electron") as typeof import("electron");
  clipboard.write({
    text: target === "slack" ? toMrkdwn(markdown) : markdown,
    html: renderHtml(markdown),
  });
}

if (require.main === module) {
  const assert: typeof import("assert") = require("assert");
  const has = (input: string, want: string) =>
    assert.ok(renderHtml(input).includes(want), `${JSON.stringify(input)} -> ${renderHtml(input)}`);
  const count = (input: string, needle: string) =>
    renderHtml(input).split(needle).length - 1;

  // Blocks get separated.
  has("one\n\ntwo", "</p>\n<br>\n<p>two</p>");
  has("**Title**\n\nbody", "</p>\n<br>\n<p>body");
  has("intro\n\n| a | b |\n| - | - |\n| 1 | 2 |", "</p>\n<br>\n<table>");
  has("intro\n\n```\ncode\n```", "</p>\n<br>\n<pre>");
  // Lists bring their own spacing — no <br> on either side of them.
  assert.strictEqual(count("intro\n\n- one\n- two", "<br>"), 0);
  assert.strictEqual(count("- one\n- two\n\noutro", "<br>"), 0);
  // No trailing separator, and nothing inserted inside a block.
  assert.strictEqual(count("only one paragraph", "<br>"), 0);
  assert.strictEqual(count("a\n\nb\n\nc", "<br>"), 2);
  // List items are nested, so they are never split apart.
  assert.strictEqual(count("- one\n- two\n- three", "<br>"), 0);

  console.log("clipboard-format: all assertions passed");
}
