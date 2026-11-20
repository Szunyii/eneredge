import type { ApiErrorCode, FieldErrorCode, ParkStatus } from "@eneredge/backend";

/** Where people write to us; it appears inside a few of the texts below. */
const CONTACT_EMAIL = "info@eneredge.tech";

/**
 * Every text of the interface, in Hungarian, informal voice. Components take their
 * wording from here, and the end-to-end tests find elements by these same strings.
 * No runtime imports: the tests load this module on its own.
 */
export const hu = {
  common: {
    appName: "EnerEdge",
    description: "Naperőművek felügyelete helyszíni eszköz nélkül.",
    retry: "Próbáld újra",
    signOut: "Kilépés",
    cancel: "Mégse",
    save: "Mentés",
  },
  nav: {
    main: "Fő navigáció",
    home: "EnerEdge – kezdőlap",
    parks: "Parkok",
    alerts: "Jelzések",
    settings: "Beállítások",
    admin: "Admin",
    account: "Fiók",
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
      "Ennek a fióknak még nincs megerősítve az e-mail-címe. Kérj új linket az „Elfelejtetted a jelszavad?” pontban: azzal a címed is megerősíted.",

    // Sign-up
    signUpTitle: "Regisztráció",
    signUpLead:
      "Add meg a neved és az e-mail-címed. Küldünk egy linket, amelyen beállítod a jelszavad.",
    createAccount: "Fiók létrehozása",
    haveAccount: "Van már fiókod?",
    signInLink: "Lépj be",
    signupByInvitation: `A regisztráció jelenleg meghívásos: fiókot csak meghívott vagy általunk engedélyezett e-mail-címmel lehet létrehozni. Ha szeretnéd kipróbálni az EnerEdge-et, írj nekünk: ${CONTACT_EMAIL}`,

    // After sign-up
    checkEmailTitle: "Nézd meg a leveleidet",
    checkEmailSentTo: "Küldtünk egy levelet ide:",
    checkEmailIfAllowed: "Ha ezzel a címmel lehet regisztrálni, küldtünk rá egy levelet:",
    checkEmailWhatNext: "A benne lévő linken tudsz továbblépni; a link 24 óráig érvényes.",
    resend: "Levél újraküldése",
    resent: "Elküldtük újra. Nézd meg a levélszemét mappát is.",

    // The first password of a new account
    welcomeTitle: "Állítsd be a jelszavad",
    welcomeLead: "Ezzel fejezed be a regisztrációt, és be is lépsz.",
    accountOf: "Fiók:",
    savePasswordAndSignIn: "Jelszó mentése és belépés",

    // Forgotten password
    forgotTitle: "Elfelejtett jelszó",
    forgotLead:
      "Add meg az e-mail-címed, és küldünk egy linket, amellyel új jelszót állíthatsz be.",
    sendResetLink: "Link küldése",
    resetLinkSent: "Ha van fiók ezzel a címmel, elküldtük a levelet. Nézd meg a leveleidet.",
    backToSignIn: "Vissza a belépéshez",

    // New password
    resetTitle: "Új jelszó beállítása",
    resetLead: "Add meg az új jelszavad; utána be is lépsz vele.",
    newPassword: "Új jelszó",
    resetDone: "A jelszavad beállítva. Lépj be vele.",
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
    new: "Új park",
    empty: "Még nincs parkod.",
    emptyHintForManagers: "Vedd fel az elsőt: a nevével és a helyével kezdünk.",
    emptyHintForMembers: "Parkot a cég tulajdonosa vagy adminja tud felvenni.",
  },
  park: {
    // The form
    newTitle: "Park felvétele",
    newLead: "Először az alapadatokat kérjük. A bekötés a következő lépés lesz.",
    name: "Park neve",
    latitude: "Szélesség",
    longitude: "Hosszúság",
    coordinateHint: "Tizedes fokban, például 47,4979.",
    timezone: "Időzóna",
    create: "Felvétel",
    save: "Változások mentése",
    // The park's page
    details: "Alapadatok",
    status: "Állapot",
    location: "Hely",
    pollInterval: "Lekérdezési ütem",
    seconds: (count: number) => `${count} másodperc`,
    addedOn: "Felvéve",
    edit: "Szerkesztés",
    saved: "A park adatai elmentve.",
    // Deleting
    delete: "Törlés",
    deleteQuestion: "Törlöd ezt a parkot?",
    deleteWarning: (name: string) =>
      `„${name}” és minden beállítása törlődik. Ezt nem lehet visszavonni.`,
    keep: "Megtartom",
    confirmDelete: "Park törlése",
    deleted: (name: string) => `„${name}” törölve.`,
  },
  settings: {
    title: "Beállítások",
    readOnly: "A beállításokat a cég tulajdonosa és adminjai módosíthatják.",
    // Company
    companyTitle: "Cég",
    companyName: "Cégnév",
    companySaved: "A cégnév elmentve.",
    // Members
    membersTitle: "Tagok",
    member: "Tag",
    role: "Szerep",
    roles: { owner: "Tulajdonos", admin: "Admin", member: "Tag" },
    you: "te",
    roleOf: (name: string) => `${name} szerepe`,
    roleSaved: "A szerep elmentve.",
    lastOwner: "A cégnek mindig kell egy tulajdonos.",
    remove: "Eltávolítás",
    removeOf: (name: string) => `${name} eltávolítása`,
    removeQuestion: (name: string) => `Eltávolítod őt: ${name}?`,
    removeWarning: "Azonnal elveszíti a hozzáférését a cég parkjaihoz.",
    confirmRemove: "Eltávolítom",
    removed: (name: string) => `${name} eltávolítva.`,
    // Invitations
    invitationsTitle: "Meghívók",
    invitationsLead: "A meghívott e-mailben kap egy linket, amely 7 napig érvényes.",
    inviteEmail: "A meghívott e-mail-címe",
    invite: "Meghívás",
    invited: (email: string) => `Meghívó elküldve: ${email}`,
    alreadyMember: "Ez a cím már tagja a cégnek.",
    noPending: "Nincs függő meghívó.",
    expires: (date: string) => `Lejár: ${date}`,
    cancelInvitation: "Visszavonás",
    cancelInvitationOf: (email: string) => `Meghívó visszavonása: ${email}`,
    invitationCancelled: "A meghívó visszavonva.",
  },
  alerts: {
    title: "Jelzések",
    empty: "Nincs jelzés.",
    emptyHint:
      "Itt jelennek majd meg a parkjaid jelzései: megszakadt kapcsolat, adathiány, inverterhiba.",
  },
  admin: {
    title: "Admin",
    // Sign-up allowlist
    allowlistTitle: "Regisztrációra engedélyezett címek",
    allowlistLead:
      "Amíg a regisztráció meghívásos, csak ezek a címek, a meghívottak és a platform adminjai hozhatnak létre fiókot.",
    allowEmail: "Engedélyezendő e-mail-cím",
    allow: "Engedélyezés",
    allowed: (email: string) => `${email} mostantól regisztrálhat.`,
    noAllowed: "Még nincs engedélyezett cím.",
    removeAllowed: "Törlés",
    removeAllowedOf: (email: string) => `Engedély törlése: ${email}`,
    // Companies
    companiesTitle: "Cégek",
    companiesLead: "Egy cég alapból 10 parkot vehet fel. Itt emelheted meg.",
    company: "Cég",
    parkCount: "Parkok",
    parkLimit: "Parkkorlát",
    parkLimitOf: (companyName: string) => `Parkkorlát – ${companyName}`,
    saveLimitOf: (companyName: string) => `Parkkorlát mentése – ${companyName}`,
    limitSaved: "A parkkorlát elmentve.",
    limitInvalid: "1 és 1000 közötti egész szám lehet.",
  },
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
