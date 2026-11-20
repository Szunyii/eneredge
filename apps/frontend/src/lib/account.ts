import { api } from "@/lib/api";
import { apiErrorFrom } from "@/lib/api-error";

/** What a person gives to ask for an account; `next` is where they were headed. */
export type AccountRequest = { name: string; email: string; next: string | null };

/**
 * Asks the server for an account. The answer is the same for every address —
 * what happens next arrives by mail: a link on which the password is set.
 * Throws an ApiError when the request itself is faulty.
 */
export async function requestAccount(request: AccountRequest): Promise<void> {
  const response = await api.account["sign-up"].$post({
    json: { name: request.name, email: request.email, next: request.next ?? undefined },
  });
  if (!response.ok) throw await apiErrorFrom(response);
}
