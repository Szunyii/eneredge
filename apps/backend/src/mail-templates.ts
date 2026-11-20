import type { MailMessage } from "./mail.ts";

// The mails the platform sends about accounts. Hungarian, informal voice, plain text:
// every mail carries exactly one link, and the text says what it does.

const SIGNATURE = "EnerEdge";

/**
 * The first mail to an address that asked for an account. Whoever opens its link
 * sets the password, and by that shows the address is theirs. It goes to an
 * address nobody has confirmed yet, so it carries nothing the requester typed.
 */
export function welcomeMail(input: { to: string; url: string }): MailMessage {
  return {
    to: input.to,
    subject: "Fejezd be a regisztrációt az EnerEdge-en",
    text: [
      "Szia!",
      "Ezzel az e-mail-címmel regisztráltak az EnerEdge-re. Ha te voltál, az alábbi linken állítsd be a jelszavad: ezzel megerősíted a címed, és be is lépsz.",
      input.url,
      "A link 24 óráig érvényes. Ha nem te regisztráltál, hagyd figyelmen kívül ezt a levelet: jelszó nélkül a fiókba senki nem tud belépni.",
      SIGNATURE,
    ].join("\n\n"),
  };
}

/** For someone who tried to sign up with an address that already has an account. */
export function alreadyRegisteredMail(input: {
  to: string;
  name: string;
  url: string;
}): MailMessage {
  return {
    to: input.to,
    subject: "Már van EnerEdge-fiókod",
    text: [
      `Szia ${input.name}!`,
      "Valaki – talán te – regisztrálni próbált ezzel az e-mail-címmel, de ehhez a címhez már tartozik fiók. Itt tudsz belépni:",
      input.url,
      "Ha elfelejtetted a jelszavad, a belépő oldalon kérhetsz újat. Ha nem te voltál, nincs teendőd: a fiókod változatlan.",
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
      "A link 24 óráig érvényes. Ha nem te kérted, hagyd figyelmen kívül ezt a levelet: a jelszavad változatlan marad.",
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
