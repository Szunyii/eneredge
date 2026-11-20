import { afterAll, beforeAll, expect, spyOn, test } from "bun:test";
import { createDb } from "@eneredge/db";
import { createApp } from "../src/app.ts";
import { createMemoryMailer } from "../src/mail.ts";
import { startServer } from "../src/server.ts";
import { createTestApp, type TestApp } from "./helpers.ts";

let testApp: TestApp;
beforeAll(async () => {
  testApp = await createTestApp();
});
afterAll(() => testApp.close());

test("health is ok with a reachable database", async () => {
  const response = await testApp.app.request("/api/health");
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok", db: "ok" });
});

test("health is 503 when the database is down", async () => {
  // Nothing listens on port 1.
  const db = createDb("postgres://eneredge:eneredge@127.0.0.1:1/none");
  const app = createApp({ db, env: testApp.env, mailer: createMemoryMailer() });
  const response = await app.request("/api/health");
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ status: "degraded", db: "down" });
  await db.$client.close();
});

test("unknown api path is a JSON 404", async () => {
  const response = await testApp.app.request("/api/nope");
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: "not_found" });
});

test("unhandled errors do not leak their message", async () => {
  const app = createApp({ db: testApp.db, env: testApp.env, mailer: createMemoryMailer() });
  app.get("/api/boom", () => {
    throw new Error("secret detail");
  });
  const logged = spyOn(console, "error").mockImplementation(() => {});
  try {
    const response = await app.request("/api/boom");
    expect(response.status).toBe(500);
    expect(await response.text()).toBe('{"error":"internal"}');
    expect(logged.mock.calls.flat().map(String).join(" ")).toContain("secret detail");
  } finally {
    logged.mockRestore();
  }
});

test("the server answers on a free port", async () => {
  const server = startServer({ db: testApp.db, env: testApp.env, mailer: createMemoryMailer() });
  try {
    const response = await fetch(new URL("/api/health", server.url));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", db: "ok" });
  } finally {
    await server.stop(true);
  }
});

test("a path outside /api is a JSON 404 too", async () => {
  const server = startServer({ db: testApp.db, env: testApp.env, mailer: createMemoryMailer() });
  try {
    const response = await fetch(new URL("/", server.url));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  } finally {
    await server.stop(true);
  }
});
