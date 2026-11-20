"use client";

import { useSelector } from "@tanstack/react-form";
import { useId } from "react";
import { useFieldContext } from "@/components/form/form-context";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

type SelectFieldProps = {
  label: string;
  /** Keeps the label for screen readers only. */
  hideLabel?: boolean;
  options: readonly { value: string; label: string }[];
};

/** A labelled drop-down bound to a form field. It is the browser's own select: it works the same on a phone. */
export function SelectField({ label, hideLabel = false, options }: SelectFieldProps) {
  const field = useFieldContext<string>();
  const value = useSelector(field.store, (state) => state.value);
  const selectId = useId();

  return (
    <Field>
      <FieldLabel htmlFor={selectId} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </FieldLabel>
      <NativeSelect
        id={selectId}
        name={field.name}
        value={value}
        onChange={(event) => field.handleChange(event.target.value)}
        onBlur={field.handleBlur}
      >
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  );
}
