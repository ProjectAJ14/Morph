/** Inline markup, on a single line of non-code text. */
function inline(text: string): string {
  return text
    // One pass, strong before emphasis, so *bold* isn't re-matched as italic.
    .replace(/(\*\*|__)(.+?)\1|(\*|_)(.+?)\3/g, (_m, _s, strong, _i, italic) =>
      strong !== undefined ? `*${strong}*` : `_${italic}_`
    )
    .replace(/~~(.+?)~~/g, "~$1~")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<$2|$1>");
}

/**
 * Markdown -> Slack mrkdwn. Slack uses *single* asterisks for bold and _underscores_
 * for italic, so standard Markdown pastes literally when Slack's rich-text paste is
 * off or the user pastes with Cmd+Shift+V. Code spans/blocks are left alone — their
 * syntax is identical in both.
 */
export function toMrkdwn(md: string): string {
  // Odd indices are the captured code spans/blocks, which must pass through untouched.
  return md
    .split(/(```[\s\S]*?```|`[^`\n]+`)/g)
    .map((part, i) => {
      if (i % 2 === 1) return part;
      return part
        .split("\n")
        .map((line) => {
          const heading = line.match(/^#{1,6}\s+(.+)$/);
          if (!heading) return inline(line);
          // Slack has no headings — a bold line is the closest thing. Inline markup
          // runs first so the heading's own asterisks are never re-read as emphasis.
          const body = inline(heading[1]);
          return /^\*[^*]+\*$/.test(body) ? body : `*${body}*`;
        })
        .join("\n");
    })
    .join("");
}

if (require.main === module) {
  const assert = require("assert") as typeof import("assert");
  const eq = (input: string, want: string) => assert.strictEqual(toMrkdwn(input), want);

  eq("**bold**", "*bold*");
  eq("__bold__", "*bold*");
  eq("*italic*", "_italic_");
  eq("_italic_", "_italic_");
  eq("**bold** and *italic*", "*bold* and _italic_");
  eq("~~gone~~", "~gone~");
  eq("# Heading", "*Heading*");
  eq("### Deep heading", "*Deep heading*");
  eq("## **Already bold**", "*Already bold*"); // not double-wrapped
  eq("[docs](https://x.com)", "<https://x.com|docs>");
  // Code must survive verbatim — asterisks and underscores inside it are code, not markup.
  eq("`a**b**c`", "`a**b**c`");
  eq("```\nx = **y**\n```", "```\nx = **y**\n```");
  eq("```\n# not a heading\n```", "```\n# not a heading\n```");
  eq("**bold** then `**code**` then *it*", "*bold* then `**code**` then _it_");
  // Bullets and numbering are the same in both dialects.
  eq("- one\n- two", "- one\n- two");
  eq("1. first\n2. second", "1. first\n2. second");
  // A heading followed by body text keeps both.
  eq("# Title\n\nsome **text**", "*Title*\n\nsome *text*");

  console.log("mrkdwn: all assertions passed");
}
