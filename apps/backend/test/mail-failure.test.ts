import { expect, spyOn, test } from "bun:test";
import type { Mailer } from "../src/mail.ts";
import { sendInBackground } from "../src/mail.ts";

/** A mail server that is down: every send is refused. */
const brokenMailer: Mailer = {
  send: () => Promise.reject(new Error("SMTP connection refused")),
};

test("a failed send in the background is logged, not thrown", async () => {
  const logged = spyOn(console, "error").mockImplementation(() => {});
  try {
    sendInBackground(brokenMailer, { to: "a@x.hu", subject: "Tárgy", text: "szöveg" });
    await Bun.sleep(10);
    const output = logged.mock.calls.flat().map(String).join(" ");
    expect(output).toContain("Tárgy");
    expect(output).toContain("SMTP connection refused");
    // Who the mail was for stays out of the log.
    expect(output).not.toContain("a@x.hu");
  } finally {
    logged.mockRestore();
  }
});
