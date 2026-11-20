"use client";

import { CompanyNameForm } from "@/components/company-name-form";
import { InviteForm } from "@/components/invite-form";
import { LoadError } from "@/components/load-error";
import { MembersTable } from "@/components/members-table";
import { useCurrentOrganization } from "@/components/organization-gate";
import { PageHeader } from "@/components/page-header";
import { PendingInvitations } from "@/components/pending-invitations";
import { SectionCard } from "@/components/section-card";
import { hu } from "@/i18n/hu";
import { useOrganizationDetails } from "@/lib/organization";

/** The company itself: its name, who belongs to it, and who has been invited. */
export default function SettingsPage() {
  const organization = useCurrentOrganization();
  const details = useOrganizationDetails(organization.id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={hu.settings.title}
        lead={organization.canManage ? undefined : hu.settings.readOnly}
      />
      <div className="flex flex-col gap-6">
        {organization.canManage ? (
          <SectionCard title={hu.settings.companyTitle}>
            <CompanyNameForm organization={organization} />
          </SectionCard>
        ) : null}

        <SectionCard title={hu.settings.membersTitle}>
          {details.isError ? <LoadError onRetry={() => details.refetch()} /> : null}
          {details.data ? (
            <MembersTable organization={organization} members={details.data.members} />
          ) : null}
        </SectionCard>

        <SectionCard title={hu.settings.invitationsTitle} lead={hu.settings.invitationsLead}>
          <div className="flex flex-col gap-6">
            {organization.canManage ? <InviteForm organization={organization} /> : null}
            {details.data ? (
              <PendingInvitations
                organization={organization}
                invitations={details.data.invitations}
              />
            ) : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
