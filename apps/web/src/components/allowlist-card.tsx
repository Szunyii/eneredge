"use client";

import { toast } from "sonner";
import { z } from "zod";
import { showRefusal } from "@/components/form/show-refusal";
import { useAppForm } from "@/components/form/use-app-form";
import { LoadError } from "@/components/load-error";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { hu } from "@/i18n/hu";
import { useAllowEmail, useRemoveAllowedEmail, useSignupAllowlist } from "@/lib/admin";
import { refusalFrom } from "@/lib/api-error";
import { emailAddress } from "@/lib/form-rules";

const allowEmailSchema = z.object({ email: emailAddress });

/** The addresses that may sign up while registration is by invitation only. */
export function AllowlistCard() {
  const allowlist = useSignupAllowlist();
  const removeAllowedEmail = useRemoveAllowedEmail();

  async function remove(email: string) {
    try {
      await removeAllowedEmail.mutateAsync(email);
    } catch {
      toast.error(hu.errors.internal);
    }
  }

  return (
    <SectionCard title={hu.admin.allowlistTitle} lead={hu.admin.allowlistLead}>
      <div className="flex flex-col gap-6">
        <AllowEmailForm />
        {allowlist.isError ? <LoadError onRetry={() => allowlist.refetch()} /> : null}
        {allowlist.data?.length === 0 ? (
          <p className="text-ink-muted">{hu.admin.noAllowed}</p>
        ) : null}
        {allowlist.data && allowlist.data.length > 0 ? (
          <ul className="divide-y divide-line-soft">
            {allowlist.data.map((entry) => (
              <li key={entry.email} className="flex items-center justify-between gap-4 py-2.5">
                <span className="break-all font-medium">{entry.email}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={hu.admin.removeAllowedOf(entry.email)}
                  onClick={() => remove(entry.email)}
                >
                  {hu.admin.removeAllowed}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </SectionCard>
  );
}

function AllowEmailForm() {
  const allowEmail = useAllowEmail();

  const form = useAppForm({
    defaultValues: { email: "" },
    validators: { onSubmit: allowEmailSchema },
    onSubmit: async ({ value, formApi }) => {
      try {
        const allowedEmail = await allowEmail.mutateAsync(value.email.trim());
        toast.success(hu.admin.allowed(allowedEmail));
        formApi.reset();
      } catch (error) {
        showRefusal(formApi, refusalFrom(error));
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
      className="flex flex-col gap-4"
    >
      <form.AppField name="email">
        {(field) => (
          <field.TextField
            label={hu.admin.allowEmail}
            type="email"
            autoComplete="off"
            inputMode="email"
          />
        )}
      </form.AppField>
      <form.AppForm>
        <form.FormError />
        <form.SubmitButton className="self-start">{hu.admin.allow}</form.SubmitButton>
      </form.AppForm>
    </form>
  );
}
