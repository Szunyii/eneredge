"use client";

import { AllowlistCard } from "@/components/allowlist-card";
import { AppShell } from "@/components/app-shell";
import { CompanyLimitsCard } from "@/components/company-limits-card";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/page-header";
import { RequireAuth, useCurrentUser } from "@/components/require-auth";
import { hu } from "@/i18n/hu";

export default function AdminPage() {
  return (
    <RequireAuth>
      <PlatformAdminOnly />
    </RequireAuth>
  );
}

/**
 * What the platform's own admins do: decide who may sign up, and how many parks a
 * company may have. Anyone else sees the same page as for an unknown address;
 * the API refuses them independently of this.
 */
function PlatformAdminOnly() {
  const me = useCurrentUser();
  if (!me.user.isPlatformAdmin) return <NoAccess />;

  return (
    <AppShell organizationSlug={me.organizations[0]?.slug}>
      <div className="mx-auto max-w-3xl">
        <PageHeader title={hu.admin.title} />
        <div className="flex flex-col gap-6">
          <AllowlistCard />
          <CompanyLimitsCard />
        </div>
      </div>
    </AppShell>
  );
}
