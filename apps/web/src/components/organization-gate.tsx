"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { NoAccess } from "@/components/no-access";
import { useCurrentUser } from "@/components/require-auth";

/** Lets the pages of a company through only for its members. */
export function OrganizationGate({ orgSlug, children }: { orgSlug: string; children: ReactNode }) {
  const me = useCurrentUser();
  const isMember = me.organizations.some((organization) => organization.slug === orgSlug);
  if (!isMember) return <NoAccess />;

  return <AppShell orgSlug={orgSlug}>{children}</AppShell>;
}
