"use client";

import type { ParkDto } from "@eneredge/api";
import type { ReactNode } from "react";
import { z } from "zod";
import { useAppForm } from "@/components/form/use-app-form";
import { FieldGroup } from "@/components/ui/field";
import { hu } from "@/i18n/hu";
import { type FormRefusal, refusalFrom } from "@/lib/api-error";
import { coordinate, formatDecimal, parkName, parseDecimal } from "@/lib/form-rules";
import type { ParkValues } from "@/lib/parks";

const DEFAULT_TIME_ZONE = "Europe/Budapest";

const parkSchema = z.object({
  name: parkName,
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
  timezone: z.string(),
});

type ParkFormProps = {
  /** The park being edited; leave out to add a new one. */
  park?: ParkDto;
  submitLabel: string;
  /** Sends the values. A rejection with an ApiError is shown in the form. */
  onSubmit: (values: ParkValues) => Promise<unknown>;
  /** A second action beside the submit button, e.g. "Cancel". */
  secondaryAction?: ReactNode;
};

/** The basic facts of a park: its name, where it is, and which time zone it lives in. */
export function ParkForm({ park, submitLabel, onSubmit, secondaryAction }: ParkFormProps) {
  const form = useAppForm({
    defaultValues: {
      name: park?.name ?? "",
      // Coordinates are edited as text, so a decimal comma is as good as a point.
      latitude: park ? formatDecimal(park.latitude) : "",
      longitude: park ? formatDecimal(park.longitude) : "",
      timezone: park?.timezone ?? DEFAULT_TIME_ZONE,
    },
    validators: {
      onSubmit: parkSchema,
      onSubmitAsync: async ({ value }): Promise<FormRefusal | null> => {
        try {
          await onSubmit({
            name: value.name.trim(),
            latitude: parseDecimal(value.latitude),
            longitude: parseDecimal(value.longitude),
            timezone: value.timezone,
          });
          return null;
        } catch (error) {
          return parkRefusal(error);
        }
      },
    },
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <FieldGroup className="gap-5">
        <form.AppField name="name">
          {(field) => <field.TextField label={hu.park.name} autoComplete="off" />}
        </form.AppField>
        <div className="grid gap-5 sm:grid-cols-2">
          <form.AppField name="latitude">
            {(field) => (
              <field.TextField
                label={hu.park.latitude}
                inputMode="decimal"
                autoComplete="off"
                hint={hu.park.coordinateHint}
              />
            )}
          </form.AppField>
          <form.AppField name="longitude">
            {(field) => (
              <field.TextField label={hu.park.longitude} inputMode="decimal" autoComplete="off" />
            )}
          </form.AppField>
        </div>
        <form.AppField name="timezone">
          {(field) => <field.SelectField label={hu.park.timezone} options={timeZoneOptions()} />}
        </form.AppField>
        <form.AppForm>
          <form.FormError />
          <div className="flex flex-wrap items-center gap-3">
            <form.SubmitButton>{submitLabel}</form.SubmitButton>
            {secondaryAction}
          </div>
        </form.AppForm>
      </FieldGroup>
    </form>
  );
}

/** A taken name belongs under the name field; everything else is handled the usual way. */
function parkRefusal(error: unknown): FormRefusal {
  const refusal = refusalFrom(error);
  if (refusal.form === hu.errors.name_taken) return { fields: { name: hu.errors.name_taken } };
  return refusal;
}

/** Every time zone the browser knows, by its IANA name. */
function timeZoneOptions(): { value: string; label: string }[] {
  return Intl.supportedValuesOf("timeZone").map((name) => ({
    value: name,
    label: name.replaceAll("_", " "),
  }));
}
