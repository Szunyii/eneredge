"use client";

import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { AuthCard, textLinkClass } from "@/components/auth-layout";
import { useAppForm } from "@/components/form/use-app-form";
import { FormMessage } from "@/components/form-message";
import { FieldGroup } from "@/components/ui/field";
import { hu } from "@/i18n/hu";
import { authClient } from "@/lib/auth-client";
import { emailAddress } from "@/lib/form-rules";

const forgotPasswordSchema = z.object({ email: emailAddress });

export default function ForgotPasswordPage() {
  const [wasSent, setWasSent] = useState(false);

  const form = useAppForm({
    defaultValues: { email: "" },
    validators: { onSubmit: forgotPasswordSchema },
    onSubmit: async ({ value }) => {
      await authClient.requestPasswordReset({ email: value.email.trim() });
      // The same answer for every address: whether it has an account is not ours to tell.
      setWasSent(true);
    },
  });

  return (
    <AuthCard
      title={hu.auth.forgotTitle}
      lead={hu.auth.forgotLead}
      footer={
        <Link href="/sign-in" className={textLinkClass}>
          {hu.auth.backToSignIn}
        </Link>
      }
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <FieldGroup className="gap-5">
          <form.AppField name="email">
            {(field) => (
              <field.TextField
                label={hu.auth.email}
                type="email"
                autoComplete="email"
                inputMode="email"
              />
            )}
          </form.AppField>
          {wasSent ? <FormMessage tone="notice">{hu.auth.resetLinkSent}</FormMessage> : null}
          <form.AppForm>
            <form.SubmitButton>{hu.auth.sendResetLink}</form.SubmitButton>
          </form.AppForm>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
