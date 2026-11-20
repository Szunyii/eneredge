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
    signInTitle: "Belépés",
    signUpTitle: "Regisztráció",
  },
  onboarding: {},
  parks: {},
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
