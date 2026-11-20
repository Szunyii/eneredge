import type { MailMessage } from "../../src/mail.ts";
import type { TestApp } from "./app.ts";

const WAIT_FOR_MAIL_MS = 2000;

/**
 * The latest mail to this address whose text contains `containing` (for example
 * "/reset-password"). Mails go out in the background, so this waits for one.
 */
export async function mailTo(
  testApp: TestApp,
  email: string,
  containing = "",
): Promise<MailMessage> {
  const deadline = Date.now() + WAIT_FOR_MAIL_MS;
  while (true) {
    const mail = testApp.outbox.findLast(
      (message) => message.to === email && message.text.includes(containing),
    );
    if (mail) return mail;
    if (Date.now() >= deadline) {
      throw new Error(`No mail containing "${containing}" was sent to ${email}`);
    }
    await Bun.sleep(5);
  }
}

/** Waits until at least `count` mails have gone to this address. */
export async function waitForMails(testApp: TestApp, email: string, count: number): Promise<void> {
  const deadline = Date.now() + WAIT_FOR_MAIL_MS;
  while (testApp.outbox.filter((message) => message.to === email).length < count) {
    if (Date.now() >= deadline) throw new Error(`Fewer than ${count} mails were sent to ${email}`);
    await Bun.sleep(5);
  }
}

/** How many mails went to this address, once the background work has had time to finish. */
export async function settledMailCount(testApp: TestApp, email: string): Promise<number> {
  await Bun.sleep(150);
  return testApp.outbox.filter((message) => message.to === email).length;
}

/** The first link in the text of a mail. */
export function linkIn(mail: MailMessage): URL {
  const link = mail.text.match(/https?:\/\/\S+/)?.[0];
  if (!link) throw new Error(`The mail "${mail.subject}" has no link`);
  return new URL(link);
}
