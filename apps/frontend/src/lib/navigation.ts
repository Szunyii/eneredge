// Only used to check where an address leads; nothing is ever sent to it.
const PLACEHOLDER_ORIGIN = "https://app.invalid";

/**
 * The `next` parameter says where to go after signing in. Only an address inside
 * this app is accepted — anything that could lead to another site is refused:
 *
 * - it must start with a single slash ("//evil.example" names another host);
 * - no backslash, which browsers read as a slash;
 * - no tab, line break or other control character, which browsers drop from an
 *   address — "/<tab>/evil.example" would arrive as "//evil.example".
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next?.startsWith("/") || next.startsWith("//")) return null;
  if (hasControlCharacter(next) || next.includes("\\")) return null;
  // And however it is spelled, it must still resolve to this site.
  if (!URL.canParse(next, PLACEHOLDER_ORIGIN)) return null;
  return new URL(next, PLACEHOLDER_ORIGIN).origin === PLACEHOLDER_ORIGIN ? next : null;
}

function hasControlCharacter(text: string): boolean {
  return [...text].some((character) => {
    const code = character.charCodeAt(0);
    return code < 0x20 || code === 0x7f;
  });
}

/** The address of a page with `next` attached, when there is somewhere to return to. */
export function withNext(path: string, next: string | null): string {
  if (!next) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}next=${encodeURIComponent(next)}`;
}
