"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { AuthCard, AuthFrame, textLinkClass } from "@/components/auth-layout";
import { useAppForm } from "@/components/form/use-app-form";
import { RequireAuth } from "@/components/require-auth";
import { FieldGroup } from "@/components/ui/field";
import { Unbroken } from "@/components/unbroken";
import { hu } from "@/i18n/hu";
import { authClient } from "@/lib/auth-client";
import { organizationSlug, requiredText } from "@/lib/form-rules";
import { refreshSession } from "@/lib/session";
import { slugify } from "@/lib/slug";

const companySchema = z.object({ name: requiredText, slug: organizationSlug });

export default function OnboardingPage() {
  return (
    <RequireAuth>
      <AuthFrame>
        <CreateCompanyForm />
      </AuthFrame>
    </RequireAuth>
  );
}

/** The first thing a new user does: name their company. Parks and colleagues all hang on it. */
function CreateCompanyForm() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useAppForm({
    defaultValues: { name: "", slug: "" },
    validators: {
      onSubmit: companySchema,
      onSubmitAsync: async ({ value }) => {
        const result = await authClient.organization.create({
          name: value.name.trim(),
          slug: value.slug,
        });
        return result.error ? companyRefusal(result.error.code) : null;
      },
    },
    onSubmit: async ({ value }) => {
      await refreshSession(queryClient);
      router.replace(`/o/${value.slug}/parks`);
    },
  });

  /** The slug follows the name for as long as the user has not typed a slug of their own. */
  function suggestSlug(name: string) {
    if (form.getFieldMeta("slug")?.isDirty) return;
    form.setFieldValue("slug", slugify(name), { dontUpdateMeta: true });
  }

  async function signOut() {
    await authClient.signOut();
    // A full page load, so nothing of this user stays in memory for the next one.
    window.location.assign("/sign-in");
  }

  return (
    <AuthCard
      title={hu.onboarding.title}
      lead={hu.onboarding.lead}
      footer={
        <button type="button" onClick={signOut} className={textLinkClass}>
          {hu.common.signOut}
        </button>
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
          <form.AppField name="name" listeners={{ onChange: ({ value }) => suggestSlug(value) }}>
            {(field) => (
              <field.TextField label={hu.onboarding.companyName} autoComplete="organization" />
            )}
          </form.AppField>
          <form.AppField name="slug">
            {(field) => (
              <field.TextField
                label={hu.onboarding.slug}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                hint={
                  <>
                    {hu.onboarding.slugHint} <Unbroken>/o/{field.state.value || "…"}</Unbroken>
                  </>
                }
              />
            )}
          </form.AppField>
          <form.AppForm>
            <form.FormError />
            <form.SubmitButton>{hu.onboarding.create}</form.SubmitButton>
          </form.AppForm>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}

/** The server's refusal, put where the person can act on it. */
function companyRefusal(code: string | undefined) {
  if (code === "ORGANIZATION_ALREADY_EXISTS" || code === "ORGANIZATION_SLUG_ALREADY_TAKEN") {
    return { fields: { slug: hu.onboarding.slugTaken } };
  }
  if (code === "INVALID_SLUG") return { fields: { slug: hu.onboarding.slugInvalid } };
  return { form: hu.errors.internal, fields: {} };
}
