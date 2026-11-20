import type { Context } from "hono";
import type { z } from "zod";
import { apiError, type FieldErrorCode } from "./errors.ts";

/** Either the checked value, or the 400 response to send back. */
export type Validated<Value> = { ok: true; value: Value } | { ok: false; response: Response };

/**
 * Reads the JSON body of a request and checks it against a schema. A body that is
 * not JSON, and every faulty field, becomes a 400 — never a 500.
 */
export async function validateJsonBody<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<Validated<z.output<Schema>>> {
  let body: unknown;
  try {
    body = await context.req.json();
  } catch {
    return { ok: false, response: apiError(context, 400, "validation") };
  }

  const result = schema.safeParse(body);
  if (result.success) return { ok: true, value: result.data };

  const fields = fieldErrors(result.error.issues, body);
  const hasFieldErrors = Object.keys(fields).length > 0;
  return {
    ok: false,
    response: apiError(context, 400, "validation", hasFieldErrors ? fields : undefined),
  };
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
