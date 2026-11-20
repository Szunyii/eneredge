/**
 * The `next` parameter says where to go after signing in. Only an address inside
 * this app is accepted: a single leading slash, so "//evil.example" and
 * "https://evil.example" are both refused.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next?.startsWith("/")) return null;
  if (next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

/** The address of a page with `next` attached, when there is somewhere to return to. */
export function withNext(path: string, next: string | null): string {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}
