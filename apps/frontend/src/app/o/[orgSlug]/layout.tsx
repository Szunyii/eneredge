import type { ReactNode } from "react";
import { OrganizationGate } from "@/components/organization-gate";
import { RequireAuth } from "@/components/require-auth";

type OrganizationLayoutProps = {
  children: ReactNode;
  params: Promise<{ orgSlug: string }>;
};

/** Every page of a company shares the same frame; the company comes from the address. */
export default async function OrganizationLayout({ children, params }: OrganizationLayoutProps) {
  const { orgSlug } = await params;
  return (
    <RequireAuth>
      <OrganizationGate orgSlug={orgSlug}>{children}</OrganizationGate>
    </RequireAuth>
  );
}
