import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { refreshSession } from "@/lib/session";

// A company's own data — its name, members and invitations — lives in the auth
// library. Every call names the company: the address decides which one is meant,
// never a "currently active" company remembered by the session.

export type MemberRole = "owner" | "admin" | "member";

/** The auth library answered with an error; `code` is its own error code. */
export class OrganizationError extends Error {
  override name = "OrganizationError";

  constructor(readonly code: string | undefined) {
    super(`The organization request failed: ${code ?? "unknown"}`);
  }
}

/** Unwraps the auth client's `{ data, error }` answer into a value or a thrown error. */
function unwrapped<Data>(result: { data: Data | null; error: { code?: string } | null }): Data {
  if (result.error || result.data === null) throw new OrganizationError(result.error?.code);
  return result.data;
}

function organizationQueryKey(organizationId: string) {
  return ["organizations", organizationId, "details"] as const;
}

/** The company with its members and invitations. */
export function useOrganizationDetails(organizationId: string) {
  return useQuery({
    queryKey: organizationQueryKey(organizationId),
    queryFn: async () =>
      unwrapped(await authClient.organization.getFullOrganization({ query: { organizationId } })),
  });
}

/** Mutations below refresh the company's details once they are done. */
function useOrganizationMutation<Input, Output>(
  organizationId: string,
  mutationFn: (input: Input) => Promise<Output>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: organizationQueryKey(organizationId) }),
  });
}

export function useRenameOrganization(organizationId: string) {
  const queryClient = useQueryClient();
  return useOrganizationMutation(organizationId, async (name: string) => {
    unwrapped(await authClient.organization.update({ organizationId, data: { name } }));
    // The name also appears wherever the user's companies are listed.
    await refreshSession(queryClient);
  });
}

export function useInviteMember(organizationId: string) {
  return useOrganizationMutation(
    organizationId,
    async (invitation: { email: string; role: "admin" | "member" }) =>
      unwrapped(await authClient.organization.inviteMember({ ...invitation, organizationId })),
  );
}

export function useCancelInvitation(organizationId: string) {
  return useOrganizationMutation(organizationId, async (invitationId: string) =>
    unwrapped(await authClient.organization.cancelInvitation({ invitationId })),
  );
}

export function useUpdateMemberRole(organizationId: string) {
  return useOrganizationMutation(
    organizationId,
    async (change: { memberId: string; role: MemberRole }) =>
      unwrapped(await authClient.organization.updateMemberRole({ ...change, organizationId })),
  );
}

export function useRemoveMember(organizationId: string) {
  return useOrganizationMutation(organizationId, async (memberId: string) =>
    unwrapped(
      await authClient.organization.removeMember({ memberIdOrEmail: memberId, organizationId }),
    ),
  );
}
