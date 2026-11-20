import { expect, test } from "bun:test";
import { hu } from "@/i18n/hu";
import {
  coordinate,
  decimalInputValue,
  displayName,
  emailAddress,
  newPassword,
  organizationSlug,
  parkName,
  parseDecimal,
  requiredText,
} from "./form-rules";

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

test("the name of a person or a company may be 100 characters long", () => {
  expect(messageFor(displayName, "x".repeat(100))).toBeNull();
  expect(messageFor(displayName, "x".repeat(101))).toBe(hu.fieldErrors.too_long);
  expect(messageFor(displayName, "  ")).toBe(hu.fieldErrors.required);
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

test("a coordinate accepts a decimal comma or point within its range", () => {
  const latitude = coordinate(-90, 90);
  expect(messageFor(latitude, "47,4979")).toBeNull();
  expect(messageFor(latitude, "-47.4979")).toBeNull();
  expect(messageFor(latitude, "")).toBe(hu.fieldErrors.required);
  expect(messageFor(latitude, "észak")).toBe(hu.fieldErrors.invalid);
  expect(messageFor(latitude, "91")).toBe(hu.fieldErrors.out_of_range);
  expect(messageFor(latitude, "-90,5")).toBe(hu.fieldErrors.out_of_range);
});

test("a decimal is read with a comma or a point", () => {
  expect(parseDecimal(" 19,0402 ")).toBe(19.0402);
  expect(parseDecimal("19.0402")).toBe(19.0402);
  expect(parseDecimal("-0,5")).toBe(-0.5);
  expect(parseDecimal("47")).toBe(47);
});

test.each(["0x1F", "1e1", "47.", ",5", "4 7", "47,49,79", "Infinity", ""])(
  "%p is not a decimal",
  (text) => {
    expect(Number.isNaN(parseDecimal(text))).toBe(true);
  },
);

test("a number put into an input comes back as the very same number", () => {
  for (const stored of [19.0402, 47, -0.5, 47.49791234567, 1e-7]) {
    expect(parseDecimal(decimalInputValue(stored))).toBe(stored);
  }
  expect(decimalInputValue(19.0402)).toBe("19,0402");
});

test("a park name may be 80 characters long", () => {
  expect(messageFor(parkName, "x".repeat(80))).toBeNull();
  expect(messageFor(parkName, "x".repeat(81))).toBe(hu.fieldErrors.too_long);
  expect(messageFor(parkName, "  ")).toBe(hu.fieldErrors.required);
});
