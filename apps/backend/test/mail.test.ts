import { expect, spyOn, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadEnv } from "../src/env.ts";
import { createMailer, createMemoryMailer } from "../src/mail.ts";

// The smallest configuration that loads: everything else has a default.
const minimal = { DATABASE_URL: "postgres://x/y", AUTH_SECRET: "s".repeat(32) };

test("file transport appends one JSON line per message", async () => {
  const file = join(tmpdir(), `eneredge-mail-${randomUUID()}.jsonl`);
  const mailer = createMailer(loadEnv({ ...minimal, MAIL_TRANSPORT: "file", MAIL_FILE: file }));
  await mailer.send({ to: "a@x.hu", subject: "Első", text: "egy" });
  await mailer.send({ to: "b@x.hu", subject: "Második", text: "kettő" });

  const lines = (await Bun.file(file).text()).trimEnd().split("\n");
  await rm(file);
  expect(lines).toHaveLength(2);
  expect(JSON.parse(lines[0] as string)).toMatchObject({ to: "a@x.hu", subject: "Első" });
  expect(JSON.parse(lines[1] as string)).toMatchObject({ to: "b@x.hu", subject: "Második" });
});

test("memory mailer collects messages", async () => {
  const mailer = createMemoryMailer();
  await mailer.send({ to: "a@x.hu", subject: "Tárgy", text: "szöveg" });
  expect(mailer.outbox).toHaveLength(1);
  expect(mailer.outbox[0]).toEqual({ to: "a@x.hu", subject: "Tárgy", text: "szöveg" });
});

test("log transport prints the recipient, the subject and the text", async () => {
  const printed = spyOn(console, "log").mockImplementation(() => {});
  try {
    await createMailer(loadEnv(minimal)).send({
      to: "a@x.hu",
      subject: "Erősítsd meg a címed",
      text: "http://localhost:3000/verify?token=abc",
    });
    const output = printed.mock.calls.flat().join("\n");
    expect(output).toContain("a@x.hu");
    expect(output).toContain("Erősítsd meg a címed");
    expect(output).toContain("http://localhost:3000/verify?token=abc");
  } finally {
    printed.mockRestore();
  }
});
