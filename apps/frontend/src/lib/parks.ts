import type { ParkDto } from "@eneredge/backend";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { apiErrorFrom } from "@/lib/api-error";

/** What a manager says about a park in the form. */
export type ParkValues = { name: string; latitude: number; longitude: number; timezone: string };

/** The cache key of a company's park list; a single park's key starts with it. */
function parksQueryKey(orgSlug: string) {
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

/** One park; `null` when the company has no such park. */
export function usePark(orgSlug: string, parkId: string) {
  return useQuery({
    queryKey: [...parksQueryKey(orgSlug), parkId],
    queryFn: async (): Promise<ParkDto | null> => {
      const response = await api.orgs[":orgSlug"].parks[":parkId"].$get({
        param: { orgSlug, parkId },
      });
      if (response.status === 404) return null;
      if (!response.ok) throw await apiErrorFrom(response);
      return (await response.json()).park;
    },
  });
}

/** Adds a park. Rejects with an ApiError (name_taken, park_limit_reached, validation). */
export function useCreatePark(orgSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: ParkValues): Promise<ParkDto> => {
      const response = await api.orgs[":orgSlug"].parks.$post({ param: { orgSlug }, json: values });
      if (!response.ok) throw await apiErrorFrom(response);
      return (await response.json()).park;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: parksQueryKey(orgSlug) }),
  });
}

/** Changes a park. Rejects with an ApiError (name_taken, validation, not_found). */
export function useUpdatePark(orgSlug: string, parkId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<ParkValues>): Promise<ParkDto> => {
      const response = await api.orgs[":orgSlug"].parks[":parkId"].$patch({
        param: { orgSlug, parkId },
        json: values,
      });
      if (!response.ok) throw await apiErrorFrom(response);
      return (await response.json()).park;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: parksQueryKey(orgSlug) }),
  });
}

export function useDeletePark(orgSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (parkId: string): Promise<void> => {
      const response = await api.orgs[":orgSlug"].parks[":parkId"].$delete({
        param: { orgSlug, parkId },
      });
      if (!response.ok) throw await apiErrorFrom(response);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: parksQueryKey(orgSlug) }),
  });
}
