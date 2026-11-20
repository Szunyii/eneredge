"use client";

import { useFormContext } from "@/components/form/form-context";
import { FormMessage } from "@/components/form-message";

/**
 * What went wrong with the form as a whole — the answer of the last attempt to
 * send it that does not belong to one field ("wrong e-mail address or password").
 */
export function FormError() {
  const form = useFormContext();
  return (
    <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
      {(submitError) =>
        // A schema's findings are objects and are shown under their fields.
        typeof submitError === "string" ? (
          <FormMessage tone="error">{submitError}</FormMessage>
        ) : null
      }
    </form.Subscribe>
  );
}
