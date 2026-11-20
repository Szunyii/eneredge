"use client";

import { toast } from "sonner";
import { z } from "zod";
import { showRefusal } from "@/components/form/show-refusal";
import { useAppForm } from "@/components/form/use-app-form";
import type { CurrentOrganization } from "@/components/organization-gate";
import { FieldGroup } from "@/components/ui/field";
import { hu } from "@/i18n/hu";
import type { FormRefusal } from "@/lib/api-error";
import { displayName } from "@/lib/form-rules";
import { OrganizationError, useRenameOrganization } from "@/lib/organization";

const companyNameSchema = z.object({ name: displayName });

/** Lets a manager rename the company. Its address (the slug) stays as it is. */
export function CompanyNameForm({ organization }: { organization: CurrentOrganization }) {
  const rename = useRenameOrganization(organization.id);

  const form = useAppForm({
    defaultValues: { name: organization.name },
    validators: { onSubmit: companyNameSchema },
    onSubmit: async ({ value, formApi }) => {
      try {
        await rename.mutateAsync(value.name.trim());
        toast.success(hu.settings.companySaved);
      } catch (error) {
        showRefusal(formApi, renameRefusal(error));
      }
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

function renameRefusal(error: unknown): FormRefusal {
  const isNameRefused = error instanceof OrganizationError && error.code === "INVALID_NAME";
  return isNameRefused
    ? { fields: { name: hu.fieldErrors.invalid } }
    : { form: hu.errors.internal, fields: {} };
}
