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

/**
 * Answers a request with an error. The answer keeps its status and shape in its
 * type, so the web app's typed client knows which refusals a route can give.
 */
export function apiError<Status extends 400 | 401 | 403 | 404 | 409 | 500>(
  context: Context,
  status: Status,
  code: ApiErrorCode,
  fields?: Record<string, FieldErrorCode>,
) {
  const body: ApiErrorBody = fields ? { error: code, fields } : { error: code };
  return context.json(body, status);
}
