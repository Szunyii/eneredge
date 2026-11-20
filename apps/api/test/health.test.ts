import { afterAll, beforeAll, expect, spyOn, test } from "bun:test";
import { createDb } from "@eneredge/db";
import { createApp } from "../src/app.ts";
import { createMemoryMailer } from "../src/mail.ts";
import { startServer } from "../src/server.ts";
import { createTestApp, type TestApp } from "./helpers.ts";

let t: TestApp;
beforeAll(async () => {
  t = await createTestApp();
});
afterAll(() => t.close());

test("health is ok with a reachable database", async () => {
  const res = await t.app.request("/api/health");
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ status: "ok", db: "ok" });
});

test("health is 503 when the database is down", async () => {
  // Nothing listens on port 1.
  const db = createDb("postgres://eneredge:eneredge@127.0.0.1:1/none");
  const app = createApp({ db, env: t.env, mailer: createMemoryMailer() });
  const res = await app.request("/api/health");
  expect(res.status).toBe(503);
  expect(await res.json()).toEqual({ status: "degraded", db: "down" });
  await db.$client.close();
});

test("unknown api path is a JSON 404", async () => {
  const res = await t.app.request("/api/nope");
  expect(res.status).toBe(404);
  expect(await res.json()).toEqual({ error: "not_found" });
});

test("unhandled errors do not leak their message", async () => {
  const app = createApp({ db: t.db, env: t.env, mailer: createMemoryMailer() });
  app.get("/api/boom", () => {
    throw new Error("secret detail");
  });
  const logged = spyOn(console, "error").mockImplementation(() => {});
  try {
    const res = await app.request("/api/boom");
    expect(res.status).toBe(500);
    expect(await res.text()).toBe('{"error":"internal"}');
    expect(logged.mock.calls.flat().map(String).join(" ")).toContain("secret detail");
  } finally {
    logged.mockRestore();
  }
});

test("the server answers on a free port", async () => {
  const server = startServer({ db: t.db, env: t.env, mailer: createMemoryMailer() });
  try {
    const res = await fetch(new URL("/api/health", server.url));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", db: "ok" });
  } finally {
    await server.stop(true);
  }
});
