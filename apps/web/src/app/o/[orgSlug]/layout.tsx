import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";

type OrganizationLayoutProps = {
  children: ReactNode;
  params: Promise<{ orgSlug: string }>;
};

/** Every page of a company shares the same frame; the company comes from the address. */
export default async function OrganizationLayout({ children, params }: OrganizationLayoutProps) {
  const { orgSlug } = await params;
  return <AppShell orgSlug={orgSlug}>{children}</AppShell>;
}
