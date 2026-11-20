import type { Context } from "hono";

/** The API answers errors with a code; the web app owns the wording (i18n/hu.ts). */
export type ApiErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "validation"
  | "name_taken"
  | "park_limit_reached"
  | "internal";

export type FieldErrorCode = "required" | "too_long" | "out_of_range" | "invalid";

export type ApiErrorBody = { error: ApiErrorCode; fields?: Record<string, FieldErrorCode> };

export function apiError(
  c: Context,
  status: 400 | 401 | 403 | 404 | 409 | 500,
  code: ApiErrorCode,
  fields?: Record<string, FieldErrorCode>,
): Response {
  const body: ApiErrorBody = fields ? { error: code, fields } : { error: code };
  return c.json(body, status);
}
