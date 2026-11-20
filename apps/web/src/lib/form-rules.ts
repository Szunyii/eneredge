import { z } from "zod";
import { hu } from "@/i18n/hu";

// The checks the forms share, with the Hungarian message each one shows.
// The server checks everything again: these only spare a round trip.

export const MIN_PASSWORD_LENGTH = 10;

export const requiredText = z.string().trim().min(1, hu.fieldErrors.required);

export const emailAddress = requiredText.pipe(z.email(hu.auth.invalidEmail));

/** A password being chosen (sign-up, reset). Signing in only needs "not empty". */
export const newPassword = z
  .string()
  .min(1, hu.fieldErrors.required)
  .min(MIN_PASSWORD_LENGTH, hu.auth.passwordTooShort);

export const enteredPassword = z.string().min(1, hu.fieldErrors.required);

export const parkName = requiredText.max(80, hu.fieldErrors.too_long);

/** A number as people type it here: "47,4979" and "47.4979" mean the same. */
export function parseDecimal(text: string): number {
  return Number(text.trim().replace(",", "."));
}

/** The same number the way it is written in Hungarian: with a decimal comma. */
export function formatDecimal(value: number): string {
  return value.toLocaleString("hu-HU", { maximumFractionDigits: 6, useGrouping: false });
}

/** A coordinate typed as text: a number within the given degrees. */
export function coordinate(min: number, max: number) {
  return requiredText
    .refine((text) => Number.isFinite(parseDecimal(text)), hu.fieldErrors.invalid)
    .refine((text) => {
      const degrees = parseDecimal(text);
      // "Not a number" is already reported above; it is not also out of range.
      return !Number.isFinite(degrees) || (degrees >= min && degrees <= max);
    }, hu.fieldErrors.out_of_range);
}

/** A company's identifier in addresses: the same rule the server enforces. */
export const organizationSlug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, hu.onboarding.slugInvalid)
  .min(3, hu.onboarding.slugInvalid)
  .max(40, hu.onboarding.slugInvalid);
