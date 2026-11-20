import { createFormHook } from "@tanstack/react-form";
import { fieldContext, formContext } from "@/components/form/form-context";
import { FormError } from "@/components/form/form-error";
import { SelectField } from "@/components/form/select-field";
import { SubmitButton } from "@/components/form/submit-button";
import { TextField } from "@/components/form/text-field";

/**
 * Every form of the app starts here. It is TanStack Form's `useForm` with our
 * own building blocks attached:
 *
 *   <form.AppField name="email">{(field) => <field.TextField label="…" />}</form.AppField>
 *   <form.AppForm><form.FormError /><form.SubmitButton>…</form.SubmitButton></form.AppForm>
 *
 * Checks before sending go into `validators.onSubmit` (a Zod schema). `onSubmit`
 * sends the request; when the server refuses it, `showRefusal` puts the reason
 * on the form or under the fields it concerns.
 */
export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { TextField, SelectField },
  formComponents: { FormError, SubmitButton },
});
