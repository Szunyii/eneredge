"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { AuthCard, textLinkClass } from "@/components/auth-layout";
import { showRefusal } from "@/components/form/show-refusal";
import { useAppForm } from "@/components/form/use-app-form";
import { FormMessage } from "@/components/form-message";
import { FieldGroup } from "@/components/ui/field";
import { hu } from "@/i18n/hu";
import { authClient } from "@/lib/auth-client";
import { emailAddress, enteredPassword } from "@/lib/form-rules";
import { safeNextPath, withNext } from "@/lib/navigation";
import { refreshSession } from "@/lib/session";

const signInSchema = z.object({ email: emailAddress, password: enteredPassword });

export default function SignInPage() {
  // useSearchParams needs a Suspense boundary above it.
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));

  const form = useAppForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: signInSchema },
    onSubmit: async ({ value, formApi }) => {
      const result = await authClient.signIn.email({
        email: value.email.trim(),
        password: value.password,
      });
      if (result.error) {
        showRefusal(formApi, { form: signInErrorMessage(result.error.code), fields: {} });
        return;
      }
      await refreshSession(queryClient);
      router.replace(nextPath ?? "/");
    },
  });

  return (
    <AuthCard
      title={hu.auth.signInTitle}
      footer={
        <>
          {hu.auth.noAccountYet}{" "}
          <Link href={withNext("/sign-up", nextPath)} className={textLinkClass}>
            {hu.auth.signUpLink}
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
          <ArrivalNotice searchParams={searchParams} />
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
                autoComplete="current-password"
              />
            )}
          </form.AppField>
          <form.AppForm>
            <form.FormError />
            <form.SubmitButton>{hu.auth.signIn}</form.SubmitButton>
          </form.AppForm>
          <Link href="/forgot-password" className={`${textLinkClass} self-center text-sm`}>
            {hu.auth.forgotPassword}
          </Link>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}

/** Why the visitor landed here, when another page sent them. */
function ArrivalNotice({ searchParams }: { searchParams: URLSearchParams }) {
  if (searchParams.get("reset") === "done") {
    return <FormMessage tone="notice">{hu.auth.resetDone}</FormMessage>;
  }
  return null;
}

function signInErrorMessage(code: string | undefined): string {
  if (code === "INVALID_EMAIL_OR_PASSWORD" || code === "INVALID_EMAIL") {
    return hu.auth.invalidCredentials;
  }
  if (code === "EMAIL_NOT_VERIFIED") return hu.auth.emailNotVerified;
  return hu.errors.internal;
}
