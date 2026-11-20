import { expect, test } from "bun:test";
import { loadEnv } from "../src/env.ts";

// The smallest configuration that loads: everything else has a default.
const minimal = { DATABASE_URL: "postgres://x/y", AUTH_SECRET: "s".repeat(32) };

test("defaults", () => {
  expect(loadEnv(minimal)).toMatchObject({
    NODE_ENV: "development",
    PORT: 3001,
    APP_URL: "http://localhost:3000",
    MAIL_TRANSPORT: "log",
    PLATFORM_ADMIN_EMAILS: [],
    SIGNUP_MODE: "open",
  });
});

test("rejects a short AUTH_SECRET", () => {
  expect(() => loadEnv({ ...minimal, AUTH_SECRET: "short" })).toThrow(/AUTH_SECRET/);
});

test("production requires SMTP", () => {
  expect(() =>
    loadEnv({
      ...minimal,
      NODE_ENV: "production",
      APP_URL: "https://app.example",
      MAIL_TRANSPORT: "log",
    }),
  ).toThrow(/MAIL_TRANSPORT/);
});

test("production requires an https APP_URL", () => {
  const smtp = {
    MAIL_TRANSPORT: "smtp",
    SMTP_HOST: "smtp.example",
    SMTP_PORT: "465",
    SMTP_USER: "u",
    SMTP_PASSWORD: "p",
  };
  expect(() =>
    loadEnv({ ...minimal, ...smtp, NODE_ENV: "production", APP_URL: "http://app.example" }),
  ).toThrow(/APP_URL/);
  expect(
    loadEnv({ ...minimal, ...smtp, NODE_ENV: "production", APP_URL: "https://app.example/" }),
  ).toMatchObject({ APP_URL: "https://app.example", SMTP_PORT: 465, SMTP_SECURE: true });
});

test("smtp requires its settings", () => {
  expect(() => loadEnv({ ...minimal, MAIL_TRANSPORT: "smtp" })).toThrow(/SMTP_HOST/);
});

test("file transport requires MAIL_FILE", () => {
  expect(() => loadEnv({ ...minimal, MAIL_TRANSPORT: "file" })).toThrow(/MAIL_FILE/);
});

test("parses platform admins", () => {
  expect(
    loadEnv({ ...minimal, PLATFORM_ADMIN_EMAILS: " A@x.hu, b@x.hu " }).PLATFORM_ADMIN_EMAILS,
  ).toEqual(["a@x.hu", "b@x.hu"]);
});

test("empty values count as unset", () => {
  const env = loadEnv({ ...minimal, PORT: "", SMTP_PORT: "", MAIL_FILE: "", SIGNUP_MODE: "" });
  expect(env).toMatchObject({ PORT: 3001, SIGNUP_MODE: "open" });
  expect(env.SMTP_PORT).toBeUndefined();
  expect(env.MAIL_FILE).toBeUndefined();
});

test("rejects an unknown SIGNUP_MODE", () => {
  expect(() => loadEnv({ ...minimal, SIGNUP_MODE: "everyone" })).toThrow(/SIGNUP_MODE/);
});

test("lists every problem at once", () => {
  let message = "";
  try {
    loadEnv({ PORT: "abc" });
  } catch (error) {
    message = (error as Error).message;
  }
  expect(message).toContain("DATABASE_URL");
  expect(message).toContain("AUTH_SECRET");
  expect(message).toContain("PORT");
});
