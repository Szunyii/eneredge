import type { MailMessage } from "./mail.ts";

// The mails the platform sends about accounts. Hungarian, informal voice, plain text:
// every mail carries exactly one link, and the text says what it does.

const SIGNATURE = "EnerEdge";

export function verificationMail(input: { to: string; name: string; url: string }): MailMessage {
  return {
    to: input.to,
    subject: "Erősítsd meg az e-mail-címed",
    text: [
      `Szia ${input.name}!`,
      "Köszönjük, hogy regisztráltál az EnerEdge-re. Kattints az alábbi linkre: ezzel megerősíted az e-mail-címed, és be is lépsz.",
      input.url,
      "Ha nem te regisztráltál, hagyd figyelmen kívül ezt a levelet.",
      SIGNATURE,
    ].join("\n\n"),
  };
}

export function passwordResetMail(input: { to: string; name: string; url: string }): MailMessage {
  return {
    to: input.to,
    subject: "Új jelszó beállítása",
    text: [
      `Szia ${input.name}!`,
      "Új jelszót kértél az EnerEdge-fiókodhoz. Az alábbi linken tudod beállítani:",
      input.url,
      "Ha nem te kérted, hagyd figyelmen kívül ezt a levelet: a jelszavad változatlan marad.",
      SIGNATURE,
    ].join("\n\n"),
  };
}

export function invitationMail(input: {
  to: string;
  inviterName: string;
  organizationName: string;
  url: string;
}): MailMessage {
  return {
    to: input.to,
    subject: `Meghívó az EnerEdge-re: ${input.organizationName}`,
    text: [
      "Szia!",
      `${input.inviterName} meghívott, hogy csatlakozz ehhez a céghez az EnerEdge-en: ${input.organizationName}.`,
      "A meghívót az alábbi linken tudod elfogadni. Ha még nincs fiókod, előbb regisztrálj ezzel az e-mail-címmel.",
      input.url,
      "A meghívó 7 napig érvényes.",
      SIGNATURE,
    ].join("\n\n"),
  };
}
