import { expect, test } from "bun:test";
import { z } from "zod";
import type { FieldErrorCode } from "../src/errors.ts";
import { fieldErrors } from "../src/validation.ts";

const schema = z.object({
  name: z.string().trim().min(1).max(5),
  latitude: z.number().min(-90).max(90),
  email: z.email(),
});
const valid = { name: "Vega", latitude: 47.5, email: "valaki@example.test" };

function errorsFor(input: unknown) {
  const result = schema.safeParse(input);
  return result.success ? {} : fieldErrors(result.error.issues, input);
}

const faultyInputs: [
  description: string,
  input: unknown,
  expected: Record<string, FieldErrorCode>,
][] = [
  ["a missing field", { latitude: 47.5, email: valid.email }, { name: "required" }],
  ["null", { ...valid, name: null }, { name: "required" }],
  ["only spaces", { ...valid, name: "   " }, { name: "required" }],
  ["a text that is too long", { ...valid, name: "Vega II." }, { name: "too_long" }],
  ["a number above the range", { ...valid, latitude: 91 }, { latitude: "out_of_range" }],
  ["a number below the range", { ...valid, latitude: -91 }, { latitude: "out_of_range" }],
  ["text where a number belongs", { ...valid, latitude: "47" }, { latitude: "invalid" }],
  ["a malformed value", { ...valid, email: "nem-cím" }, { email: "invalid" }],
];

test.each(faultyInputs)("%s", (_description, input, expected) => {
  expect(errorsFor(input)).toEqual(expected);
});

test("every faulty field is reported, each with one code", () => {
  expect(errorsFor({ name: "", latitude: 200 })).toEqual({
    name: "required",
    latitude: "out_of_range",
    email: "required",
  });
});

test("a body that is not an object has no field errors", () => {
  expect(errorsFor("just text")).toEqual({});
  expect(errorsFor([1, 2])).toEqual({});
});
