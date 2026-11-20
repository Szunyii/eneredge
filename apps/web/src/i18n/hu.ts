import type { ApiErrorCode, FieldErrorCode, ParkStatus } from "@eneredge/api";

/**
 * Every text of the interface, in Hungarian, informal voice. Components take their
 * wording from here, and the end-to-end tests find elements by these same strings.
 * No runtime imports: the tests load this module on its own.
 */
export const hu = {
  common: {
    appName: "EnerEdge",
    description: "Naperőművek felügyelete helyszíni eszköz nélkül.",
    contactEmail: "info@eneredge.tech",
    retry: "Próbáld újra",
    signOut: "Kilépés",
  },
  nav: {
    main: "Fő navigáció",
    home: "EnerEdge – kezdőlap",
    parks: "Parkok",
    alerts: "Jelzések",
    settings: "Beállítások",
    admin: "Admin",
  },
  auth: {
    // Fields shared by the forms
    email: "E-mail-cím",
    password: "Jelszó",
    name: "Neved",
    passwordHint: "Legalább 10 karakter.",
    passwordTooShort: "A jelszó legalább 10 karakter legyen.",
    invalidEmail: "Ez nem tűnik érvényes e-mail-címnek.",

    // Sign-in
    signInTitle: "Belépés",
    signIn: "Belépés",
    forgotPassword: "Elfelejtetted a jelszavad?",
    noAccountYet: "Nincs még fiókod?",
    signUpLink: "Regisztrálj",
    invalidCredentials: "Hibás e-mail-cím vagy jelszó.",
    emailNotVerified:
      "Még nem erősítetted meg az e-mail-címed. Most küldtünk egy új levelet a megerősítő linkkel.",
    verificationFailed:
      "A megerősítő link lejárt, vagy már felhasználtad. Lépj be, és küldünk egy újat.",

    // Sign-up
    signUpTitle: "Regisztráció",
    signUpLead: "Hozz létre egy fiókot, utána felveheted a céged és a parkjaidat.",
    createAccount: "Fiók létrehozása",
    haveAccount: "Van már fiókod?",
    signInLink: "Lépj be",
    signupClosed:
      "A regisztráció jelenleg meghívásos. Ha szeretnéd kipróbálni az EnerEdge-et, írj nekünk: info@eneredge.tech",

    // After sign-up
    checkEmailTitle: "Nézd meg a leveleidet",
    checkEmailSentTo: "Küldtünk egy levelet ide:",
    checkEmailSent: "Küldtünk egy levelet.",
    checkEmailWhatNext: "A benne lévő linkre kattintva megerősíted a címed, és be is lépsz.",
    resend: "Levél újraküldése",
    resent: "Elküldtük újra. Nézd meg a levélszemét mappát is.",

    // Forgotten password
    forgotTitle: "Elfelejtett jelszó",
    forgotLead:
      "Add meg az e-mail-címed, és küldünk egy linket, amellyel új jelszót állíthatsz be.",
    sendResetLink: "Link küldése",
    resetLinkSent: "Ha van fiók ezzel a címmel, elküldtük a levelet. Nézd meg a leveleidet.",
    backToSignIn: "Vissza a belépéshez",

    // New password
    resetTitle: "Új jelszó beállítása",
    newPassword: "Új jelszó",
    saveNewPassword: "Jelszó mentése",
    resetDone: "Az új jelszavad beállítva. Lépj be vele.",
    resetLinkInvalid: "Ez a link lejárt, vagy már felhasználtad.",
    requestNewLink: "Kérj új linket",
  },
  onboarding: {
    title: "Hozd létre a céged",
    lead: "A parkjaid egy céghez tartoznak. Később a kollégáidat is meghívhatod ide.",
    companyName: "Cégnév",
    slug: "Azonosító",
    slugHint: "A céged oldalainak címe ezzel kezdődik majd:",
    slugInvalid: "3–40 karakter lehet: kisbetű, szám és kötőjel.",
    slugTaken: "Ez az azonosító már foglalt. Válassz másikat.",
    create: "Cég létrehozása",
  },
  invitation: {
    title: "Meghívó",
    signedOutLead:
      "Meghívtak egy céghez az EnerEdge-en. Az elfogadáshoz lépj be – ha még nincs fiókod, regisztrálj azzal az e-mail-címmel, amelyre a meghívót kaptad.",
    signUp: "Regisztráció",
    signIn: "Belépés",
    lead: (inviterEmail: string, organizationName: string) =>
      `${inviterEmail} meghívott ehhez a céghez: ${organizationName}.`,
    accept: "Meghívó elfogadása",
    invalid: "Ez a meghívó nem érvényes: lejárt, visszavonták, vagy nem ehhez a fiókhoz szól.",
    goHome: "Tovább a kezdőlapra",
  },
  parks: {
    title: "Parkok",
    empty: "Még nincs parkod.",
  },
  park: {},
  settings: {},
  alerts: {},
  admin: {},
  notFound: {
    title: "Ez az oldal nem található",
    body: "Lehet, hogy elírtad a címet, vagy az oldal már nincs meg.",
    home: "Vissza a kezdőlapra",
  },
  status: {
    draft: "Vázlat",
    connecting: "Bekötés alatt",
    online: "Működik",
    degraded: "Részben működik",
    offline: "Nincs kapcsolat",
  } satisfies Record<ParkStatus, string>,
  errors: {
    unauthenticated: "A folytatáshoz lépj be újra.",
    forbidden: "Ehhez nincs jogosultságod.",
    not_found: "Ezt nem találjuk, vagy nincs hozzá hozzáférésed.",
    validation: "Nézd át a megjelölt mezőket.",
    name_taken: "Ezen a néven már van parkod.",
    park_limit_reached: "Elérted a felvehető parkok számát. Írj nekünk, és megemeljük.",
    internal: "Valami elromlott nálunk. Próbáld újra egy kicsit később.",
  } satisfies Record<ApiErrorCode, string>,
  fieldErrors: {
    required: "Ezt a mezőt töltsd ki.",
    too_long: "Ez túl hosszú.",
    out_of_range: "Ez az érték kívül esik a megengedett tartományon.",
    invalid: "Ez az érték nem érvényes.",
  } satisfies Record<FieldErrorCode, string>,
};

export type Messages = typeof hu;
