import type { Me } from "@eneredge/backend";
import { type QueryClient, type UseQueryResult, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { apiErrorFrom } from "@/lib/api-error";

const meQueryKey = ["me"] as const;

/** The signed-in user with their companies; `null` when nobody is signed in. */
export function useMe(): UseQueryResult<Me | null> {
  return useQuery({ queryKey: meQueryKey, queryFn: fetchMe });
}

/**
 * Asks the server again who is signed in, and waits for the answer. Call it after
 * anything that changes the answer — signing in or out, creating or joining a
 * company — and before navigating on: the next page must not act on the old one.
 */
export async function refreshSession(queryClient: QueryClient): Promise<Me | null> {
  return queryClient.fetchQuery({ queryKey: meQueryKey, queryFn: fetchMe, staleTime: 0 });
}

async function fetchMe(): Promise<Me | null> {
  const response = await api.me.$get();
  // The typed client only knows the successful answer; the session check answers 401 before it.
  const status: number = response.status;
  if (status === 401) return null;
  if (!response.ok) throw await apiErrorFrom(response);
  return (await response.json()) as Me;
}
