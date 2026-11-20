import type { PublicConfig } from "@eneredge/api";
import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { apiErrorFrom } from "@/lib/api-error";

/** How this system is set up, as far as anyone may know — e.g. whether sign-up is by invitation. */
export function usePublicConfig(): UseQueryResult<PublicConfig> {
  return useQuery({
    queryKey: ["config"],
    queryFn: async () => {
      const response = await api.config.$get();
      if (!response.ok) throw await apiErrorFrom(response);
      return response.json();
    },
    // It only changes when the server is set up differently.
    staleTime: Number.POSITIVE_INFINITY,
  });
}
