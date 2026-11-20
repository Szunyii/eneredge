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

/** A company's identifier in addresses: the same rule the server enforces. */
export const organizationSlug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, hu.onboarding.slugInvalid)
  .min(3, hu.onboarding.slugInvalid)
  .max(40, hu.onboarding.slugInvalid);
