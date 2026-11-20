# EnerEdge

Naperőmű-monitoring helyszíni eszköz nélkül: a park meglévő routere WireGuard-tunnelt épít a
platformhoz, a platform pedig a felhőből, csak olvasva kérdezi le az invertereket Modbus TCP-n.

Ez a repó a platform. A terv és a mérföldkövek a [`docs/`](docs/) mappában vannak:
[a tulajdonos terve](docs/eneredge-terv-v0.md) és
[a megvalósítási terv](docs/superpowers/plans/2026-11-20-eneredge-mvp-megvalositasi-terv.md).

Ami az első mérföldkő után tudatosan nyitva maradt, az a
[nyitott pontok listájában](docs/nyitott-pontok.md) van.

## Előfeltételek

- [Bun](https://bun.com) 1.4.5 – a pontos verzió a [`.bun-version`](.bun-version) fájlban van.
- Docker – a fejlesztői adatbázishoz (PostgreSQL 18 + TimescaleDB).
- Google Chrome – csak a böngészős végigpróbákhoz (`bun run e2e`).

## Indítás

```bash
docker compose up -d --wait db     # adatbázis a 54329-es porton
cp .env.example .env               # majd töltsd ki benne az AUTH_SECRET-et: openssl rand -base64 32
bun install
bun run db:migrate                 # táblák létrehozása
bun dev                            # elindul a frontend és a backend
```

Ezután a böngészőben: <http://localhost:3000>.

## Két futó rész

| Rész     | Mappa                            | Mi ez                                        | Port |
| -------- | -------------------------------- | -------------------------------------------- | ---- |
| Frontend | [`apps/frontend`](apps/frontend) | Next.js alkalmazás – ezt látja a felhasználó | 3000 |
| Backend  | [`apps/backend`](apps/backend)   | Hono API – belépés, cégek, parkok            | 3001 |

A böngésző **csak a frontend címét** használja. Az `/api/*` kéréseket a frontend adja tovább a
backendnek ([`apps/frontend/src/proxy.ts`](apps/frontend/src/proxy.ts)), így a kettő kívülről egy címnek
látszik. A frontend a backendből csak típusokat vesz át
([`apps/backend/src/contract.ts`](apps/backend/src/contract.ts)); adathoz kizárólag az API-n át jut.

## Levelek fejlesztés közben

Fejlesztés közben valódi e-mail nem megy ki. A levelek annak a terminálnak a kimenetében jelennek
meg, ahol a `bun dev` fut, a backend soraiban:

```
@eneredge/backend:dev | --- mail to te@example.com ---
@eneredge/backend:dev | Subject: Fejezd be a regisztrációt az EnerEdge-en
@eneredge/backend:dev | …
@eneredge/backend:dev | http://localhost:3000/reset-password?token=…&email=te%40example.com&welcome=1
```

Regisztráció után innen másold ki a linket a böngészőbe: azon az oldalon állítod be a jelszavad,
és ezzel be is lépsz.

## Platform-admin

Az Admin oldal (regisztrációra engedélyezett címek, cégenkénti parkkorlát) annak jelenik meg,
akinek a **megerősített** e-mail-címe szerepel a `.env` `PLATFORM_ADMIN_EMAILS` sorában
(több cím vesszővel elválasztva). A módosítás után indítsd újra a `bun dev`-et.

## Parancsok

| Parancs                                      | Mit csinál                                                                                                                                            |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun dev`                                    | Elindítja a frontendet és a backendet; a kód szerkesztésekor maguktól frissülnek.                                                                     |
| `bun test`                                   | Egység- és API-tesztek. Mindegyik tesztfájl saját, eldobható adatbázist kap.                                                                          |
| `bun run e2e`                                | Böngészős végigpróbák: felépíti a frontendet, elindítja a teljes rendszert egy eldobható adatbázissal, és Chrome-ban végigjátssza a forgatókönyveket. |
| `bun run check`                              | Típusellenőrzés minden csomagban.                                                                                                                     |
| `bun run lint`                               | Formázás és kódminőség ellenőrzése (Biome).                                                                                                           |
| `bun run format`                             | Ugyanez, a javítható hibák kijavításával.                                                                                                             |
| `bun run db:migrate`                         | A még le nem futott adatbázis-migrációk alkalmazása.                                                                                                  |
| `bun run db:generate --name=<mit_valtoztat>` | Migráció készítése a séma változásaiból.                                                                                                              |
| `bun run build`                              | A frontend éles felépítése.                                                                                                                           |

A végigpróbákhoz hasznos:

- `bun run e2e auth` – csak azok a fájlok futnak, amelyek nevében szerepel az „auth”.
- `E2E_SKIP_BUILD=1 bun run e2e` – az előző felépítést használja (ha csak a teszt változott).
- `E2E_BROWSER=webkit bun run e2e` – macOS-en a rendszer WebKitjével fut Chrome helyett.

## Mappaszerkezet

```
apps/
  backend/             Hono API (Bun)
    src/index.ts         belépési pont
    src/app.ts           az összes útvonal egy helyen
    src/contract.ts      amit a frontend láthat a backendből: csak típusok
    src/auth.ts          belépés, cégek, meghívók (Better Auth) beállítása
    src/routes/          egy fájl = egy útvonalcsoport (health, config, account, me, parks, admin)
    src/middleware/      munkamenet- és cégtagság-ellenőrzés
    test/                API-tesztek; a test/support/ a közös segédfüggvényeiké
  frontend/            Next.js (App Router)
    src/app/             az oldalak; a mappák neve az oldal címe
    src/components/      saját komponensek
    src/components/ui/   shadcn/ui komponensek (a shadcn CLI-vel felvéve)
    src/components/form/ az űrlapok közös alapja (TanStack Form)
    src/lib/             adatlekérdezések (TanStack Query) és segédfüggvények
    src/i18n/hu.ts       a felület összes szövege
packages/
  db/                  adatbázis: séma, migrációk, lekérdezések (Drizzle)
    src/schema/          táblák
    src/repositories/    lekérdezések; a cégadatokat érintők OrgScope-ot kérnek
    src/scope.ts         OrgScope: a cégtagság bizonyítéka
    migrations/          SQL-migrációk
e2e/                   böngészős végigpróbák a teljes rendszeren
docs/                  a terv és a megvalósítási tervek
```

## Néhány szabály, amihez a kód tartja magát

- **Bérlő-elszigetelés:** a cégek adataihoz a kód a
  [`packages/db/src/repositories/`](packages/db/src/repositories) függvényein át nyúl, és ezek
  `OrgScope`-ot kérnek, amelyet kizárólag a tagság ellenőrzése állít elő
  ([`packages/db/src/scope.ts`](packages/db/src/scope.ts)). Más cég erőforrására a válasz 404.
  Ez megállapodás, nem a fordító által kikényszerített garancia: az adatbázis-kapcsolat közvetlenül
  is elérhető, és a platform-admin függvényei (parkkorlát, engedélyezett címek) szándékosan nem
  kérnek `OrgScope`-ot. Új lekérdezés ezért mindig a `repositories/` mappába kerüljön.
- **Regisztráció:** a regisztráció nem állít be jelszót. A megadott címre egy link megy
  (24 óráig érvényes, egyszer használható), és aki megnyitja, az állítja be a jelszót – más címével
  regisztrálni így semmit nem ér. A válasz minden címre ugyanaz, ezért kívülről nem derül ki, kinek
  van fiókja vagy meghívója ([`apps/backend/src/routes/account.ts`](apps/backend/src/routes/account.ts)).
- **Szóhasználat:** a felületen „cég”; a kódban ugyanez `organization` (a Better Auth táblái és
  végpontjai miatt), röviden `org`, a felülethez közeli nevekben `company`.
- **Szövegek:** a felület minden szövege az [`apps/frontend/src/i18n/hu.ts`](apps/frontend/src/i18n/hu.ts)
  fájlban van; az API hibakódot ad, nem szöveget.
- **Felület:** shadcn/ui komponensek, a szerveradat TanStack Queryvel, az űrlapok TanStack Formmal.
  Egy űrlap az `onSubmit`-ban küldi el a kérést; ha a szerver elutasítja, a `showRefusal` teszi ki
  az okot az űrlapra vagy az érintett mező alá.
- **Olvashatóság:** kiírt, beszédes nevek; egy fájl egy felelősség; megjegyzés ott, ahol a
  „miért” nem látszik a kódból.
- **Titkok:** csak a `.env` fájlban, amely nem kerül a repóba.

## Tudnivalók

- Új csomag telepítése után indítsd újra a `bun dev`-et: a futó folyamat nem látja az újonnan
  telepített csomagokat.
- A Next.js is Bun alatt fut (`bun --bun next …`), Node.js-re nincs szükség.
- A belépés tábláit a Better Auth CLI generálja; a parancs az
  [`apps/backend/auth.cli.ts`](apps/backend/auth.cli.ts) elején áll.
