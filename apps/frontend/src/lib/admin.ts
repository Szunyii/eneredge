import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { apiErrorFrom } from "@/lib/api-error";

// What only a platform admin can see and do. The API refuses everyone else.

const allowlistQueryKey = ["admin", "signup-allowlist"] as const;
const companiesQueryKey = ["admin", "companies"] as const;

/** The addresses that may sign up while registration is by invitation only. */
export function useSignupAllowlist() {
  return useQuery({
    queryKey: allowlistQueryKey,
    queryFn: async () => {
      const response = await api.admin["signup-allowlist"].$get();
      if (!response.ok) throw await apiErrorFrom(response);
      return (await response.json()).emails;
    },
  });
}

export function useAllowEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email: string): Promise<string> => {
      const response = await api.admin["signup-allowlist"].$post({ json: { email } });
      if (!response.ok) throw await apiErrorFrom(response);
      return (await response.json()).email;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: allowlistQueryKey }),
  });
}

export function useRemoveAllowedEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email: string): Promise<void> => {
      const response = await api.admin["signup-allowlist"][":email"].$delete({ param: { email } });
      if (!response.ok) throw await apiErrorFrom(response);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: allowlistQueryKey }),
  });
}

/** Every company with its number of parks and its park limit. */
export function useCompanies() {
  return useQuery({
    queryKey: companiesQueryKey,
    queryFn: async () => {
      const response = await api.admin.orgs.$get();
      if (!response.ok) throw await apiErrorFrom(response);
      return (await response.json()).organizations;
    },
  });
}

export function useSetParkLimit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (change: { organizationId: string; parkLimit: number }): Promise<void> => {
      const response = await api.admin.orgs[":orgId"].$patch({
        param: { orgId: change.organizationId },
        json: { parkLimit: change.parkLimit },
      });
      if (!response.ok) throw await apiErrorFrom(response);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companiesQueryKey }),
  });
}
