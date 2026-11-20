# Eneredge – terv és átadás a megvalósítónak (v0)

*2026-11-19. Ez a dokumentum annak szól, aki megépíti az MVP-t (Claude Code): elég belőle megtervezni és megépíteni, a tulajdonos újbóli kérdezése nélkül – kivéve a 16. pont nyitott kérdéseit.*

Jelölések: **[D]** a tulajdonos döntése, nem változtatható kérdezés nélkül · **[J]** javaslat, amit a megvalósító indokolt esetben felülbírálhat és jelez · **[N]** nyitott.

**Első lépés a megvalósítónak:** olvasd el ezt és a 17. pont anyagait, majd írj ebből megvalósítási tervet a 15. pont sorrendjében, és azt hagyasd jóvá, mielőtt kódot írsz.

## Röviden

- Napelempark-monitoring nagyobb üzemeltető cégeknek, **helyszíni eszköz nélkül**: a park meglévő routere WireGuard tunnelt épít a platformhoz, a platform a felhőből olvas Modbus TCP-n.
- A kezelő **maga veszi fel a parkot** egy varázslóval; a szerveren nincs kézi teendő.
- **Csak olvasás.** Vezérlés nincs az MVP-ben.
- Az eszközök különbözők, ezért **eszközprofilok** írják le, mit kell lekérdezni és az melyik közös mezőnek felel meg. Új profilt AI vázol a gyártói dokumentumból, de csak ellenőrzés és jóváhagyás után élesedik. Három profil kész.
- **5 másodperces** lekérdezési cél, parkonként külön tunnel, minden egy VPS-en.
- Stack: **Bun mindenhol** (Hono API, React frontend Bun bundlerrel, poller), PostgreSQL + TimescaleDB.

## 1. Mi ez, kinek, miért

- **Cél:** napelempark-monitoring hálózat, amely új eszköz telepítése nélkül olvassa be a parkok adatait. [D]
- **Kinek:** elsősorban nagyobb üzemeltető cégeknek, akik több parkot kezelnek. [D]
- **Miért:** ma parkonként külön adatgyűjtő doboz (pl. meteocontrol Blue'Log) és annak költsége kell; ezt váltjuk ki a routerrel épített VPN-kapcsolattal. [D]
- **Élmény:** egy park integrálása legyen nagyon egyszerű és önkiszolgáló, mint egy új projekt felvétele a Vercelen. Nem szállítunk és nem telepítünk eszközt: kompatibilitást adunk, a kezelő a saját eszközeivel köt be. A kezelő egy helyen lássa az összes parkját. [D]
- **Érték:** élő adatfolyam, és elemzések, amelyek az üzemeltető munkáját segítik: meghibásodás jelzése, adathiány. [D]
- **Üzlet:** parkonkénti havidíj. [D]
- **Csapat:** egy fejlesztő építi és üzemelteti; a rendszernek kicsinek és egy ember által üzemeltethetőnek kell maradnia. [D]

## 2. Az MVP terjedelme

**Benne van**

1. Regisztráció, szervezet (cég), több felhasználó meghívással.
2. Park önkiszolgáló felvétele varázslóval: WireGuard-konfig a kezelő routeréhez, eszközök megadása, kapcsolatteszt lépésenkénti diagnosztikával.
3. Lekérdezés a három kész eszközprofillal (Huawei SUN2000, Sungrow SG, SunSpec), 5 mp-es céllal.
4. Élő nézet: parklista állapottal, parkoldal, inverteroldal, idősoros grafikonok.
5. Jelzések: tunnel-szakadás, adathiány, inverterhiba; e-mail értesítés.
6. Új eszközprofil: AI-vázlat a gyártói dokumentumból → automatikus ellenőrzés → jóváhagyás egy platform-admin felületen.
7. Parkonkénti havidíj számlázása.

**Nincs benne**

- Vezérlés: a platform semmit nem ír az eszközökbe. [D]
- Helyszíni eszköz vagy agent szállítása, telepítése. [D]
- Gyártói felhő-API-k (FusionSolar, Sunny Portal stb.) mint bekötési mód – később. [J]
- Hálózati engedélyes felé megfelelés, erőműszabályzó funkció. [J]
- Mobilalkalmazás; többnyelvű felület (a felület magyar, a szövegek kiszervezve, hogy később fordítható legyen). [J]
- Teljesítmény-összehasonlító és előrejelző elemzések. [J]
- Hálózati mérő, időjárás-állomás, parkszintű logger mint külön eszközosztály – a séma és a profilformátum bővíthető rá, de az MVP csak invertert kezel. [J]

**Ami kudarc lenne akkor is, ha „működik"** [J]

- Egy park felvételéhez kézi beavatkozás kell a szerveren.
- Hibás párosítás csendben rossz adatot ír az adatbázisba.
- A platform bármilyen író Modbus-kérést küld.
- Egy park hálózatából elérhető egy másik park.
- A lekérdezés megzavarja a park saját loggerét, vagy a kezelő tudta nélkül kimeríti a SIM adatkeretét.

## 3. Adottságok és korlátok

- Minden egy VPS-en fut: frontend, API, poller, adatbázis. [D]
- Backendben Bun + Hono; a frontend is Bunnal készül. [D]
- Pilot park még nincs; a fejlesztés az ananasar Modbus tesztszerveren folyik. [D]
- A Modbus TCP-ben nincs hitelesítés és titkosítás: csak tunnelen belül mehet.
- A parkok belső hálózatai átfedik egymást (sok helyen 192.168.1.0/24).
- Sok park 4G-n kapcsolódik, véges adatkerettel.
- Eszközoldali korlátok (kliensszám, timeout, RS485 sebesség): `eszkozprofilok-v0-kutatas.md`.

## 4. Mérlegelt megközelítések

| Kérdés | Lehetőségek | Választás |
|---|---|---|
| Hogyan jut ki az adat a parkból? | (a) VPN a meglévő routerrel, a felhő olvas Modbuson · (b) gyártói felhő-API · (c) helyszíni agent vagy doboz | **(a)** [D]. A (b) késleltetett és gyártónként külön integráció, később jöhet; a (c) ellentmond az „eszköz nélkül" célnak. |
| Hogyan lesz a gyártói adatból közös mező? | (a) kézzel írt profilok · (b) AI által javasolt, ellenőrzött és jóváhagyott profilok · (c) AI az adatútban, minden olvasást értelmez | **(b)** [D]. Az (a)-nál a fejlesztő a szűk keresztmetszet; a (c) nem determinisztikus, olvasásonként költséges, és a hibás adat csendben bekerülne. A Modbus adata címke nélküli, ezért a párosítás a lekérdezés előtt történik: a profil maga a lekérdezési terv. |
| Tunnel-topológia | parkonként külön · cégenként egy közös | **Parkonként külön** [D]. |
| Miben készül a poller, és hogyan különülnek el az átfedő park-hálózatok? | (a) Go, processzen belüli (userspace) WireGuarddal · (b) Bun, kernel WireGuarddal | **(b)** [D: Bun előnyben]. Az (a) nem igényelne hálózati jogosultságot, de második nyelvet hozna. A (b)-n belül a parkonkénti hálózati névtér + parkonkénti process helyett forráscím-alapú routing, egyetlen processzel [J] – lásd 6. pont. |
| Lekérdezési ütem | 60 mp · 5 mp | **5 mp cél** [D], szintekre bontva [J] – lásd 7. pont. |

## 5. Felépítés

```
 böngésző ──HTTPS──▶ Caddy ──▶ web + api  (Bun: Hono API, React app)
                                  │ SQL            ▲ LISTEN/NOTIFY
                                  ▼                │
                          PostgreSQL + TimescaleDB
                                  ▲ kötegelt INSERT + NOTIFY
                                  │
                              poller  (Bun, egy process)
                  wg-p1 │   wg-p2 │   …        kernel WireGuard, parkonként egy interfész
                        ▼         ▼
                 park 1 router   park 2 router        a kezelő saját eszköze
                        │         │
                 logger / inverterek (Modbus TCP :502)
```

- **web + api:** egy Bun process. A Hono szolgálja az `/api/*` útvonalakat, a React alkalmazás HTML-importként megy a `Bun.serve` `routes` alatt. Feladatai: auth, szervezetek, parkok, eszközök, profilok, varázsló (WireGuard-konfig előállítása), élő adat SSE-n, jelzések, számlázási webhook, profil-asszisztens háttérfeladat. Hálózati jogosultsága nincs.
- **poller:** külön Bun process ugyanabban a repóban, hogy az API újraindítása ne szakítsa meg a lekérdezést. Kezeli a WireGuard interfészeket, lekérdez, dekódol, ír, jelez.
- **adatbázis:** a két process csak ezen keresztül beszél egymással (táblák + LISTEN/NOTIFY).
- **ananasar:** fejlesztésben és CI-ban a Modbus eszközök helyett.

## 6. Hálózat

Az elv [D]: parkonként külön tunnel, a kezelő routere kezdeményez a platform felé. A részletek [J]:

- A VPS-en parkonként egy kernel WireGuard interfész (`wg-p<N>`), saját UDP porttal (pl. 51820 + N), saját kulcspárral és saját hub-oldali tunnel címmel. Közös interfész azért nem jó, mert azon belül a WireGuard az AllowedIPs alapján választ peert, és az átfedő park-hálózatokkal ez nem megy.
- **Elszigetelés egyetlen poller processzel:** a poller minden TCP-kapcsolat helyi címét a park hub-oldali tunnel címére köti (`net.connect({ localAddress })`), és forráscím-alapú routing viszi a megfelelő interfészre:

  ```
  ip link add wg-p7 type wireguard
  wg set wg-p7 listen-port 51827 private-key <fájl> \
      peer <router pubkey> allowed-ips <park LAN CIDR>,<router tunnel IP>/32
  ip addr add <hub tunnel IP>/32 dev wg-p7
  ip link set wg-p7 up
  ip route add default dev wg-p7 table 1007
  ip rule add from <hub tunnel IP> lookup 1007
  nft add rule inet filter input iifname "wg-p7" ip daddr != <hub tunnel IP> drop
  ```

  A park táblájában alapértelmezett útvonal van a tunnelre, hogy a kötött forráscímről semmi ne mehessen ki a VPS saját hálózati kapcsolatán; ami nincs az AllowedIPs-ben, azt a WireGuard eldobja. Az eszközök címének a park megadott belső hálózatába kell esnie (felvételkor ellenőrizni). Az `rp_filter`-hez nem kell nyúlni; a fenti nft-szabály gondoskodik róla, hogy egy park tunneléből ne lehessen egy másik park hub-oldali címét megszólítani.

  Ellenőrizve: a Bun 1.4.4 `net.connect` tiszteletben tartja a `localAddress`-t (ha a cím nincs a gépen, hibát ad, nem választ másikat). A routing sémát kipróbáltuk hálózati névterekben, veth-párokkal: két park azonos 192.168.1.10 című eszköze mindig a saját kötött forráscíméről érhető el, kötetlen socket nem jut ki. **WireGuard-interfésszel még nem** – ezt a 4. mérföldkő elején integrációs teszttel kell igazolni. Ha nem válik be, a tartalék a parkonkénti hálózati névtér.
- Tűzfal a VPS-en: a `wg-p*` interfészekre és azokról nincs továbbítás (forward tiltva), és róluk új bejövő kapcsolat sem fogadható. Így park → park és park → platform irányú forgalom nem lehetséges, csak a poller kezdeményez. Ez külön szabály kell legyen, mert a Docker a saját hálózataihoz bekapcsolja az IP-továbbítást.
- Parkonként egy UDP port nyitva a VPS tűzfalán (a tartomány előre megnyitható).
- A tunnel-címek tartománya beállítás (alap pl. 10.203.0.0/16, parkonként egy címpár). Felvételkor ellenőrizni kell, hogy nem fed át a park megadott belső hálózatával.
- A kezelő routerére kerülő konfig:

  ```
  [Interface]
  PrivateKey = <a platform generálja, egyszer tölthető le>
  Address = <router tunnel IP>/32

  [Peer]
  PublicKey = <hub pubkey>
  Endpoint = <vps host>:<51820 + N>
  AllowedIPs = <hub tunnel IP>/32
  PersistentKeepalive = 25
  ```

  A routeren ezen felül egy teendő van, amit a varázsló routertípusonként leír: a tunnelből a belső hálózat felé engedélyezni a megadott eszközök 502-es portját.
- **Kinek a címét látja az eszköz?** Alapesetben a routeren nincs címfordítás, így az eszköz a platform hub-oldali tunnel címét látja – ezt kell a loggerben engedélyezett kliensként megadni, és a varázsló ki is írja. Ez akkor működik, ha az eszköz alapértelmezett átjárója ez a router. Ha nem az (a kapcsolatteszten a port néma marad), a tartalék: címfordítás a routeren a tunnel → belső hálózat irányra, és ilyenkor a loggerben a router belső címét kell engedélyezni – a varázsló ezt bekéri.
- A poller host hálózaton fut `NET_ADMIN` jogosultsággal. A `tunnel` tábla a kívánt állapot: a poller induláskor és változáskor ehhez igazítja az interfészeket (létrehoz, módosít, töröl). Park törlésekor az interfész, a szabály és a kulcs megszűnik.

## 7. Poller [J]

- **Modbus kliens:** saját, minimális Modbus TCP megvalósítás, amely csak a 03 és 04 függvénykódot ismeri. Író függvénykód a kódban sem létezhet. Referencia: `tools/profile_check.py`.
- **Kapcsolatok:** (park, host, port) hármasonként egy tartós TCP-kapcsolat; azon a kérések egymás után mennek, mert egy logger mögött több unit ID osztozik egy kapcsolaton. A parkok egymással párhuzamosan futnak.
- **Szintek:** a profil minden olvasási blokkja `fast` (cél 5 mp), `slow` (60 mp) vagy `static` (csatlakozáskor és naponta). A gyors szint eszközönként egyetlen kérés.
- **Az 5 mp cél, nem garancia.** Ha egy kör nem fér bele, a kérések nem torlódnak: a következő kör az előző befejezése után indul. A ténylegesen elért ütemet a poller méri, tárolja, és a felület mutatja. Az ütem parkonként állítható (4G-s parkok adatkerete miatt), a varázsló pedig megmutatja a várható havi adatforgalmat.
- **Hibakezelés:** a profilban szereplő timeout felső korlát. Mivel egy kapcsolaton a kérések sorban mennek, egy néma eszköz nem tarthatja fel a többit: meghatározott számú egymást követő hiba után az eszköz „nem elérhető", kikerül a gyors körből, ritkán próbálkozunk vele újra, és esemény keletkezik.
- **Dekódolás:** a profil szerint kanonikus értékekre. Az érvénytelent jelző nyers érték NULL lesz. A hihetőségi tartományon kívüli érték nem kerül a mérésoszlopba (NULL), hanem számlálódik, és tartós előfordulásnál esemény lesz belőle. A poller eszközönként megjegyzi a ritkábban olvasott értékeket, amelyektől a gyors szint dekódolása függ (pl. Sungrow `output_type`).
- **Nyers regiszterek megőrzése:** a beolvasott blokkok nyersen is eltárolódnak rövid ideig (alap 14 nap), hogy egy profil javítása után az adat újradekódolható legyen.
- **Írás:** körönként kötegelt INSERT; utána `NOTIFY` a park csatornáján, amely csak azt jelzi, hogy új adat van (park, időbélyeg) – a NOTIFY üzenete 8000 bájtnál kisebb kell legyen, a mért értékek ezért nem ebben utaznak.

## 8. Mapping réteg

Az elv [D]: profilok; AI csak vázlatot ír, és soha nincs az adatútban. A részletek [J]:

- **Kanonikus séma:** `canonical/inverter.v0.yaml` – ezt tároljuk egy inverterről, mezőnként egy mértékegységgel. Profil csak ezekre a mezőkre képezhet le.
- **Profilformátum v0:** a három kész profil (`profiles/*.yaml`) a minta; a formátum leírása a csomag README-jében. Két fajta van: `register-map` (fix címek, olvasási blokkok, pontok) és `sunspec` (felderített modellek, pontnevek).
- **Megfelelés:** a TypeScript-megvalósításnak a `fixtures/*.ananas` tesztadatokra pontosan a `fixtures/*.expected.json` értékeit kell adnia.
- **Eszköz felvétele:** (1) SunSpec-próba – ha a jelző megvan, a `sunspec-inverter` profil megy; (2) különben a kezelő eszköztípust választ, és ha van jóváhagyott profil, annak `identify` szabálya erősíti meg; (3) ha nincs profil, a kezelő feltölti a gyártói regiszterleírást, és indul a vázlatkészítés. Addig az eszköz „profilra vár" állapotban van.
- **Vázlat → éles profil:** LLM-hívás a dokumentummal és a kanonikus sémával → profil YAML → statikus ellenőrzés (séma, csak kanonikus mezők, minden pont lefedve olvasási blokkal) → élő próba az eszközön (tartományok és keresztellenőrzések) → platform-admin jóváhagyás → verziózott profil, amely minden szervezet számára elérhető.
- **Keresztellenőrzések** (a sémában): teljesítmény ≤ 1,15 × névleges; fázisok összege ≈ hatásos teljesítmény; AC/DC arány 0,85–1,02; az energiaszámláló nem csökken. Ezek csak termelés közben futnak le, ezért új profil jóváhagyása nappal, terhelés alatt történjen. A tartományellenőrzés önmagában nem fogja meg a „rossz, de hihető" regisztert – ezért kell az emberi jóváhagyás.
- **Profilállapotok:** `draft` → `doc-verified` → `device-verified`. A három kész profil `doc-verified`; `device-verified` akkor lesz egy profil, amikor az első valódi eszköz átment az élő próbán, és az admin megerősítette. `draft` profillal nincs adatgyűjtés.
- **Eszközönkénti élő próba:** minden új eszköz az első csatlakozáskor automatikusan átmegy a tartomány- és keresztellenőrzésen, a profil állapotától függetlenül (egy profil egy egész termékcsaládot fed le). Amíg a keresztellenőrzések nem futottak le sikeresen – például éjszaka kötötték be –, az eszköz adata „ideiglenes" jelölést kap, és a felület ezt mutatja. Sikertelen próbánál az adatgyűjtés megáll, és esemény keletkezik. Ez a próba a 4. mérföldkő része, nem a profil-asszisztensé.

## 9. Adatmodell [J]

- `organization`, `user`, `member`, `invitation` – az auth könyvtár szervezetkezelése szerint.
- `park`: szervezet, név, hely (koordináta, időzóna), állapot (`draft`, `connecting`, `online`, `degraded`, `offline`), gyors ütem (alap 5 mp), számlázás kezdete.
- `tunnel` (parkonként egy): sorszám, UDP port, hub és router tunnel címe, kulcsok (a privát titkosítva), a park belső hálózatai, utolsó kézfogás, forgalmi számlálók.
- `device`: park, fajta (`inverter`), host, port, unit ID, profil és verzió, azonosítók (gyártó, típus, sorozatszám, névleges teljesítmény), állapot, az élő próba állapota (`pending`, `provisional`, `passed`, `failed`), utoljára látva.
- `profile`: azonosító, verzió, állapot, YAML, forrásdokumentum, ki hagyta jóvá és mikor.
- `inverter_reading` (hypertable; idő + eszköz): a kanonikus skalár mezők mind nullázható oszlopok. Egy sor azt tartalmazza, amit abban a körben olvastunk: a gyors körben a gyors blokk mezőit, a lassú körben a többit is. Azért egy tábla, mert az, hogy egy mező melyik szinten olvasható, profilonként más (a Huawei a hőmérsékletet a gyors blokkban adja, a SunSpec az energiaszámlálót is).
- `inverter_dc` (hypertable): a `dc_inputs` és `dc_strings` soronként tömbként, nem bemenetenként külön sorban.
- `raw_block` (hypertable, rövid megőrzéssel): eszköz, blokk, idő, nyers regiszterek.
- `poll_stat`: eszközönként az elért ütem, kérésszám, hibaszám, átlagos válaszidő.
- `event` és `notification`: jelzések nyitása/zárása, kiküldött értesítések.
- `audit_log`.
- **Megőrzés:** `inverter_reading` nyersen 30–90 napig (beállítás), néhány nap után tömörítve; 1 perces folyamatos aggregátum korlátlan ideig. Méretbecslés a kutatási dokumentumban.
- **Bérlő-elszigetelés:** minden lekérdezés a szervezetre szűr, közös rétegen át; erre külön tesztek kellenek.

## 10. Felület [J]

Oldalak: **Parkok** (kártyák: név, állapot, pillanatnyi teljesítmény, napi energia, nyitott jelzések) · **Park** (összteljesítmény görbéje, inverter-rács állapotszínnel, a tunnel és a lekérdezés állapota a ténylegesen elért ütemmel) · **Inverter** (grafikonok, DC bemenetek, nyers állapot- és hibakód) · **Jelzések** · **Beállítások** (cég, tagok, számlázás) · **Admin** (profilok jóváhagyása).

A varázsló a termék lényege; a diagnosztika mondja meg, melyik lépés akadt el és mi a teendő:

```
Új park   1 Alapadatok ── 2 Kapcsolat ── 3 Eszközök ── 4 Ellenőrzés

2 Kapcsolat
  Milyen routered van?        [ Teltonika ▾ ]
  A park belső hálózata:      [ 192.168.1.0/24 ]
  [ Konfig letöltése ]  [ QR ]           egyszer tölthető le
  Teendők a routeren:  1. …  2. …  3. …

  Kapcsolatteszt
   ✓ A tunnel felépült (utolsó kézfogás 4 mp-e)
   ✓ 192.168.1.10 elérhető
   ✗ Az 502-es port zárva
     → SmartLogger: Modbus TCP „Link setting" = Enable(Limited), kliens IP: 10.203.0.14
```

- Routerenkénti útmutató az MVP-ben: Teltonika, MikroTik, és egy általános WireGuard leírás.
- Eszközönkénti teendők a profilok `site_setup` és `vendor_notes` részéből jönnek.
- Élő frissítés SSE-n, rendszeres életjel-üzenettel: a Bun alapértelmezett tétlenségi időkorlátja különben megszakítja a néma kapcsolatot. Hosszabb időtávra a grafikon szerveroldalon ritkított adatot kap.

## 11. Jelzések [J]

- **Tunnel-szakadás:** nincs kézfogás egy küszöbnél régebben.
- **Adathiány:** egy eszköztől nincs sikeres gyors olvasás a küszöbnél régebben, miközben a tunnel él.
- **Inverterhiba:** `status = fault`, vagy napközben `stopped`; a nyers hibakóddal együtt.
- Minden jelzés nyitás–zárás esemény; e-mail a szervezet tagjainak, kikapcsolható.
- Éjszaka ne legyen hamis riasztás: kiinduló szabály, hogy napnyugta és napkelte között (a park koordinátáiból) az adathiány és a leállás nem riaszt.

## 12. Stack

| Réteg | Választás | |
|---|---|---|
| Futtatókörnyezet, csomagkezelő, tesztfuttató | Bun | [D] |
| API | Hono | [D] |
| Frontend | React; Bun bundler és dev szerver (HTML import a `Bun.serve` `routes` alatt) | Bun [D], React [J] |
| UI | Tailwind + shadcn/ui; uPlot az idősorokhoz | [J] |
| Adatbázis | PostgreSQL + TimescaleDB; Drizzle ORM | [J] |
| Élő adat | Postgres LISTEN/NOTIFY → SSE | [J] |
| Auth | Better Auth szervezetkezeléssel | [J] |
| Poller | Bun, saját Modbus TCP kliens; kernel WireGuard | Bun [D] |
| Validálás | Zod (API, profilséma) | [J] |
| Profilvázlat | LLM API, sémára kényszerített kimenettel | [J] |
| Számlázás | Stripe előfizetés, mennyiség = aktív parkok száma | [J] |
| Üzemeltetés | Docker Compose, Caddy (TLS), napi mentés a VPS-en kívülre | [J] |
| Tesztszerver | ananasar | [D] |

Repó [J]:

```
apps/web        React alkalmazás
apps/api        Hono API, a web kiszolgálása
apps/poller     lekérdező és tunnel-kezelő
packages/core   kanonikus séma, profilbetöltő, dekóder, ellenőrzések (API és poller közösen)
packages/db     Drizzle séma, migrációk
profiles/  fixtures/  tools/     az eneredge-profiles-v0 csomagból
```

Kód, azonosítók és commitok angolul; a felhasználói felület magyarul. [J]

## 13. Biztonság [J]

- Modbus csak tunnelen belül; a kliens csak olvasni tud.
- Parkok elszigetelése a 6. pont szerint; az API-nak nincs hálózati jogosultsága.
- Titkok (WireGuard privát kulcsok, API-kulcsok) titkosítva tárolva, illetve környezeti változóban; a router konfigja egyszer tölthető le.
- A feltöltött gyártói dokumentum és az LLM-kimenet adat, nem utasítás: a vázlat csak sémára validálva és jóváhagyva lesz profil.
- Audit napló a park- és profilműveletekről; napi mentés a gépen kívülre, visszaállítási próbával.

## 14. Tesztelés [J]

- **Profil-megfelelés:** a dekóder a négy tesztadatra az elvárt értékeket adja; CI-ban ananasar szerverrel.
- **Saját ál-Modbus-szerver a repóban:** az ananasar egy példánya egy regiszterkészletet ad minden unit ID-ra, legfeljebb két kliensnek, késleltetés nélkül. A lassú eszköz, a több unit ID egy kapcsolaton és a hibák teszteléséhez kell mellé egy kicsi, saját tesztszerver.
- **Tesztpark pilot nélkül:** egy Linux gép (vagy konténer) WireGuard-kliensként, mögötte ananasar – ezzel a teljes út végigpróbálható a varázslótól a grafikonig, mielőtt valódi park lenne.
- **Hálózati elszigetelés:** integrációs teszt két, azonos belső címet használó „parkkal", valódi WireGuard-interfészekkel.
- **Bérlő-elszigetelés:** egy szervezet nem lát másik szervezethez tartozó parkot, eszközt, mérést.
- **Csak olvasás:** teszt, hogy a Modbus kliens a 03/04-en kívül semmit nem tud küldeni.
- **Ütemezés:** lassú eszköznél a kérések nem torlódnak, az elért ütem helyesen mérődik.

## 15. Építési sorrend [J]

1. **Váz:** monorepo, adatbázis és migrációk, auth és szervezetek, park CRUD, üres felület.
2. **Mag:** profilbetöltő és dekóder a tesztadatokon zöldre; Modbus kliens; poller az ananasar ellen; írás a hypertable-be.
3. **Élő nézet:** NOTIFY → SSE → parkoldal és inverteroldal grafikonokkal.
4. **Tunnel:** elszigetelés-teszt; interfész-kezelés a pollerben; varázsló konfig-letöltéssel és kapcsolatteszttel; eszközönkénti élő próba. *Innentől köthető be az első pilot park.*
5. **Jelzések** és e-mail.
6. **Profil-asszisztens:** AI-vázlat új eszköztípushoz, statikus ellenőrzés, admin jóváhagyás.
7. **Számlázás.**
8. **Élesítés:** Compose, Caddy, mentés, megőrzési szabályok.

## 16. Nyitott kérdések

A tulajdonosra várnak [N]:

1. Melyik routerek és melyik inverter/logger típusok vannak ténylegesen a célügyfeleknél? (A routerenkénti útmutatók és a profilok sorrendje ezen múlik.)
2. Árazás: a havidíj összege, van-e próbaidőszak, mikortól számlázható egy park. Kiinduló feltevés: az első sikeres adattól.
3. Kell-e magyar számlázóprogram-integráció az induláshoz, vagy elég a Stripe?
4. VPS-szolgáltató és domain.
5. Ki hagyja jóvá a profilokat? Kiinduló feltevés: a tulajdonos, platform-adminként.
6. LLM-szolgáltató és költségkeret a profilvázlatokhoz; e-mail-szolgáltató.
7. Mekkora terhelésre méretezzük az egy VPS-t? Kiinduló feltevés: 50 park, összesen 1000 inverter; erre kell terheléses próba és lemezméret.
8. Mivel tesztelhető a tunnel és a varázsló a pilot előtt: van-e egy valódi router (Teltonika vagy MikroTik) és egy root jogú Linux gép kernel WireGuarddal? Enélkül a routerútmutatók csak a gyártói leírásból készülnek, kipróbálatlanul.

Az első valódi eszközön dőlnek el [N]:

9. A logger a saját gyorsítótárából válaszol, vagy továbbítja a kérést? Hány kérés fér 5 mp-be egy valós vonalon?
10. Mit adnak az inverterek éjszaka?
11. SunSpec teljesítménytényező: százalék-e (a szabvány szerint igen)?

A megvalósítóra bízva: táblák pontos oszlopai és indexei, API-útvonalak, komponensek, küszöbértékek alapértékei, a tunnel-címek kiosztási sémája, a könyvtárak verziói, a felület látványa.

## 17. Kapcsolódó anyagok

- `eneredge-profiles-v0.zip` – a három profil, a kanonikus séma, tesztadatok az ananasarhoz, `profile_check.py` referencia-olvasó, `scan_to_ananas.py`. A tartalma kerüljön be a repóba.
- `eszkozprofilok-v0-kutatas.md` – a profilok forrásai, eszközoldali korlátok, az 5 mp-es lekérdezés számai, az ananasar lehetőségei.
- ananasar: https://github.com/andy778/ananasar – `ananasar server --port N --load fájl.ananas`; egy példány egy eszközt szimulál, legfeljebb két klienssel, az értékek maguktól nem változnak.
- Bun fullstack dev szerver: https://bun.com/docs/bundler/fullstack
