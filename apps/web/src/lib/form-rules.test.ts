import { expect, test } from "bun:test";
import { hu } from "@/i18n/hu";
import { emailAddress, newPassword, organizationSlug, requiredText } from "./form-rules";

/** The message a person would see for this value, or null when it is accepted. */
function messageFor(rule: { safeParse(value: unknown): unknown }, value: unknown): string | null {
  const result = rule.safeParse(value) as {
    success: boolean;
    error?: { issues: { message: string }[] };
  };
  return result.success ? null : (result.error?.issues[0]?.message ?? null);
}

test("an empty or blank text is asked for", () => {
  expect(messageFor(requiredText, "")).toBe(hu.fieldErrors.required);
  expect(messageFor(requiredText, "   ")).toBe(hu.fieldErrors.required);
  expect(messageFor(requiredText, "Vega")).toBeNull();
});

test("an e-mail address must look like one", () => {
  expect(messageFor(emailAddress, "")).toBe(hu.fieldErrors.required);
  expect(messageFor(emailAddress, "nem-cím")).toBe(hu.auth.invalidEmail);
  expect(messageFor(emailAddress, " valaki@example.test ")).toBeNull();
});

test("a new password needs ten characters", () => {
  expect(messageFor(newPassword, "")).toBe(hu.fieldErrors.required);
  expect(messageFor(newPassword, "123456789")).toBe(hu.auth.passwordTooShort);
  expect(messageFor(newPassword, "1234567890")).toBeNull();
});

test.each(["ab", "-acme", "acme-", "Nagy Betű", "a".repeat(41)])(
  "the slug %p is refused",
  (slug) => {
    expect(messageFor(organizationSlug, slug)).toBe(hu.onboarding.slugInvalid);
  },
);

test("a well-formed slug is accepted", () => {
  expect(messageFor(organizationSlug, "os-zold-eromu-kft")).toBeNull();
});
