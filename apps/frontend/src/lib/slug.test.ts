import { expect, test } from "bun:test";
import { slugify } from "./slug";

test.each([
  ["Ős-Zöld Erőmű Kft.", "os-zold-eromu-kft"],
  ["  Vega II.  ", "vega-ii"],
  ["Árvíztűrő Tükörfúrógép", "arvizturo-tukorfurogep"],
  ["!!!", ""],
  ["a".repeat(60), "a".repeat(40)],
])("slugify(%p) → %p", (name, expected) => {
  expect(slugify(name)).toBe(expected);
});

test("a name cut at 40 characters does not end in a hyphen", () => {
  // 39 letters, a space, then more: the cut would land right after the hyphen.
  expect(slugify(`${"a".repeat(39)} napelempark`)).toBe("a".repeat(39));
});

test("what slugify makes is always a well-formed slug or empty", () => {
  const wellFormed = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  for (const name of [
    "Vega  --  II.",
    "-kötőjellel kezd",
    "végén kötőjel-",
    "Ünnep & Nap (2026)",
  ]) {
    expect(slugify(name)).toMatch(wellFormed);
  }
});
