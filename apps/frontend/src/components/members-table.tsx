"use client";

import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { CurrentOrganization } from "@/components/organization-gate";
import { useCurrentUser } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hu } from "@/i18n/hu";
import { type MemberRole, useRemoveMember, useUpdateMemberRole } from "@/lib/organization";

export type Member = {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
};

type MembersTableProps = {
  organization: CurrentOrganization;
  members: Member[];
};

/** Who belongs to the company and in which role. Managers can change roles and remove people. */
export function MembersTable({ organization, members }: MembersTableProps) {
  const me = useCurrentUser();
  const updateRole = useUpdateMemberRole(organization.id);
  const removeMember = useRemoveMember(organization.id);

  /** A manager may change anyone but themselves; an owner's fate is another owner's to decide. */
  function canChange(member: Member): boolean {
    if (!organization.canManage || member.user.id === me.user.id) return false;
    return member.role !== "owner" || organization.role === "owner";
  }

  async function changeRole(member: Member, role: MemberRole) {
    try {
      await updateRole.mutateAsync({ memberId: member.id, role });
      toast.success(hu.settings.roleSaved);
    } catch {
      toast.error(hu.settings.lastOwner);
    }
  }

  async function remove(member: Member) {
    try {
      await removeMember.mutateAsync(member.id);
      toast.success(hu.settings.removed(member.user.name));
    } catch {
      toast.error(hu.settings.lastOwner);
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{hu.settings.member}</TableHead>
          <TableHead>{hu.settings.role}</TableHead>
          <TableHead className="w-0" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell>
              <div className="font-medium">
                {member.user.name}
                {member.user.id === me.user.id ? (
                  <span className="ml-2 font-normal text-ink-muted">({hu.settings.you})</span>
                ) : null}
              </div>
              <div className="break-all text-ink-muted">{member.user.email}</div>
            </TableCell>
            <TableCell>
              {canChange(member) ? (
                <div className="w-40">
                  <NativeSelect
                    aria-label={hu.settings.roleOf(member.user.name)}
                    value={member.role}
                    onChange={(event) => changeRole(member, event.target.value as MemberRole)}
                  >
                    {assignableRoles(organization.role).map((role) => (
                      <NativeSelectOption key={role} value={role}>
                        {hu.settings.roles[role]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
              ) : (
                roleLabel(member.role)
              )}
            </TableCell>
            <TableCell className="text-right">
              {canChange(member) ? (
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={hu.settings.removeOf(member.user.name)}
                    >
                      {hu.settings.remove}
                    </Button>
                  }
                  title={hu.settings.removeQuestion(member.user.name)}
                  description={hu.settings.removeWarning}
                  confirmLabel={hu.settings.confirmRemove}
                  cancelLabel={hu.common.cancel}
                  onConfirm={() => remove(member)}
                />
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Only an owner can make someone else an owner. */
function assignableRoles(myRole: MemberRole): MemberRole[] {
  return myRole === "owner" ? ["owner", "admin", "member"] : ["admin", "member"];
}

function roleLabel(role: string): string {
  return role in hu.settings.roles ? hu.settings.roles[role as MemberRole] : role;
}
