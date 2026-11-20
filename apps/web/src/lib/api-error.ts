import type { ApiErrorBody, ApiErrorCode, FieldErrorCode } from "@eneredge/api";

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
