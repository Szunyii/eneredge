import { appendFile } from "node:fs/promises";
import nodemailer from "nodemailer";
import type { Env } from "./env.ts";

export type MailMessage = { to: string; subject: string; text: string; html?: string };

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/**
 * `log` prints mails to the console (development), `file` appends them to MAIL_FILE as JSON
 * lines (the browser tests read links from there), `smtp` sends them.
 */
export function createMailer(env: Env): Mailer {
  switch (env.MAIL_TRANSPORT) {
    case "log":
      return {
        async send(message) {
          console.log(
            `\n--- mail to ${message.to} ---\nSubject: ${message.subject}\n\n${message.text}\n---\n`,
          );
        },
      };
    case "file": {
      const file = env.MAIL_FILE;
      if (!file) throw new Error("MAIL_FILE is not set");
      return {
        async send(message) {
          await appendFile(file, `${JSON.stringify(message)}\n`);
        },
      };
    }
    case "smtp": {
      // Connects on the first send, not here.
      const transport = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
      });
      return {
        async send(message) {
          await transport.sendMail({ from: env.MAIL_FROM, ...message });
        },
      };
    }
  }
}

/** Collects mails in memory. For tests only. */
export function createMemoryMailer(): Mailer & { outbox: MailMessage[] } {
  const outbox: MailMessage[] = [];
  return {
    outbox,
    async send(message) {
      outbox.push(message);
    },
  };
}
