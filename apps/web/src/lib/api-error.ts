import type { ApiErrorBody, ApiErrorCode, FieldErrorCode } from "@eneredge/api";
import { hu } from "@/i18n/hu";

/** A refusal from the backend: a code, and for faulty input one code per field. */
export class ApiError extends Error {
  override name = "ApiError";

  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    readonly fields: Record<string, FieldErrorCode> = {},
  ) {
    super(`The API answered ${status} ${code}`);
  }
}

/** Reads the error body of a response that was not ok. */
export async function apiErrorFrom(response: {
  status: number;
  json(): Promise<unknown>;
}): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
  return new ApiError(response.status, body?.error ?? "internal", body?.fields);
}

/** What a form shows after a refused request: a message for the form, or one per field. */
export type FormRefusal = { form?: string; fields: Record<string, string> };

/**
 * Turns a failed request into what the form shows, in Hungarian. Faulty fields get
 * their message under the field; everything else becomes the form's message.
 */
export function refusalFrom(error: unknown): FormRefusal {
  if (!(error instanceof ApiError)) return { form: hu.errors.internal, fields: {} };

  const fieldMessages = Object.entries(error.fields).map(
    ([field, code]) => [field, hu.fieldErrors[code]] as const,
  );
  if (fieldMessages.length > 0) return { fields: Object.fromEntries(fieldMessages) };
  return { form: hu.errors[error.code], fields: {} };
}
