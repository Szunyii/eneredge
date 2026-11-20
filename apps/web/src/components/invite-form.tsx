"use client";

import { toast } from "sonner";
import { z } from "zod";
import { useAppForm } from "@/components/form/use-app-form";
import type { CurrentOrganization } from "@/components/organization-gate";
import { hu } from "@/i18n/hu";
import { emailAddress } from "@/lib/form-rules";
import { OrganizationError, useInviteMember } from "@/lib/organization";

const invitationSchema = z.object({ email: emailAddress, role: z.enum(["member", "admin"]) });

const roleOptions = [
  { value: "member", label: hu.settings.roles.member },
  { value: "admin", label: hu.settings.roles.admin },
] as const;

/** Invites a colleague by e-mail, as a member or as an admin. */
export function InviteForm({ organization }: { organization: CurrentOrganization }) {
  const invite = useInviteMember(organization.id);

  const form = useAppForm({
    defaultValues: { email: "", role: "member" as "member" | "admin" },
    validators: {
      onSubmit: invitationSchema,
      onSubmitAsync: async ({ value }) => {
        try {
          await invite.mutateAsync({ email: value.email.trim(), role: value.role });
          return null;
        } catch (error) {
          const isAlreadyMember =
            error instanceof OrganizationError &&
            error.code === "USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION";
          return isAlreadyMember
            ? { fields: { email: hu.settings.alreadyMember } }
            : { form: hu.errors.internal, fields: {} };
        }
      },
    },
    onSubmit: ({ value, formApi }) => {
      toast.success(hu.settings.invited(value.email.trim()));
      formApi.reset();
    },
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid items-start gap-4 sm:grid-cols-[1fr_10rem]">
        <form.AppField name="email">
          {(field) => (
            <field.TextField
              label={hu.settings.inviteEmail}
              type="email"
              autoComplete="off"
              inputMode="email"
            />
          )}
        </form.AppField>
        <form.AppField name="role">
          {(field) => <field.SelectField label={hu.settings.role} options={roleOptions} />}
        </form.AppField>
      </div>
      <form.AppForm>
        <form.FormError />
        <form.SubmitButton className="self-start">{hu.settings.invite}</form.SubmitButton>
      </form.AppForm>
    </form>
  );
}
