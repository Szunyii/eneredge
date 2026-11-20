"use client";

import { toast } from "sonner";
import type { CurrentOrganization } from "@/components/organization-gate";
import { Button } from "@/components/ui/button";
import { hu } from "@/i18n/hu";
import { formatDate } from "@/lib/format";
import { type MemberRole, useCancelInvitation } from "@/lib/organization";

export type Invitation = {
  id: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: string | Date;
};

type PendingInvitationsProps = {
  organization: CurrentOrganization;
  invitations: Invitation[];
};

/** The invitations that were sent and can still be accepted. */
export function PendingInvitations({ organization, invitations }: PendingInvitationsProps) {
  const cancelInvitation = useCancelInvitation(organization.id);
  const pending = invitations.filter(
    (invitation) => invitation.status === "pending" && new Date(invitation.expiresAt) > new Date(),
  );

  async function cancel(invitation: Invitation) {
    try {
      await cancelInvitation.mutateAsync(invitation.id);
      toast.success(hu.settings.invitationCancelled);
    } catch {
      toast.error(hu.errors.internal);
    }
  }

  if (pending.length === 0) return <p className="text-ink-muted">{hu.settings.noPending}</p>;

  return (
    <ul className="divide-y divide-line-soft">
      {pending.map((invitation) => (
        <li key={invitation.id} className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <div className="break-all font-medium">{invitation.email}</div>
            <div className="text-ink-muted text-sm">
              {roleLabel(invitation.role)} · {hu.settings.expires(formatDate(invitation.expiresAt))}
            </div>
          </div>
          {organization.canManage ? (
            <Button
              variant="ghost"
              size="sm"
              aria-label={hu.settings.cancelInvitationOf(invitation.email)}
              onClick={() => cancel(invitation)}
            >
              {hu.settings.cancelInvitation}
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function roleLabel(role: string | null): string {
  return role && role in hu.settings.roles ? hu.settings.roles[role as MemberRole] : (role ?? "");
}
