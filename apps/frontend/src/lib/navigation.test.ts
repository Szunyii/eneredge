import { expect, test } from "bun:test";
import { safeNextPath, withNext } from "./navigation";

test.each([
  ["/o/acme/settings", "/o/acme/settings"],
  ["/accept-invitation/abc?x=1", "/accept-invitation/abc?x=1"],
  ["/o/acme/parks?tab=1#top", "/o/acme/parks?tab=1#top"],
])("an address inside the app is kept: %p", (next, expected) => {
  expect(safeNextPath(next)).toBe(expected);
});

test.each([
  null,
  undefined,
  "",
  "https://evil.example",
  "//evil.example",
  "/\\evil.example",
  "o/acme",
  // The browser drops tabs and line breaks from an address: these would become "//evil.example".
  "/\t/evil.example",
  "/\n/evil.example",
  "/\r/evil.example",
  "/\u0000/evil.example",
  // A backslash anywhere is read as a slash.
  "/o\\..\\\\evil.example",
])("anything else is refused: %p", (next) => {
  expect(safeNextPath(next)).toBeNull();
});

test("withNext attaches the return address, encoded", () => {
  expect(withNext("/sign-in", "/o/acme/parks?tab=1")).toBe(
    "/sign-in?next=%2Fo%2Facme%2Fparks%3Ftab%3D1",
  );
  expect(withNext("/sign-in", null)).toBe("/sign-in");
});

test("withNext keeps what the address already says", () => {
  expect(withNext("/sign-in?reset=done", "/o/acme")).toBe("/sign-in?reset=done&next=%2Fo%2Facme");
  expect(withNext("/sign-in?reset=done", null)).toBe("/sign-in?reset=done");
});
