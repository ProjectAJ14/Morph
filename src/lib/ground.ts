/**
 * The ground — Morph's one theme switch.
 *
 * `data-mode` on <html> is `ink` (default) or `paper`; styles/tokens.css
 * redefines the same role tokens under each. Custom properties inherit, so
 * setting that one attribute re-resolves every colour in the tree. Nothing
 * else in the app needs to know a theme exists.
 *
 * Ink is the default and an absent choice stays ink — deliberately not the
 * OS setting. Morph sits next to a terminal and the dark ground is the
 * product.
 */

export type Ground = "ink" | "paper";

const KEY = "morph-ground";

export function readGround(): Ground {
  try {
    return localStorage.getItem(KEY) === "paper" ? "paper" : "ink";
  } catch {
    return "ink"; // private mode / blocked storage — ink is the default anyway
  }
}

export function applyGround(mode: Ground): void {
  const root = document.documentElement;
  root.setAttribute("data-mode", mode);
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* the ground still applies for this session */
  }

  // The native window frame can't read CSS, so hand it the *resolved* --bg
  // rather than keeping a second copy of the hex in sync by hand.
  // Optional-chained: the renderer also runs in a plain browser during dev,
  // where there is no bridge and no native frame to tint.
  const bg = getComputedStyle(root).getPropertyValue("--bg").trim();
  if (bg) void window.morph?.setWindowBackground?.(bg);
}
