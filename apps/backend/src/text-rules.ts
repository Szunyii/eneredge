import { z } from "zod";

// Rules for text that people type and the platform stores, shows and puts into mails.

/** Tabs, line breaks, NUL and the like. PostgreSQL cannot even store a NUL. */
export function hasControlCharacter(text: string): boolean {
  return [...text].some((character) => {
    const code = character.charCodeAt(0);
    return code < 0x20 || code === 0x7f;
  });
}

/**
 * A name or title: trimmed, not empty, at most `maxLength` characters, one line.
 * The findings map to the field codes `required`, `too_long` and `invalid`.
 */
export function singleLineText(maxLength: number) {
  return z
    .string()
    .trim()
    .min(1)
    .max(maxLength)
    .refine((text) => !hasControlCharacter(text));
}

/** The name of a person or a company, as pages and mails show it. */
export const displayName = singleLineText(100);

/** Whether a text can be stored as a display name exactly as it was given. */
export function isDisplayName(text: unknown): boolean {
  const checked = displayName.safeParse(text);
  return checked.success && checked.data === text;
}

/** An e-mail address, stored and compared lower-case. */
export const emailAddress = z.string().trim().toLowerCase().pipe(z.email());

// Only used to check where a path leads; nothing is ever sent to it.
const PLACEHOLDER_ORIGIN = "https://app.invalid";

/**
 * Whether a text is the address of a page inside the web app ("/o/acme/parks"),
 * safe to put into a link: it cannot lead to another site. The web app applies
 * the same rule to where it navigates (apps/frontend/src/lib/navigation.ts).
 */
export function isLocalPath(text: string): boolean {
  // "//host" names another site; browsers read a backslash as a slash and drop
  // control characters, so "/\host" and "/<tab>/host" would arrive there too.
  if (!text.startsWith("/") || text.startsWith("//")) return false;
  if (hasControlCharacter(text) || text.includes("\\")) return false;
  if (!URL.canParse(text, PLACEHOLDER_ORIGIN)) return false;
  return new URL(text, PLACEHOLDER_ORIGIN).origin === PLACEHOLDER_ORIGIN;
}

/** A local path as a request field. */
export const localPath = z.string().max(300).refine(isLocalPath);

/** The shape of the identifiers the auth library gives to companies and users. */
export function isOpaqueId(text: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(text);
}
