"use client";

import { useSelector } from "@tanstack/react-form";
import { type ComponentProps, type ReactNode, useId } from "react";
import { useFieldContext } from "@/components/form/form-context";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type TextFieldProps = Omit<
  ComponentProps<typeof Input>,
  "id" | "name" | "value" | "onChange" | "onBlur"
> & {
  label: string;
  /** Help shown under the field while there is no error. */
  hint?: ReactNode;
};

/**
 * A labelled text input bound to a form field, with its hint or its error
 * underneath. The message is tied to the input (aria-describedby), so a screen
 * reader reads it together with the field.
 */
export function TextField({ label, hint, ...inputProps }: TextFieldProps) {
  const field = useFieldContext<string>();
  const error = useSelector(field.store, (state) => firstMessage(state.meta.errors));

  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <Input
        id={inputId}
        name={field.name}
        value={field.state.value}
        onChange={(event) => field.handleChange(event.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        {...inputProps}
      />
      {error ? (
        <FieldError id={errorId}>{error}</FieldError>
      ) : hint ? (
        <FieldDescription id={hintId}>{hint}</FieldDescription>
      ) : null}
    </Field>
  );
}

/**
 * A field can have several problems at once; one is enough to act on. A problem
 * comes as text (from the server) or as an object with a message (from a schema).
 */
function firstMessage(errors: unknown[]): string | null {
  for (const error of errors) {
    if (typeof error === "string") return error;
    if (typeof error === "object" && error !== null && "message" in error) {
      return String(error.message);
    }
  }
  return null;
}
