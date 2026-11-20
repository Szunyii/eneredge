"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { z } from "zod";
import { AuthCard, textLinkClass } from "@/components/auth-layout";
import { useAppForm } from "@/components/form/use-app-form";
import { FormMessage } from "@/components/form-message";
import { FieldGroup } from "@/components/ui/field";
import { hu } from "@/i18n/hu";
import { authClient } from "@/lib/auth-client";
import { newPassword } from "@/lib/form-rules";

const resetPasswordSchema = z.object({ newPassword });

export default function ResetPasswordPage() {
  // useSearchParams needs a Suspense boundary above it.
  return (
    <Suspense>
      <ResetPassword />
    </Suspense>
  );
}

/** The page the link in the password mail opens: the token in the address proves who asks. */
function ResetPassword() {
  const token = useSearchParams().get("token");
  const [isLinkInvalid, setIsLinkInvalid] = useState(token === null);

  if (!token || isLinkInvalid) {
    return (
      <AuthCard title={hu.auth.resetTitle}>
        <div className="flex flex-col gap-4">
          <FormMessage tone="error">{hu.auth.resetLinkInvalid}</FormMessage>
          <Link href="/forgot-password" className={`${textLinkClass} self-start`}>
            {hu.auth.requestNewLink}
          </Link>
        </div>
      </AuthCard>
    );
  }
  return <NewPasswordForm token={token} onLinkInvalid={() => setIsLinkInvalid(true)} />;
}

function NewPasswordForm({ token, onLinkInvalid }: { token: string; onLinkInvalid: () => void }) {
  const router = useRouter();

  const form = useAppForm({
    defaultValues: { newPassword: "" },
    validators: {
      onSubmit: resetPasswordSchema,
      onSubmitAsync: async ({ value }) => {
        const result = await authClient.resetPassword({ newPassword: value.newPassword, token });
        if (!result.error) return null;
        if (result.error.code === "PASSWORD_TOO_SHORT") {
          return { fields: { newPassword: hu.auth.passwordTooShort } };
        }
        // Anything else means the token no longer works.
        onLinkInvalid();
        return { form: hu.auth.resetLinkInvalid, fields: {} };
      },
    },
    onSubmit: () => router.replace("/sign-in?reset=done"),
  });

  return (
    <AuthCard title={hu.auth.resetTitle}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <FieldGroup className="gap-5">
          <form.AppField name="newPassword">
            {(field) => (
              <field.TextField
                label={hu.auth.newPassword}
                type="password"
                autoComplete="new-password"
                hint={hu.auth.passwordHint}
              />
            )}
          </form.AppField>
          <form.AppForm>
            <form.SubmitButton>{hu.auth.saveNewPassword}</form.SubmitButton>
          </form.AppForm>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
