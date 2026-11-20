import { createFormHookContexts } from "@tanstack/react-form";

// The link between a form made with `useAppForm` and the field and form
// components it renders (TextField, SubmitButton, FormError).
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();
