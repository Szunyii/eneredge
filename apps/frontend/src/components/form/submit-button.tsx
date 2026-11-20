"use client";

import type { ComponentProps } from "react";
import { useFormContext } from "@/components/form/form-context";
import { Button } from "@/components/ui/button";

/** The button that sends the form. It is off while the form is on its way. */
export function SubmitButton(props: Omit<ComponentProps<typeof Button>, "type" | "disabled">) {
  const form = useFormContext();
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} {...props} />
      )}
    </form.Subscribe>
  );
}
