"use client";

import type { Me } from "@eneredge/api";
import { createContext, type ReactNode, use } from "react";
import { AppShell } from "@/components/app-shell";
import { NoAccess } from "@/components/no-access";
import { useCurrentUser } from "@/components/require-auth";

/** The company whose pages are open, and what the user may do in it. */
export type CurrentOrganization = Me["organizations"][number] & {
  /** Owners and admins change things; members only read. */
  canManage: boolean;
};

const CurrentOrganizationContext = createContext<CurrentOrganization | null>(null);

/** Lets the pages of a company through only for its members. */
export function OrganizationGate({ orgSlug, children }: { orgSlug: string; children: ReactNode }) {
  const me = useCurrentUser();
  const membership = me.organizations.find((organization) => organization.slug === orgSlug);
  if (!membership) return <NoAccess />;

  const organization = { ...membership, canManage: membership.role !== "member" };
  return (
    <CurrentOrganizationContext value={organization}>
      <AppShell organizationSlug={orgSlug}>{children}</AppShell>
    </CurrentOrganizationContext>
  );
}

/** The company of the current address, for anything rendered under /o/[orgSlug]. */
export function useCurrentOrganization(): CurrentOrganization {
  const organization = use(CurrentOrganizationContext);
  if (!organization) {
    throw new Error("useCurrentOrganization must be used under the pages of a company.");
  }
  return organization;
}
