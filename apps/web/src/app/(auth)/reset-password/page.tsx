"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { z } from "zod";
import { AuthCard, textLinkClass } from "@/components/auth-layout";
import { showRefusal } from "@/components/form/show-refusal";
import { useAppForm } from "@/components/form/use-app-form";
import { FormMessage } from "@/components/form-message";
import { FieldGroup } from "@/components/ui/field";
import { Unbroken } from "@/components/unbroken";
import { hu } from "@/i18n/hu";
import type { FormRefusal } from "@/lib/api-error";
import { authClient } from "@/lib/auth-client";
import { newPassword } from "@/lib/form-rules";
import { safeNextPath, withNext } from "@/lib/navigation";
import { refreshSession } from "@/lib/session";

const passwordSchema = z.object({ password: newPassword });

/** What the link in a password mail carries (see `passwordPageUrl` in the API's auth.ts). */
type PasswordLink = {
  /** Proves that whoever opens the page can read the mailbox. */
  token: string;
  /** The account's address: shown, and used to sign in once the password is set. */
  email: string | null;
  /** True for the first password of a new account, false for a forgotten one. */
  isNewAccount: boolean;
  /** Where the person was headed when they asked for the link. */
  nextPath: string | null;
};

export default function PasswordPage() {
  // useSearchParams needs a Suspense boundary above it.
  return (
    <Suspense>
      <SetPassword />
    </Suspense>
  );
}

/**
 * The page the link in a password mail opens. Setting the password here finishes
 * a sign-up or replaces a forgotten password, and signs the person in.
 */
function SetPassword() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [isLinkSpent, setIsLinkSpent] = useState(false);

  if (!token || isLinkSpent) {
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

  const link: PasswordLink = {
    token,
    email: searchParams.get("email"),
    isNewAccount: searchParams.get("welcome") === "1",
    nextPath: safeNextPath(searchParams.get("next")),
  };
  return <PasswordForm link={link} onLinkSpent={() => setIsLinkSpent(true)} />;
}

function PasswordForm({ link, onLinkSpent }: { link: PasswordLink; onLinkSpent: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useAppForm({
    defaultValues: { password: "" },
    validators: { onSubmit: passwordSchema },
    onSubmit: async ({ value, formApi }) => {
      const result = await authClient.resetPassword({
        newPassword: value.password,
        token: link.token,
      });
      if (result.error) {
        if (result.error.code === "INVALID_TOKEN") onLinkSpent();
        else showRefusal(formApi, passwordRefusal(result.error.code));
        return;
      }

      if (await signIn(link.email, value.password)) {
        await refreshSession(queryClient);
        router.replace(link.nextPath ?? "/");
      } else {
        // The password is set all the same; the person signs in by hand.
        router.replace(withNext("/sign-in?reset=done", link.nextPath));
      }
    },
  });

  return (
    <AuthCard
      title={link.isNewAccount ? hu.auth.welcomeTitle : hu.auth.resetTitle}
      lead={
        <>
          {link.isNewAccount ? hu.auth.welcomeLead : hu.auth.resetLead}
          {link.email ? (
            <>
              {" "}
              {hu.auth.accountOf} <Unbroken>{link.email}</Unbroken>
            </>
          ) : null}
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
          <form.AppField name="password">
            {(field) => (
              <field.TextField
                label={link.isNewAccount ? hu.auth.password : hu.auth.newPassword}
                type="password"
                autoComplete="new-password"
                hint={hu.auth.passwordHint}
              />
            )}
          </form.AppField>
          <form.AppForm>
            <form.FormError />
            <form.SubmitButton>{hu.auth.savePasswordAndSignIn}</form.SubmitButton>
          </form.AppForm>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}

/** Signs in with the password that was just set. False when that is not possible. */
async function signIn(email: string | null, password: string): Promise<boolean> {
  if (!email) return false;
  const result = await authClient.signIn.email({ email, password });
  return !result.error;
}

function passwordRefusal(code: string | undefined): FormRefusal {
  if (code === "PASSWORD_TOO_SHORT") return { fields: { password: hu.auth.passwordTooShort } };
  return { form: hu.errors.internal, fields: {} };
}
