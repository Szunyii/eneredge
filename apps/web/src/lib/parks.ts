import type { ParkDto } from "@eneredge/api";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { apiErrorFrom } from "@/lib/api-error";

/** The cache key of a company's park list. */
export function parksQueryKey(orgSlug: string) {
  return ["organizations", orgSlug, "parks"] as const;
}

/** The parks of a company, ordered by name. */
export function useParks(orgSlug: string) {
  return useQuery({
    queryKey: parksQueryKey(orgSlug),
    queryFn: async (): Promise<ParkDto[]> => {
      const response = await api.orgs[":orgSlug"].parks.$get({ param: { orgSlug } });
      if (!response.ok) throw await apiErrorFrom(response);
      return (await response.json()).parks;
    },
  });
}
