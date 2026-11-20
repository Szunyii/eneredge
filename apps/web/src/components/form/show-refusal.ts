import type { AnyFormApi } from "@tanstack/react-form";
import type { FormRefusal } from "@/lib/api-error";

/**
 * Shows on a form why the server turned its request down: a message under each
 * field the refusal names, or one for the form as a whole (see FormError). The
 * messages go away as the person edits the form.
 */
export function showRefusal(form: AnyFormApi, refusal: FormRefusal): void {
  form.setErrorMap({ onSubmit: refusal });
}
