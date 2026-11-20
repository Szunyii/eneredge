import { expect, test } from "bun:test";
import { formatDate, formatDecimal } from "./format";

test("a number is shown with a decimal comma and at most six decimals", () => {
  expect(formatDecimal(19.0402)).toBe("19,0402");
  expect(formatDecimal(47)).toBe("47");
  expect(formatDecimal(47.49791234567)).toBe("47,497912");
});

test("a day is written the Hungarian way, in the park's time zone", () => {
  // 23:30 UTC on the 19th is already the 20th in Budapest.
  expect(formatDate("2026-11-19T23:30:00.000Z", "Europe/Budapest")).toBe("2026. nov. 20.");
  expect(formatDate("2026-11-19T23:30:00.000Z", "UTC")).toBe("2026. nov. 19.");
});
