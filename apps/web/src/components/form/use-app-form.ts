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
 * Checks before sending go into `validators.onSubmit` (a Zod schema); the request
 * itself goes into `validators.onSubmitAsync`, which can hand the server's
 * refusal back to the form or to single fields; `onSubmit` is what follows success.
 */
export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { TextField, SelectField },
  formComponents: { FormError, SubmitButton },
});
