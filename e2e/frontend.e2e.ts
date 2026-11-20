import { expect, test } from "bun:test";
import { hu } from "@eneredge/frontend/hu";

// Plain requests against the running system: what the web origin serves,
// and that the API is reachable through it.
const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3100";

test("the app is served in Hungarian", async () => {
  const response = await fetch(`${baseUrl}/sign-in`);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/html");
  const html = await response.text();
  expect(html).toContain('<html lang="hu"');
  expect(html).toMatch(/<title>[^<]*EnerEdge<\/title>/);
});

test("a deep link is answered by the app, not a 404", async () => {
  const response = await fetch(`${baseUrl}/o/acme/parks/0198c1de-7f3a-7000-8000-000000000000`);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/html");
});

test("an unknown address gets the Hungarian not-found page with a 404", async () => {
  const response = await fetch(`${baseUrl}/nincs-ilyen-oldal`);
  expect(response.status).toBe(404);
  expect(await response.text()).toContain(hu.notFound.title);
});

test("api requests reach the backend through the web origin", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok", db: "ok" });
});

test("an unknown api path is JSON, not a page", async () => {
  const response = await fetch(`${baseUrl}/api/unknown`);
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: "not_found" });
});

test("the stylesheet carries the brand tokens", async () => {
  const html = await (await fetch(`${baseUrl}/sign-in`)).text();
  const hrefs = [...html.matchAll(/href="([^"]+\.css[^"]*)"/g)].map((match) => match[1] as string);
  expect(hrefs.length).toBeGreaterThan(0);
  const sheets = await Promise.all(
    hrefs.map(async (href) => (await fetch(new URL(href, baseUrl))).text()),
  );
  expect(sheets.join("\n")).toContain("--color-ink");
});
