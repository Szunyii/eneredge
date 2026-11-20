"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { z } from "zod";
import { AuthCard, textLinkClass } from "@/components/auth-layout";
import { CheckEmailCard } from "@/components/check-email-card";
import { showRefusal } from "@/components/form/show-refusal";
import { useAppForm } from "@/components/form/use-app-form";
import { FormMessage } from "@/components/form-message";
import { FieldGroup } from "@/components/ui/field";
import { hu } from "@/i18n/hu";
import { type AccountRequest, requestAccount } from "@/lib/account";
import { refusalFrom } from "@/lib/api-error";
import { usePublicConfig } from "@/lib/config";
import { displayName, emailAddress } from "@/lib/form-rules";
import { safeNextPath, withNext } from "@/lib/navigation";

const signUpSchema = z.object({ name: displayName, email: emailAddress });

export default function SignUpPage() {
  // useSearchParams needs a Suspense boundary above it.
  return (
    <Suspense>
      <SignUp />
    </Suspense>
  );
}

/**
 * Asking for an account takes a name and an address — no password. The password
 * is set on the page that the link in the mail opens, so only the owner of the
 * address can finish.
 */
function SignUp() {
  const nextPath = safeNextPath(useSearchParams().get("next"));
  const [sentRequest, setSentRequest] = useState<AccountRequest | null>(null);

  if (sentRequest) return <CheckEmailCard request={sentRequest} />;
  return <SignUpForm nextPath={nextPath} onSent={setSentRequest} />;
}

type SignUpFormProps = {
  nextPath: string | null;
  onSent: (request: AccountRequest) => void;
};

function SignUpForm({ nextPath, onSent }: SignUpFormProps) {
  const isByInvitation = usePublicConfig().data?.signupMode === "allowlist";

  const form = useAppForm({
    defaultValues: { name: "", email: "" },
    validators: { onSubmit: signUpSchema },
    onSubmit: async ({ value, formApi }) => {
      const request = { name: value.name.trim(), email: value.email.trim(), next: nextPath };
      try {
        await requestAccount(request);
        onSent(request);
      } catch (error) {
        showRefusal(formApi, refusalFrom(error));
      }
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
          {isByInvitation ? (
            <FormMessage tone="notice">{hu.auth.signupByInvitation}</FormMessage>
          ) : null}
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
          <form.AppForm>
            <form.FormError />
            <form.SubmitButton>{hu.auth.createAccount}</form.SubmitButton>
          </form.AppForm>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
