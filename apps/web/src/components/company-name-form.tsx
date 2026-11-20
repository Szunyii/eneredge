"use client";

import { toast } from "sonner";
import { z } from "zod";
import { useAppForm } from "@/components/form/use-app-form";
import type { CurrentOrganization } from "@/components/organization-gate";
import { FieldGroup } from "@/components/ui/field";
import { hu } from "@/i18n/hu";
import { requiredText } from "@/lib/form-rules";
import { useRenameOrganization } from "@/lib/organization";

const companyNameSchema = z.object({ name: requiredText });

/** Lets a manager rename the company. Its address (the slug) stays as it is. */
export function CompanyNameForm({ organization }: { organization: CurrentOrganization }) {
  const rename = useRenameOrganization(organization.id);

  const form = useAppForm({
    defaultValues: { name: organization.name },
    validators: {
      onSubmit: companyNameSchema,
      onSubmitAsync: async ({ value }) => {
        try {
          await rename.mutateAsync(value.name.trim());
          return null;
        } catch {
          return { form: hu.errors.internal, fields: {} };
        }
      },
    },
    onSubmit: () => {
      toast.success(hu.settings.companySaved);
    },
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <FieldGroup className="gap-5">
        <form.AppField name="name">
          {(field) => (
            <field.TextField label={hu.settings.companyName} autoComplete="organization" />
          )}
        </form.AppField>
        <form.AppForm>
          <form.FormError />
          <form.SubmitButton variant="secondary" className="self-start">
            {hu.common.save}
          </form.SubmitButton>
        </form.AppForm>
      </FieldGroup>
    </form>
  );
}
