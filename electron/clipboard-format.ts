import { clipboard } from "electron";
import MarkdownIt from "markdown-it";
import { toMrkdwn } from "./mrkdwn";
import type { Target } from "./config";

const md = new MarkdownIt({ html: false, linkify: true, breaks: false });

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
  clipboard.write({
    text: target === "slack" ? toMrkdwn(markdown) : markdown,
    html: md.render(markdown),
  });
}
