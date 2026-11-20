import { zValidator } from "@hono/zod-validator";
import type { z } from "zod";
import { apiError, type FieldErrorCode } from "./errors.ts";

/**
 * Middleware that checks the JSON body of a request against a schema. The handler
 * reads the checked value with `context.req.valid("json")`, and the web app's
 * typed client learns from it what the route accepts. A faulty body is answered
 * here with a 400 and one code per faulty field; the handler never sees it.
 */
export function jsonBody<Schema extends z.ZodType>(schema: Schema) {
  return zValidator("json", schema, (result, context) => {
    if (result.success) return;
    const fields = fieldErrors(result.error.issues, result.data);
    const hasFieldErrors = Object.keys(fields).length > 0;
    return apiError(context, 400, "validation", hasFieldErrors ? fields : undefined);
  });
}

/**
 * Turns the schema's findings into one code per field: the first problem of each
 * field wins. The web app owns the wording (i18n/hu.ts → fieldErrors).
 */
export function fieldErrors(
  issues: readonly z.core.$ZodIssue[],
  input: unknown,
): Record<string, FieldErrorCode> {
  const errors: Record<string, FieldErrorCode> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field !== "string" || field in errors) continue;
    errors[field] = fieldErrorCode(issue, fieldValue(input, field));
  }
  return errors;
}

function fieldErrorCode(issue: z.core.$ZodIssue, value: unknown): FieldErrorCode {
  if (value === undefined || value === null) return "required";

  if (issue.code === "too_small" || issue.code === "too_big") {
    if (issue.origin !== "string") return "out_of_range";
    if (issue.code === "too_big") return "too_long";
    // A text shorter than one character is an empty field.
    return issue.minimum === 1 ? "required" : "invalid";
  }
  return "invalid";
}

function fieldValue(input: unknown, field: string): unknown {
  return typeof input === "object" && input !== null
    ? (input as Record<string, unknown>)[field]
    : undefined;
}
