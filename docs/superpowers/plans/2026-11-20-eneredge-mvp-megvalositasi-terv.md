# EnerEdge MVP – megvalósítási terv

*2026-11-20 · a [`docs/eneredge-terv-v0.md`](../../eneredge-terv-v0.md) alapján, a 15. pontja szerinti sorrendben, az átnézés során egyeztetett módosításokkal. Kód addig nem készül, amíg ezt jóvá nem hagyod.*

**Állapot:** az átnézés három köre lezárult, minden döntésed be van vezetve (1.4). A terv a jóváhagyásodra vár.

**Mit hagysz jóvá:** a mérföldkövek tartalmát és „kész, ha" feltételeit (2. rész), a rám bízott döntéseket (3. rész), a terv javaslataitól való eltéréseket (1.2), és azt, amit a gépeden elindítok hozzá (6. rész).

Az 1. mérföldkő feladatokra bontott terve külön fájlban van: [`2026-11-20-m1-vaz.md`](2026-11-20-m1-vaz.md). A többi mérföldkő részletes terve a saját kezdetén készül el, amikor már tudjuk, amit az előzők megmutattak.

Jelölések: **[D]** a te döntésed, változatlan · **[J→]** a terv javaslatától eltérek, indokkal · **[SD]** saját döntés ott, amit a megvalósítóra bíztál.

## Fogalmak

- **Poller (lekérdező):** a szerveren futó háttérprogram, amely néhány másodpercenként megkérdezi az invertereket, a válaszból közös formátumú adatot készít, és az adatbázisba írja. A Modbus eszközök maguktól nem küldenek adatot, csak kérdésre válaszolnak; a poller teszi fel a kérdést. Ő kezeli a parkok felé menő VPN-kapcsolatokat is. A hagyományos megoldásban ezt a parkba telepített adatgyűjtő doboz végzi; itt a felhőben fut, ezért nem kell eszközt telepíteni.
- **Tunnel és hub:** a park routere titkosított WireGuard-kapcsolatot (tunnelt) épít a szerver felé; a szerver oldali végpont a hub.
- **Profil:** eszköztípusonként egy leírás arról, mit kell lekérdezni, és az melyik közös mezőnek felel meg.
- **Kanonikus séma:** a közös mezők listája, amelyet egy inverterről tárolunk, gyártótól függetlenül.
- **Szimulátor:** a repó saját ál-Modbus-szervere, amely valószerű, változó adatot ad fejlesztéshez, bemutatóhoz és terheléses próbához.
- **Bemutató cég:** egy megjelölt szervezet, amelynek parkjai szimulált adatot mutatnak.

## 1. Ami a tervezés közben kiderült

### 1.1 Hiányzik két anyag

A 17. pont anyagai közül az `eneredge-profiles-v0.zip` és az `eszkozprofilok-v0-kutatas.md` nincs ezen a gépen; csak maga a terv van meg (a Letöltések mappában). Az M1-hez, a P próbához és az M1b-hez nem kellenek. Az M2 nélkülük nem kezdhető el: onnan jön a három profil, a kanonikus séma és a tesztadatok, és a mérési tábla oszlopai is a kanonikus sémát követik.

Emlékezetből nem pótolom őket. Egy fejből írt regisztertérkép éppen az a „csendben rossz adat", amit a terv 2. pontja kudarcnak nevez.

### 1.2 Eltérések a terv javaslataitól

| Hol | A terv javaslata | Amit helyette csinálok | Miért |
|---|---|---|---|
| 14. pont, profil-megfelelés | CI-ban ananasar szerverrel | A megfelelési teszt közvetlenül a `fixtures/*.ananas` fájlokat olvassa. A Modbus klienst a repó saját ál-szervere teszteli. Az ananasar a teljes út próbája marad, címmel megadva. | Döntésed: az ananasar másik szerveren fut, erre a gépre nem kerül. A `.ananas` fájl egyszerű szöveg (soronként egy regiszter címe és értéke), így a teszt hálózat nélkül is ugyanazt bizonyítja. |
| 14. pont, saját ál-szerver | Kicsi tesztszerver a lassú eszköz és a hibák teszteléséhez | Ugyanez szimulátor móddal bővül. | Az ananasar értékei maguktól nem változnak; a bemutatóhoz és az M8 terheléses próbájához változó adat kell. Jóváhagytad. |
| 15. pont, sorrend | A felület képernyői az élő nézettel (M3) és a varázslóval (M4) készülnek | A képernyők az M1b-ben készülnek el szimulált adattal; az M3 és az M4 a valódi adatot és működést köti mögéjük. | Az első külső cél a bemutató, és a felület a zip nélkül is elkészíthető. Kérésedre. |
| 15. pont, sorrend | Az elszigetelés-teszt a 4. mérföldkő elején | Egy eldobható próba már az M1 után, a poller megírása előtt eldönti a kérdést. A teljes integrációs teszt az M4-ben marad. | Ha a forráscím-alapú routing WireGuarddal nem válik be, a tartalék parkonkénti processzt jelent, ami az M2-ben megírt poller szerkezetét érinti. Jóváhagytad. |
| 15. pont, sorrend | Élesítés a 8. mérföldkőben | Minimális élesítés az M4 elején; az M8 a megerősítés. | Pilot parkot csak nyilvános címen futó szerverhez lehet kötni, és valódi adathoz mentés kell. Jóváhagytad. |
| 2. pont, terjedelem | Teljesítmény-összehasonlító elemzések nincsenek az MVP-ben | Egy egyszerű „termelési eltérés" jelzés bekerül az M5-be és a bemutatóba. Időjárás-alapú várt sáv és előrejelzés továbbra sincs. | A marketingoldal fő ígérete, és az első külső cél a bemutató. Jóváhagytad. |
| 13. pont, kulcsok | A privát kulcsok titkosítva tárolva | Ezen felül: a hub privát kulcsát a poller állítja elő, az API csak a nyilvánosat látja. | Az internet felé néző process így soha nem kezel hub-kulcsot. |
| 9. pont, adatmodell | A táblák listája | A táblák abban a mérföldkőben jönnek létre, amelyik használja őket. | A mérési tábla oszlopai a kanonikus sémából jönnek, ami még nincs meg; a többinél így nem készül előre kitalált oszlop. |

### 1.3 Ellenőrzött tények

- **Bun:** a gépen 1.4.3 van, a terv a `localAddress`-t 1.4.4-en ellenőrizte, a mai legfrissebb az 1.4.5. A repót 1.4.5-re rögzítem, a `localAddress`-ellenőrzés pedig teszt lesz (M2), hogy verzióváltáskor magától kiderüljön, ha elromlik.
- **Böngészős tesztek:** a Bunban van beépített böngészővezérlés (`Bun.WebView`), amely a `bun test` alatt fut. macOS-en a rendszer WebKitjét használja, Linuxon a telepített Chrome-ot. Kísérleti API, és kevesebbet tud, mint a Playwright.
- **Adatbázis-kliens:** a Bun beépített SQL-kliense tud LISTEN/NOTIFY-t, automatikus újracsatlakozással és felzárkózó visszahívással. Külön Postgres-illesztő nem kell; a Drizzle a `bun-sql` illesztővel megy.
- **TimescaleDB:** a tömörítés, a folyamatos aggregátum és a megőrzési szabály a közösségi kiadásban van (Timescale License), az Apache-licencű `-oss` képben nincs. A `timescale/timescaledb:2.32.1-pg18` képet használom. Úgy tudom, ez a licenc a saját termékben való használatot megengedi, és azt tiltja, hogy magát az adatbázist add tovább szolgáltatásként; ezt érdemes egyszer megerősítened.
- **Ananasar** (a leírása alapján): egy példány legfeljebb két klienst szolgál ki, az egy percig néma kapcsolatot bontja, és a 03/04 mellett író függvénykódokra is válaszol. A „csak olvasás" tesztet ezért a saját ál-szerver végzi, amely minden kapott függvénykódot feljegyez.
- **Hostinger VPS** (a szolgáltató oldalai szerint, 2026-11-20):
  - KVM virtualizáció root hozzáféréssel, egy nyilvános IPv4-címmel; EU-s adatközpont Németországban, Franciaországban és Litvániában.
  - A VPS előtti felügyelt tűzfal UDP porttartományt is enged.
  - A kernel WireGuardot a leírás nem említi külön; saját kernelű KVM-en működnie kell, a P próba ezt igazolja.
  - Az ingyenes mentés heti, kettőt őriz meg; napi mentés fizetős.
  - Külön lemez nem csatolható, a tárhely csak csomagváltással nő.
  - A vCPU osztott, tartós terhelésnél visszafogják (60% alapszint).
  - Az akciós ár 24 hónap előre fizetésével jár; havi fizetéssel jóval drágább.
- **Fejlesztői gép:** macOS, ahol nincs kernel WireGuard. Ami WireGuardot érint, az a Hostinger VPS-en fut és ott tesztelhető.
- **Docker:** telepítve van, de most nem fut. Az 1. mérföldkő helyi adatbázisához kell.
- **Márka:** a marketingoldal (`~/Documents/eneredge`) „EnerEdge" írásmódot, tegező hangnemet és kész színrendszert használ (narancs = termelési eltérés, lila = adatkapcsolati hiba, Archivo betűtípus). Az alkalmazás ezeket veszi át, hogy a két felület egy terméknek látsszon.

### 1.4 Az átnézés során hozott döntéseid (2026-11-20)

**Cél és sorrend**
- Az első külső cél a bemutatható termék. A felület az M1b-ben, szimulált adattal készül el, a varázsló képernyőivel együtt.
- A felület az `emil-design-eng` skillel készül.
- Szimulátor az M2-ben. Elszigetelés-próba az M1 után. Minimális élesítés az M4 elején.
- Egy egyszerű „termelési eltérés" jelzés bekerül az M5-be és a bemutatóba.

**Üzemeltetés**
- A rendszer Hostinger VPS-en fut: KVM 4 csomag, németországi adatközpont, Ubuntu 24.04. Te rendeled meg az M1 végére, és root SSH-kulcsos hozzáférést adsz.
- Egy VPS van, külön tesztkörnyezet nélkül. Amíg nincs rajta pilot, szabadon próbálok rajta; utána a kockázatos hálózati tesztek elszigetelt hálózati névtérben futnak ugyanazon a gépen.
- Az M1 és az M1b fejlesztése és tesztjei a fejlesztői gépen futnak, Dockerben futó helyi adatbázissal. A VPS-re az kerül, ami WireGuardot érint, és az élesítés.
- Domainnevek: `app.eneredge.tech` az alkalmazásnak, `hub.eneredge.tech` a WireGuard-végpontnak; a rekordokat te veszed fel az M4 előtt.
- E-mail-küldés: egy `no-reply@eneredge.tech` Hostinger-postafiókon át, SMTP-vel. Ha a riasztások mennyisége vagy a kézbesítés indokolja, később tranzakciós szolgáltatóra váltunk.
- Napi mentés egy Hostingertől független, S3-kompatibilis tárhelyre; a fiókot te nyitod meg az M4 előtt.
- SSH-hozzáférést kapok az ananasar szerverhez; az ananasart ott én indítom el a tesztadatokkal, és ugyanaz a gép lesz az M4-ben a tesztpark.
- A távoli repó privát GitHub-repó, amelyet te hozol létre; a CI GitHub Actions-ön fut; push csak akkor megy, amikor kéred.
- A platform figyeli önmagát: a poller leállása látszik a felületen, és te kapsz róla levelet.

**Regisztráció és ingyenes hónap**
- Bárki regisztrálhat, és az első hónap ingyenes. Amíg a számlázás (M7) nem készül el, a kitett rendszeren csak az általad engedélyezett címek regisztrálhatnak; a nyílt regisztráció az ingyenes hónappal együtt az M7-tel indul.
- Az ingyenes hónap cégenként egyszer jár, és az első park első sikeres adatától számít 30 napig.
- Ami eldönti, jár-e: az eszközök sorozatszáma. Amelyik inverter egyszer már futott ingyenes hónapban, az új fiók alatt sem kap újat.
- A park routerének IP-címe jelzés, nem tiltás: a rendszer megjegyzi, és ha egy új cég parkja ismert címről jelentkezik, nem kap automatikusan ingyenes hónapot, de te felülbírálhatod.
- Fizetési mód nélkül egy cég legfeljebb 10 parkot vehet fel; platform-adminként emelheted.
- Ha az ingyenes hónap fizetési mód nélkül jár le: az adatgyűjtés szünetel, a tunnel és a beállítások megmaradnak, a meglévő adat 30 napig látható; a fizetési mód megadása után azonnal folytatódik. Előtte 7 nappal és 1 nappal e-mail megy.

**Bemutató**
- A bemutató cég egy külön bemutató fiókkal érhető el, amelyet te használsz a bemutatókon; az ügyfelek fiókjában nem jelenik meg.
- A tartalma hat park Huawei és Sungrow inverterekkel: három rendben; egy parkban termelési eltérés; egy parkban inverterhiba és egy másik inverternél adathiány; egy parkban megszakadt kapcsolat.

**Munkamód**
- Az M1-et és az M1b-t egy munkamenetben építem meg, a végükön független átnézéssel; a felületet készülés közben megmutatom. Az M2-től feladatonként külön ágens és átnézés megy.

**Egyéb**
- Szerepek: a `member` mindent lát, de parkot felvenni, módosítani, törölni és tagot meghívni csak az `owner` és az `admin` tud.
- A böngészős végigpróbák `Bun.WebView`-val futnak a `bun test` alatt; ha kevésnek bizonyul, kivételt kérek a Playwrightra.
- Elfogadtad a kérdés nélküli javításokat: a web bekötése előbbre kerül az M1-ben; a poller kibírja a hibás válaszkeretet és a rövid adatbázis-kiesést; a napi energia a számlálóból jön; a router-konfig domainnévre mutat; a titkosító kulcs külön mentése; a visszaállítási próba feltétele.

## 2. Mérföldkövek

A sorrend: **M1 → P → M1b → M2 → M3 → M4 → M5 → M6 → M7 → M8.** Az M-számok a terved 15. pontját követik; a P és az M1b új. Ha a VPS az M1 végére még nincs meg, az M1b megelőzi a P-t.

### M1 – Váz

**Cél:** be lehet lépni, céget létrehozni, kollégát meghívni és parkot felvenni; a felület váza megvan.

**Mit építek**
- Monorepo Bun workspace-szel: `apps/web`, `apps/api`, `packages/db`. Lint és formázás Biome-mal, típusellenőrzés `bun check`-kel, minden teszt `bun test`-tel; helyi adatbázis Compose-ból.
- Migrációk Drizzle-lel. Az első migráció bekapcsolja a TimescaleDB-kiterjesztést, hogy a fejlesztői és a teszt-adatbázis kezdettől olyan legyen, mint az éles.
- Auth (Better Auth): regisztráció e-mail-címmel és jelszóval, e-mail-megerősítés, jelszó-visszaállítás; szervezet, tagok, meghívás e-mailben.
- Két regisztrációs mód: nyílt, illetve meghívásos, amelyben csak az engedélyezett címek, a meghívottak és a platform-admin regisztrálhatnak.
- A bérlő-elszigetelés közös rétege, park CRUD cégenkénti parkkorláttal, audit napló.
- A felület váza magyarul, kiszervezett szövegekkel, az `emil-design-eng` skillel: belépés és regisztráció, cég létrehozása, Parkok, Park, Beállítások (cég, tagok, meghívók), üres Jelzések oldal, és az Admin oldal első két funkciója (engedélyezett regisztrációs címek, cégenkénti parkkorlát).

**Kész, ha**
- Tesztek igazolják: más cég parkjára minden kérés 404; a tag (`member`) nem módosíthat; az eltávolított tag a következő kérésnél már nem fér hozzá; a park-műveletek audit sort írnak; hibás bemenetre 4xx jön, nem 500; meghívásos módban ismeretlen cím nem regisztrálhat; a 11. park csak emelt korláttal vehető fel.
- Böngészős végigpróba zöld: regisztráció → e-mail-megerősítés → cég → park felvétele → kolléga meghívása és belépése, csak a felületről.

**Kell hozzá:** tőled semmi a jóváhagyáson túl. Fejlesztés közben valódi e-mail nem megy ki, a levelek a konzolra íródnak.

### P – Elszigetelés-próba

**Cél:** eldönteni, hogy a poller egy processzben maradhat-e, mielőtt megírom.

**Mit csinálok:** eldobható próba a Hostinger VPS-en. Két WireGuard-interfész, két „park" azonos belső hálózattal és azonos című eszközzel, Bunból kötött forráscím (`net.connect({ localAddress })`), a terv 6. pontja szerinti útvonalak és tűzfalszabályok.

**Kész, ha:** megvan az egyértelmű válasz.
- Működik: az M2 pollere a terv szerint egy process.
- Nem működik: jelzem, és az M2 terve a parkonkénti hálózati névtérre készül.

A próba kódja nem kerül a termékbe; a tanulsága igen. A próba után a VPS-en nem marad belőle semmi.

**Kell hozzá:** a Hostinger VPS root SSH-hozzáféréssel.

### M1b – Bemutató felület

**Cél:** az érdeklődőknek megmutatható, kattintható termék, mielőtt a valódi adatút elkészül.

**Mit építek**
- Parkok (állapot, pillanatnyi teljesítmény, napi energia, nyitott jelzések), Park (összteljesítmény görbéje, inverter-rács), Inverter (grafikonok, DC bemenetek, állapot- és hibakód), Jelzések, és a park-felvétel varázslójának képernyői.
- Mindez szimulált adattal, a megjelölt bemutató cég alatt. A szimulált adat modellje ugyanaz, amelyet az M2 szimulátora a Modbus mögé tesz.
- A bemutató cég tartalma [D]: hat park Huawei és Sungrow inverterekkel – három rendben; egy parkban termelési eltérés; egy parkban inverterhiba és egy másik inverternél adathiány; egy parkban megszakadt kapcsolat.
- A bemutató cég egy külön bemutató fiókkal érhető el [D]. A fiók és a cég egy paranccsal jön létre, a jelszó a beállításból jön; az ügyfelek fiókjában nem jelenik meg.

**Kész, ha**
- A bemutató cég telefonon és asztali gépen végigkattintható.
- A képernyők mögötti API alakja az, amelyet a valódi adat is használni fog, így az M2–M5 csak az adatforrást cseréli.
- A bemutató adat a felületen mindenhol jelölve van, és valódi cég alatt nem jelenhet meg (teszt).

**Kell hozzá:** tőled semmi; a zip nélkül is elkészíthető.

### M2 – Mag

**Cél:** a három kész profillal Modbus-olvasásból kanonikus adat kerül az adatbázisba.

**Mit építek**
- A zip tartalma a repóba: `profiles/`, `canonical/`, `fixtures/`, `tools/`.
- `packages/core`: a kanonikus séma betöltése; a profilformátum v0 ellenőrző sémája mindkét fajtára (`register-map`, `sunspec`); dekóder; tartomány- és keresztellenőrzések. Az érvénytelent jelző nyers érték NULL lesz, a hihetőségi tartományon kívüli érték szintén NULL, és számlálódik.
- `apps/poller`: saját Modbus TCP kliens, amelyben a 03 és 04 függvénykódon kívül más nem létezik (a típusokban sem). Kapcsolat (park, host, port) hármasonként, a kérések sorban; `fast` / `slow` / `static` szintek; torlódásmentes ütemezés és az elért ütem mérése; a néma eszköz kiemelése a gyors körből; a gyors szint dekódolásához kellő, ritkábban olvasott értékek megjegyzése (pl. Sungrow `output_type`); nyers blokkok megőrzése 14 napig; körönként kötegelt INSERT, utána NOTIFY.
- Robusztusság: hibás, csonka vagy túl hosszú válaszkeret nem dönti le a pollert, és nem érint más parkot. Rövid adatbázis-kiesés alatt a poller korlátos memóriában tartja a méréseket, nem dobja el.
- Életjel: a poller rendszeresen életjelet ír az adatbázisba.
- Saját ál-Modbus-szerver a tesztekhez: több unit ID egy kapcsolaton, késleltetés, hibák, és napló minden kapott függvénykódról.
- Szimulátor: az ál-szerver szimulátor módja a profilokból dolgozik – valószerű napi görbét állít elő, és a profil szerint regiszterekbe kódolja. Oda-vissza teszt: kódolás, majd dekódolás ugyanazt adja. Ez a dekóder és a kódoló egyezését bizonyítja; a profil helyességét továbbra is a tesztadatok és az élő próba adják.
- Táblák: `device`, `profile`, `inverter_reading`, `inverter_dc`, `raw_block`, `poll_stat`. Az `inverter_reading` oszlopai a kanonikus sémából jönnek; teszt őrzi, hogy a kettő ne csúszhasson el. `draft` állapotú profillal a poller nem gyűjt adatot.
- Az eszköz sorozatszáma eltárolódik; erre épül az M7-ben az ingyenes hónap szabálya.
- Fejlesztői „közvetlen" mód: tunnel nélkül éri el a megadott tesztszervert. Éles beállítással a poller ebben a módban nem indul el, így a „Modbus csak tunnelen belül" szabály nem sérülhet.

**Kész, ha**
- A dekóder a négy tesztadatra pontosan a `fixtures/*.expected.json` értékeit adja.
- Teszt bizonyítja: a kliens 03/04-en kívül semmit nem küld; lassú eszköznél a kérések nem torlódnak és az elért ütem helyes; egy néma eszköz nem tartja fel a többit; a `localAddress` kötés érvényesül; hibás válaszkeret után a poller tovább olvas.
- A poller az ananasar szerverről olvas (SSH-porttovábbításon át), és a sorok megjelennek az adatbázisban.

**Kell hozzá:** a zip és a kutatási dokumentum; SSH-hozzáférés az ananasar szerverhez (cím, felhasználó, kulcs).

### M3 – Élő nézet

**Cél:** a beolvasott adat másodperceken belül látszik a felületen.

**Mit építek**
- NOTIFY → az API LISTEN-je → SSE a böngészőnek, életjel-üzenettel és kérésenként kikapcsolt tétlenségi időkorláttal; kapcsolatszakadás után felzárkózás.
- 1 perces folyamatos aggregátum; idősor-végpont szerveroldali ritkítással (rövid távra nyers adat, hosszabbra az aggregátum).
- A Parkok, a Park és az Inverter képernyő az M1b-ben elkészült; itt a valódi adat kerül mögéjük, és megjelenik a lekérdezés állapota a ténylegesen elért ütemmel.
- A napi energia az energiaszámlálóból jön, nem a teljesítmény összegzéséből, így egy adatkiesés nem hamisítja meg. A grafikon a hiányt hiánynak mutatja.
- Ha a poller életjele elavult, a felület azt mutatja, hogy az adatgyűjtés a platform oldalán áll, nem a parkban.

**Kész, ha**
- Az ananasar szerveren átírt regiszterérték a nyitott parkoldalon újratöltés nélkül megjelenik, a gyors ütemnek megfelelő időn belül.
- Teszt: más cég felhasználója nem tud feliratkozni a park adatfolyamára.
- Egy hétnyi adaton a grafikon ritkított adatot kap (pontszám-korláttal), nem a nyers sorokat.

**Kell hozzá:** semmi új.

### M4 – Tunnel

*Innentől köthető be az első pilot park.*

**Cél:** egy park a varázslóból, a szerveren végzett kézi lépés nélkül beköthető, és a parkok egymástól el vannak szigetelve.

**Mit építek**
- **Először a minimális élesítés** a Hostinger VPS-en: Compose (adatbázis, migráció, web + api, poller), Caddy TLS-sel az `app.eneredge.tech` címen, tűzfal (a Hostinger tűzfalán a tunnelek UDP porttartománya nyitva), napi mentés egy Hostingertől független tárhelyre, külső figyelő a `/api/health`-re. A levelek a `no-reply@eneredge.tech` postafiókon át mennek. A router-konfig végpontja a `hub.eneredge.tech`. A hub-kulcsok titkosító kulcsa az adatbázis-mentéstől külön van mentve. A kitett rendszer meghívásos módban fut az M7-ig.
- A teljes elszigetelés-teszt valódi WireGuard-interfészekkel, a P próba tanulságai alapján.
- Tunnel-kezelés a pollerben: a `tunnel` tábla a kívánt állapot, a poller induláskor és változáskor ehhez igazítja az interfészeket, útvonalakat és tűzfalszabályokat; visszaírja az utolsó kézfogást, a forgalmat és a park routerének nyilvános címét.
- Kulcsok: a hub privát kulcsát a poller állítja elő és titkosítva tárolja [J→]. A router privát kulcsa letöltéskor keletkezik és nem tárolódik; újabb letöltés csak új kulccsal lehetséges, a régi érvényét veszti.
- A varázsló az M1b-ben elkészült képernyőin valódi működést kap: router-konfig letöltése és QR; útmutató Teltonikához, MikroTikhez és általános WireGuardhoz; eszközönkénti teendők a profilok `site_setup` és `vendor_notes` részéből; a várható havi adatforgalom kijelzése. A konfig domainnévre mutat, nem IP-címre, hogy szerverváltáskor ne kelljen a routerekhez nyúlni.
- Felvételkor ellenőrzés: a park belső hálózata privát címtartomány; az eszköz címe ebbe esik; a hálózat nem fed át a tunnel-címek tartományával.
- Kapcsolatteszt lépésenkénti diagnosztikával, a címfordításos tartalék esetével együtt. A próbát a poller végzi, az API az adatbázison át kéri meg rá, mert az API-nak nincs hálózati jogosultsága.
- Eszköz felvétele: SunSpec-próba → profil `identify` → ha nincs profil, „profilra vár".
- Eszközönkénti élő próba, „ideiglenes" jelöléssel a felületen.

**Kész, ha**
- Az elszigetelés-teszt zöld: a két park azonos című eszköze csak a saját parkjából érhető el; park → park és park → platform irányban nincs forgalom.
- A tesztpark (az ananasar szerver WireGuard-kliensként) a varázslóból beköthető, és megjelenik az élő nézetben.
- Park törlésekor az interfész, a szabályok és a kulcs megszűnnek; a konfig másodszor nem tölthető le.
- A napi mentés elkészül, és a gépen kívül megvan.

**Kell hozzá:** a két domainrekord, a `no-reply@eneredge.tech` postafiók SMTP-adatai és az S3-kompatibilis tárhely kulcsa (16/4., 16/6.); egy valódi Teltonika vagy MikroTik az útmutatók kipróbálásához – enélkül azok csak a gyártói leírásból készülnek; a célügyfelek routerei és eszközei (16/1.).

### M5 – Jelzések

**Cél:** a kezelő e-mailt kap, ha egy park kapcsolata megszakad, egy eszköz elnémul, egy inverter hibát jelez, vagy tartósan kevesebbet termel a társainál – éjszakai hamis riasztás nélkül.

**Mit építek**
- Nyitás–zárás események: tunnel-szakadás, adathiány, inverterhiba a nyers hibakóddal; `event` és `notification` táblák.
- Termelési eltérés, egyszerű változat [D]: jelzés nyílik, ha egy inverter nappal tartósan jóval kevesebbet termel a névleges teljesítményéhez mérten, mint a park többi invertere. Kiinduló küszöb [SD]: a park invertereinek középértékéhez képest 80% alatt, 30 percen át, legalább három inverteres parkban. Időjárás-alapú „várt sáv" és előrejelzés nincs.
- E-mail a szervezet tagjainak, felhasználónként kikapcsolható.
- Éjszakai szabály: napnyugta és napkelte között (a park koordinátáiból számolva) az adathiány és a leállás nem riaszt.
- A platform önellenőrzése: ha a poller életjele elavul, te kapsz levelet, és az ügyfelek adathiány-riasztása erre az időre szünetel.
- A Jelzések oldal az M1b-ben elkészült; itt valódi események kerülnek mögé, és megjelenik a nyitott jelzések száma a parkkártyán.
- Kiinduló küszöbök [SD], beállításból állíthatók: tunnel-szakadás, ha az utolsó kézfogás 3 percnél régebbi; adathiány, ha élő tunnel mellett a gyors ütem ötszöröséig, de legalább 2 percig nincs sikeres olvasás; e-mail akkor megy, ha a jelzés 5 percig fennáll (a 4G-s kapcsolatok ingadozása miatt); az inverterhiba azonnal jelez, a nappali `stopped` 10 perc után.

**Kész, ha**
- A tesztparkon a tunnel leállítása, az eszköz elnémítása és a hibaállapot beállítása egyenként a megfelelő jelzést nyitja, majd a helyreállás után zárja, és a levél megérkezik.
- Éjszakára állított időben az adathiány nem riaszt (teszt).
- A szimulátorral előidézett eltérés jelzést nyit; ha minden inverter egyformán esik vissza (felhő), nem nyit (teszt).
- A poller leállítása után te kapsz levelet, az ügyfél nem kap adathiány-riasztást (teszt).

**Kell hozzá:** semmi új; az e-mail-küldés már az M4-hez megvan.

### M6 – Profil-asszisztens

**Cél:** új eszköztípushoz a gyártói dokumentumból vázlat készül, amely csak ellenőrzés és jóváhagyás után élesedik.

**Mit építek**
- Feltöltött dokumentum → háttérfeladat → LLM-hívás a dokumentummal, a kanonikus sémával és a profilformátummal, sémára kényszerített kimenettel → profil YAML → statikus ellenőrzés (séma, csak kanonikus mezők, minden pont lefedve olvasási blokkal) → élő próba az eszközön → platform-admin jóváhagyás → verziózott profil.
- Admin felület: a vázlat, a forrásdokumentum és az ellenőrzések eredménye egymás mellett; jóváhagyás és elutasítás; a profilállapotok (`draft` → `doc-verified` → `device-verified`) kezelése; audit napló.
- A feltöltött dokumentum és az LLM kimenete adat, nem utasítás: a vázlat csak sémára validálva és jóváhagyva lesz profil.
- Újradekódolás parancssorból: egy javított profilverzióval a megőrzött nyers blokkokból újraszámolja az érintett eszközök adatait. A terved 7. pontja ezért őrzi meg a nyers blokkokat.
- Javaslatom a 16/6. kérdésre: Claude API (`claude-opus-5-5`), PDF-bemenettel és strukturált kimenettel. Egy vázlat becsült költsége 1–5 USD (egy nagyjából 100 oldalas regiszterleírás néhány százezer bemeneti token); ez becslés, az első valódi dokumentumon megmérem. Vázlat eszköztípusonként készül, nem parkonként, ezért a havi keret kicsi lehet.

**Kész, ha**
- A három kész profil egyikének forrásdokumentumából készült vázlat átmegy a statikus ellenőrzésen, és a tesztadatra adott értékei összevethetők a kézzel írt profiléval. Ez méri, mennyire használható a vázlat.
- Teszt: jóváhagyás nélkül profil nem élesedik, és `draft` profillal nincs adatgyűjtés.

**Kell hozzá:** LLM-szolgáltató, API-kulcs és költségkeret (16/6.); ki hagy jóvá (16/5., a feltevés szerint te).

### M7 – Számlázás

**Cél:** a cég parkonkénti havidíjat fizet, emberi beavatkozás nélkül; az első hónap ingyenes, és innentől bárki regisztrálhat.

**Mit építek**
- Stripe előfizetés, ahol a mennyiség az aktív parkok száma; webhook aláírás-ellenőrzéssel; Beállítások → Számlázás (állapot, fizetési mód kezelése a Stripe ügyfélportálján).
- Ingyenes hónap [D]: cégenként egyszer; az első park első sikeres adatától számít 30 napig.
- Mi dönti el, jár-e [D]: az eszközök sorozatszáma. Amelyik inverter egyszer már futott ingyenes hónapban, az új fiók alatt sem kap újat.
- A park routerének IP-címe jelzés [D]: a rendszer az ingyenes hónap indulásakor látott címet megjegyzi (lenyomatként). Ha egy új cég parkja ismert címről jelentkezik, nem kap automatikusan ingyenes hónapot; az eset hozzád kerül, és felülbírálhatod.
- A lejárt ingyenes hónap [D]: fizetési mód nélkül az adatgyűjtés szünetel, a tunnel és a beállítások megmaradnak, a meglévő adat 30 napig látható; a fizetési mód megadása után azonnal folytatódik. Előtte 7 nappal és 1 nappal e-mail megy.
- A nyílt regisztráció bekapcsolása [D].

**Amit az IP-címről tudnod kell:** fix IP-címes parknál megbízható jel. 4G-s parknál a router a mobilszolgáltató megosztott, változó címéről látszik, így ott ugyanaz a park később más címről jön, és két különböző ügyfél parkja is látszhat ugyanarról a címről. Ezért jelzés, és ezért a sorozatszám a döntő.

**Kész, ha**
- Stripe tesztmódban egy park hozzáadása és törlése módosítja az előfizetés mennyiségét.
- A sikertelen fizetés állapota látszik a felületen.
- Teszt: egy már ingyenes hónapban futott inverter új fiók alatt nem kap még egyet; ismert router-címről jövő park esete hozzád kerül.
- Teszt: a lejárt ingyenes hónap után az adatgyűjtés szünetel, a fizetési mód megadása után folytatódik.

**Kell hozzá:** a havidíj és a számlázás kezdete (16/2.); kell-e magyar számlázóprogram (16/3.). Az utóbbi a magyar számlaadási szabályokon múlik, nem technikai kérdés, ezért érdemes a könyvelőddel tisztázni, mielőtt ehhez a mérföldkőhöz érünk. A nyílt regisztrációhoz általános szerződési feltételek és adatkezelési tájékoztató kell; a router IP-címének megjegyzését érdemes szerepeltetni benne.

### M8 – Megerősítés

**Cél:** tudjuk, mekkora terhelést bír a rendszer, és egy szerverhiba után a routerek érintése nélkül helyreállítható.

**Mit építek**
- Megőrzés és tömörítés: nyers mérés 30–90 napig (beállítás), néhány nap után tömörítve; az 1 perces aggregátum korlátlan ideig; nyers blokkok 14 napig.
- Terheléses próba a feltevésed szerint (50 park, 1000 inverter) a szimulátorral. Ebből jön a lemezméret, és ez méri ki, belefér-e a terhelés a Hostinger CPU-keretébe.
- Visszaállítási próba: mentésből, új VPS-en.
- Üzemeltetési leírás: indítás, frissítés, visszaállítás.

**Kész, ha**
- A terheléses próbán megvan a mért elért ütem, a lemezigény és a CPU-használat a visszafogási szinthez képest.
- A visszaállítás új VPS-en sikerül, és a tunnelek a routerek érintése nélkül visszajönnek.
- Egy tiszta VPS-en a leírás szerint feláll a rendszer.

**Kell hozzá:** a méretezés megerősítése (16/7.).

## 3. Rám bízott döntések [SD]

| Terület | Döntés | Indok |
|---|---|---|
| Verziók | Bun 1.4.5 · Hono 4.13 · Drizzle 0.45 · Better Auth 1.7.26 · Zod 4 · React 19 · React Router 8 · TanStack Query 5 · Tailwind 4 · uPlot 1.6 · PostgreSQL 18 + TimescaleDB 2.32.1 | A mai stabil kiadások; a pontos verziót a lockfile rögzíti. |
| Azonosítók | uuidv7 a parknál, eszköznél, eseménynél | Időrendben rendezhető, és az URL-ből nem derül ki, hány park van a rendszerben. |
| URL-ek | `/o/<cég>/parks/<park>` | A megosztott link attól függetlenül működik, melyik cég van éppen kiválasztva. |
| Belépés | e-mail + jelszó (legalább 10 karakter), kötelező e-mail-megerősítés | Külső szolgáltató nélkül működik. |
| Platform-admin | a beállításban felsorolt, megerősített e-mail-címek | Kevés feladata van (profilok jóváhagyása, regisztráció engedélyezése, parkkorlát), ehhez nem kell felhasználókezelő felület. |
| Hibák | az API hibakódot ad, a magyar szöveg a felület szótárában van | Minden szöveg egy helyen van, és később fordítható. |
| Tunnel-kiosztás | N a legkisebb szabad sorszám; port 51820+N; hub cím = tartomány + 2N, router cím = tartomány + 2N+1; routing tábla 1000+N | Megegyezik a terved példájával: N=7 → 51827, 10.203.0.14, 1007. |
| Felület | React Router, TanStack Query, típusos API-kliens; a marketingoldal színei és betűtípusa | Egy fejlesztő által ismert, elterjedt eszközök. |

## 4. A „kudarc lenne akkor is" pontok őrei

| A terv 2. pontja szerinti kudarc | Ami megakadályozza | Mérföldkő |
|---|---|---|
| Egy park felvételéhez kézi beavatkozás kell a szerveren | A poller a `tunnel` táblához igazítja az interfészeket; végigpróba: tesztpark bekötése csak a varázslóból | M4 |
| Hibás párosítás csendben rossz adatot ír | Megfelelési tesztek a tesztadatokon; statikus ellenőrzés; eszközönkénti élő próba; „ideiglenes" jelölés; emberi jóváhagyás | M2, M4, M6 |
| A platform író Modbus-kérést küld | A kliensben a 03/04-en kívül nincs más függvénykód; teszt az ál-szerver naplóján | M2 |
| Egy park hálózatából elérhető egy másik park | Parkonkénti interfész, forráscím-alapú routing, tűzfal; előzetes próba, majd integrációs teszt valódi WireGuarddal | P, M4 |
| A lekérdezés megzavarja a park loggerét, vagy a kezelő tudta nélkül kimeríti a SIM adatkeretét | Hostonként egy kapcsolat, a kérések sorban, gyors szinten eszközönként egy kérés; torlódásmentes ütemezés; parkonként állítható ütem; a varázsló kiírja a várható havi adatforgalmat | M2, M4 |

## 5. Amit tőled kérek, és mikorra

| Mikor | Mi kell | A terved kérdése |
|---|---|---|
| Most | A terv jóváhagyása, és hogy mikor indulhat az M1 | – |
| M1 végéig | A Hostinger VPS (KVM 4, Németország, Ubuntu 24.04) root SSH-kulccsal; a GitHub-repó címe | 4., 8. |
| M2 előtt | `eneredge-profiles-v0.zip` és `eszkozprofilok-v0-kutatas.md`; SSH-hozzáférés az ananasar szerverhez | 17. pont |
| M4 előtt | A két domainrekord; a `no-reply@eneredge.tech` postafiók SMTP-adatai; az S3-kompatibilis tárhely kulcsa; egy valódi router; a célügyfelek routerei és eszközei | 4., 6., 8., 1. |
| M6 előtt | LLM-szolgáltató, API-kulcs, költségkeret; ki hagyja jóvá a profilokat | 6., 5. |
| M7 előtt | A havidíj és a számlázás kezdete; magyar számlázóprogram; általános szerződési feltételek és adatkezelési tájékoztató | 2., 3. |
| M8 előtt | A méretezés megerősítése | 7. |
| Az első valódi eszközön | A logger viselkedése, az éjszakai értékek, a SunSpec teljesítménytényező | 9–11. |

## 6. Munkamód

- **Végrehajtás [D]:** az M1-et és az M1b-t egy munkamenetben építem meg, a végükön független átnézéssel; a felületet készülés közben megmutatom. Az M2-től feladatonként külön ágens és átnézés megy.
- **Git:** helyi repó; mérföldkövenként külön ág, feladatonként commit, angol üzenettel. Push csak akkor megy a GitHub-repóba, amikor kéred.
- **A gépeden a jóváhagyás után:** `bun upgrade` 1.4.5-re; a Docker Desktop elindítása és a TimescaleDB-kép letöltése; `bun install` a projektmappában. A böngészős próbához nem kell külön böngészőt telepíteni. Az ananasar nem kerül erre a gépre.
- **A VPS-en:** ami WireGuardot érint (a P próba és az M4), és az élesítés. Ezen a gépen WireGuard nem fut.
- **Felület:** UI-munka előtt betöltöm az `emil-design-eng` skillt.
- **Megállási pontok:** minden mérföldkő végén megmutatom, mi készült és mit mutatnak a tesztek, és jóváhagyatom a következő részletes tervét. A [D] döntésekhez kérdezés nélkül nem nyúlok; ha egy [J] javaslattól el kell térnem, jelzem, mielőtt megteszem.
- **Titkok:** `.env` fájlban, ami nem kerül a repóba; mellette `.env.example` minta.

## 7. Feltevések, amelyeket nem kérdeztem meg

Ezekkel dolgozom, hacsak nem szólsz.

1. A felület telefonon is használható; külön mobilalkalmazás nincs.
2. Kétlépcsős belépés nincs az MVP-ben. A nyílt regisztráció előtt (M7) érdemes visszatérni rá.
3. Az időpontok a felületen a park időzónájában jelennek meg.
4. A jelzések és a termelési eltérés küszöbei kiinduló értékek, beállításból állíthatók; az első valódi parkon hangoljuk őket.
5. Az újradekódolás parancssori eszköz (M6), nem a felület része.
6. A terved 16. pontjának többi kérdése az 5. rész szerint, a maga mérföldköve előtt kerül elő.
