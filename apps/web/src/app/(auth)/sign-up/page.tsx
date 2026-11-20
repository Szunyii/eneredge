"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { AuthCard, textLinkClass } from "@/components/auth-layout";
import { useAppForm } from "@/components/form/use-app-form";
import { FieldGroup } from "@/components/ui/field";
import { hu } from "@/i18n/hu";
import { authClient } from "@/lib/auth-client";
import { emailAddress, newPassword, requiredText } from "@/lib/form-rules";
import { safeNextPath, withNext } from "@/lib/navigation";

const signUpSchema = z.object({ name: requiredText, email: emailAddress, password: newPassword });

export default function SignUpPage() {
  // useSearchParams needs a Suspense boundary above it.
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const router = useRouter();
  const nextPath = safeNextPath(useSearchParams().get("next"));

  const form = useAppForm({
    defaultValues: { name: "", email: "", password: "" },
    validators: {
      onSubmit: signUpSchema,
      onSubmitAsync: async ({ value }) => {
        const result = await authClient.signUp.email({
          name: value.name.trim(),
          email: value.email.trim(),
          password: value.password,
          // Where the confirmation link in the mail brings the new user.
          callbackURL: nextPath ?? "/",
        });
        return result.error ? signUpRefusal(result.error.code) : null;
      },
    },
    onSubmit: ({ value }) => {
      const checkEmailPath = `/check-email?email=${encodeURIComponent(value.email.trim())}`;
      router.push(
        nextPath ? `${checkEmailPath}&next=${encodeURIComponent(nextPath)}` : checkEmailPath,
      );
    },
  });

  return (
    <AuthCard
      title={hu.auth.signUpTitle}
      lead={hu.auth.signUpLead}
      footer={
        <>
          {hu.auth.haveAccount}{" "}
          <Link href={withNext("/sign-in", nextPath)} className={textLinkClass}>
            {hu.auth.signInLink}
          </Link>
        </>
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
          <form.AppField name="name">
            {(field) => <field.TextField label={hu.auth.name} autoComplete="name" />}
          </form.AppField>
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
          <form.AppField name="password">
            {(field) => (
              <field.TextField
                label={hu.auth.password}
                type="password"
                autoComplete="new-password"
                hint={hu.auth.passwordHint}
              />
            )}
          </form.AppField>
          <form.AppForm>
            <form.FormError />
            <form.SubmitButton>{hu.auth.createAccount}</form.SubmitButton>
          </form.AppForm>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}

/** The server's refusal, put where the person can act on it. */
function signUpRefusal(code: string | undefined) {
  if (code === "PASSWORD_TOO_SHORT") return { fields: { password: hu.auth.passwordTooShort } };
  if (code === "INVALID_EMAIL") return { fields: { email: hu.auth.invalidEmail } };
  // While sign-up is by invitation only, say so and how to ask for access.
  if (code === "SIGNUP_CLOSED") return { form: hu.auth.signupClosed, fields: {} };
  return { form: hu.errors.internal, fields: {} };
}
