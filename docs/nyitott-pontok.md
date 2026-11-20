# Nyitott pontok az M1 után

Ez a lista azt gyűjti össze, ami az M1 (váz) lezárásakor tudatosan nyitva maradt. Forrása a
független zárófelülvizsgálat és az azt követő javítási kör, 2026-11-20-án. Az állapot az
`m1-vaz` ág `3c5c751` commitjára vonatkozik.

Egyik pont sem akadálya az M1 beolvasztásának. A kritikus és a fontos hibák ki vannak javítva;
ami itt áll, arról a tulajdonos dönt, hogy mikor és hogyan foglalkozunk vele. A „Javasolt
időpont” az én javaslatom, nem döntés.

A lista négy részből áll:

- **A. Elhalasztott apróságok (1–23.)** – valódi hiányosságok, amelyeket nem javítottam ki.
- **B. Úgy maradt, indokkal (24–40.)** – a felülvizsgáló nem mondott róluk ítéletet; én úgy
  döntöttem, hogy az M1-ben így jó, de mindegyiknek van ára.
- **C. A javítási kör döntései, amelyeknek ára lehet (41–46.)**
- **D. Nyitott döntések** – amire választ várok.

Ahol egy állítást magam is kipróbáltam, azt jelzem. A többi a felülvizsgáló megállapítása, vagy
a kód olvasásából következik.

## Áttekintés

| # | Pont | Javasolt időpont |
| --- | --- | --- |
| 1 | Az API minden hálózati kapcsolaton elérhető, és nincs eldöntve, kinek hiszi el a látogató IP-címét | M4, élesítéskor |
| 2 | A saját útvonalaink nem ellenőrzik az `Origin` fejlécet | most, vagy bármikor |
| 3 | A belépés 7 nap után lejár, akkor is, ha a felhasználó aktív | M4 előtt |
| 4 | A hibás lekérdezés naplója személyes adatot is tartalmazhat | M4 előtt |
| 5 | A regisztráció háttérmunkáját a leállítás nem várja meg | M4 vagy M8 |
| 6 | Az időzóna úgy tárolódik, ahogy beírták | M3 előtt |
| 7 | Láthatatlan parknév lehetséges | bármikor |
| 8 | A cég sorának zárolása erősebb a szükségesnél | M3–M4 |
| 9 | Két félrevezető üzenet | M1b |
| 10 | Üres oldal, ha a „ki van belépve” kérés hibázik | M1b |
| 11 | A „nincs hozzáférés” oldal furcsán jelenik meg az új park címén | M1b |
| 12 | Minden oldal címe „EnerEdge” | M1b |
| 13 | Lekérdezési ütem látszik egy be nem kötött parknál | M1b vagy M4 |
| 14 | A lejárt link kártyájának címe új fióknál is „Új jelszó beállítása” | M1b |
| 15 | Három szó egy dologra a kódban | egy mérföldkő elején |
| 16 | A frontend kézzel írja újra a backend néhány válaszformáját | M1b |
| 17 | Cég létrehozásakor nincs előzetes azonosító-ellenőrzés | M1b |
| 18 | A cégek elszigetelése megállapodás, nem kikényszerített garancia | M2 előtt eldönteni |
| 19 | A böngészős próbák megszakításkor nem takarítanak maguk után | bármikor |
| 20 | A CI még soha nem futott, és három beállítása hiányzik | az első pushnál |
| 21 | Két beállítás nincs dokumentálva | M4 előtt |
| 22 | A tesztek kimenete nem csendes | bármikor |
| 23 | Egyidejű regisztráció ugyanarra a címre hibát naplóz | M8 |

## A. Elhalasztott apróságok

### 1. Az API minden hálózati kapcsolaton elérhető, és nincs eldöntve, kinek hiszi el a látogató IP-címét

Ez két összefüggő dolog.

**Hol fogad kapcsolatot.** Az API indításakor (`apps/backend/src/server.ts`) csak portot adunk
meg, címet nem. Ilyenkor a gép minden hálózati kapcsolatán elérhető: nemcsak a gépen belülről
(`localhost`), hanem a Wi-Fi-n vagy egy szerver nyilvános címén át is. Ezt ellenőriztem: a futó
API a `*:3001` címen figyelt. A terv szerint viszont a böngésző soha nem beszél közvetlenül az
API-val, mindig a frontend áll előtte, élesben a Caddy. Ha az API kívülről is elérhető, ez
megkerülhető, és vele minden, amit a proxy ad: a TLS, később a kéréskorlátozás.

**Kinek hiszi el a látogató IP-címét.** Mivel az API előtt proxy áll, az API minden kérést a
proxytól lát érkezni. A látogató valódi címét a proxy írja bele az `X-Forwarded-For` fejlécbe.
Ez sima szöveg: aki közvetlenül eléri az API-t, azt ír bele, amit akar. A belépési könyvtár
(Better Auth) ebből a címből dolgozik: élesben ez alapján korlátozza a próbálkozásokat, például
10 másodpercenként 3 belépési kísérlet címenként.

Ami elromolhat:

- Ha a cím hamisítható, a korlát megkerülhető, vagyis a jelszó korlátlanul találgatható.
- Ha a könyvtár nem tud megbízható címet kiolvasni, minden látogató egy közös számlálóba kerül
  (ezt a könyvtár forrásában néztem meg). Ekkor egyetlen ember próbálkozásai mindenkit
  kizárhatnak a belépésből.

**Baj ez most?** Fejlesztés közben nem igazán: a korlát ki van kapcsolva, az adatbázisban
tesztadat van. Annyi igaz, hogy aki a fejlesztői géppel egy hálózaton van, eléri a 3001-es
portot.

**Teendő élesítéskor:** az API csak a proxy felől legyen elérhető, és a könyvtár tudja, melyik
proxyban bízhat (`advanced.ipAddress.trustedProxies`). A helyes beállítás attól függ, hogyan fut
majd élesben a rendszer (egy gépen vagy Docker-hálózatban), ezért a figyelési cím legyen
beállítható. A fő terv M4-es élesítési pontjában szerepel.

### 2. A saját útvonalaink nem ellenőrzik az `Origin` fejlécet

Belépés után a böngésző minden kéréshez magától csatolja a munkamenet-sütit. Egy idegen weboldal
ezt kihasználva megpróbálhat a belépett felhasználó böngészőjével kérést küldetni, például
„töröld ezt a parkot”. Ezt hívják CSRF-nek. Az `Origin` fejlécben a böngésző megmondja, melyik
oldalról indult a kérés, és ezt az oldal nem tudja átírni. A szerver így elutasíthatja, ami nem
a saját címéről jön.

- A belépési könyvtár útvonalai (`/api/auth/*`) ezt ellenőrzik, teszt is van rá.
- A saját útvonalaink (parkok, admin, regisztráció) nem. Kipróbáltam: érvényes sütivel és
  `Origin: https://evil.example` fejléccel a park létrehozása 201-et, a törlése 204-et ad.
  Az API-nak tehát mindegy, honnan jön a kérés.

Azért csak apróság, mert a böngésző két másik szabálya ma megfogja a támadást:

1. A süti `SameSite=Lax` beállítású, ezért idegen oldalról indított módosító kéréshez a böngésző
   nem csatolja.
2. Az útvonalaink csak JSON törzset fogadnak el, a törlés pedig DELETE kérés. Ilyet idegen oldal
   csak előzetes engedélykérés után küldhet, és azt az API nem adja meg. A sima szövegként
   küldött JSON-t az API 400-zal utasítja el; ezt is kipróbáltam.

A hiányzó ellenőrzés tehát egy harmadik védvonal lenne. Két helyzetben számítana:

- A `SameSite` azonos webhelyet néz, nem azonos címet. A marketingoldal (`eneredge.tech`) és az
  alkalmazás (`app.eneredge.tech`) egy webhelynek számít, onnan indítva tehát csak a 2. védelem
  él.
- Ha később valaki nem JSON-t fogadó végpontot ad hozzá, vagy más oldalaknak is engedélyezi az
  API hívását, a védelem csendben megszűnne.

**Teendő:** egy rövid köztes réteg az API-ban (`apps/backend/src/app.ts`), amely a módosító
kéréseknél megköveteli, hogy az `Origin` az alkalmazás címe legyen. Körülbelül 15 sor és egy
teszt; nem függ az élesítéstől.

### 3. A belépés 7 nap után lejár, akkor is, ha a felhasználó aktív

A munkamenet 7 napig él. A felülvizsgáló szerint használat közben nem hosszabbodik meg: a saját
„ki van belépve” ellenőrzésünk (`apps/backend/src/middleware/session.ts`) csak olvassa a
munkamenetet, megújított sütit nem ad vissza a böngészőnek. A következmény: 7 nappal a belépés
után a felhasználót munka közben kilépteti a rendszer.

Ezt nem ellenőriztem olyan teszttel, amely előreállítja az órát. **Teendő:** egy ilyen teszt; ha
igazolja a hibát, az ellenőrzés adja tovább a megújított sütit.

### 4. A hibás lekérdezés naplója személyes adatot is tartalmazhat

Ha egy adatbázis-lekérdezés hibára fut, a naplóba a teljes lekérdezés az értékeivel együtt kerül
be, például egy e-mail-címmel. Ezt a tesztek kimenetében láttam. Élesben így személyes adat
jelenne meg a naplóban. **Teendő:** naplózás előtt a paramétereket elhagyni.

### 5. A regisztráció háttérmunkáját a leállítás nem várja meg

A regisztrációs kérésre a szerver azonnal válaszol, a fiók létrehozása és a levél a háttérben
megy. Ha a szerver éppen ebben a pillanatban újraindul, az a levél elvész. A felhasználó a
„Levél újraküldése” gombbal pótolhatja. **Teendő:** leállításkor megvárni a futó háttérmunkát.

### 6. Az időzóna úgy tárolódik, ahogy beírták

Az API minden nevet elfogad, amelyet a futtatókörnyezet időzónaként ismer. Kipróbáltam: az
`europe/budapest` (kisbetűvel) és a `+02:00` (rögzített eltolás) is átmegy. A felület listából
választat, ezért ez csak közvetlen API-hívással fordul elő.

A következmény: ugyanaz a zóna többféle írásmóddal tárolódhat, a rögzített eltolás pedig nem
követi a nyári időszámítást. **Teendő:** a tárolt érték mindig a szabványos név legyen, a
rögzített eltolást az API utasítsa el. Az M3 előtt érdemes megcsinálni, mert onnantól az időzóna
számításokba kerül (napi energia).

### 7. Láthatatlan parknév lehetséges

Egy park neve állhat csak nulla szélességű szóközből (U+200B): a szóközlevágás ezt nem tekinti
szóköznek (kipróbáltam). A listában üres nevű kártya jelenne meg. **Teendő:** a láthatatlan
karakterek kiszűrése a névszabályban (`apps/backend/src/text-rules.ts`).

### 8. A cég sorának zárolása erősebb a szükségesnél

Park felvételekor a cég sorát zároljuk, hogy két egyidejű kérés ne csússzon át a parkkorláton.
A használt `FOR UPDATE` zár alatt azok az írások is várnak, amelyek más táblába szúrnak be erre
a cégre hivatkozó sort (például egy új tag vagy meghívó). A `FOR NO KEY UPDATE` elég lenne. Ma
nincs érezhető hatása. **Teendő:** egy szó cseréje a `packages/db/src/repositories/` két
fájljában; a meglévő tesztek védik.

### 9. Két félrevezető üzenet

- A tagok táblájában a szerepmódosítás vagy az eltávolítás bármilyen hibájára ezt írjuk: „A
  cégnek mindig kell egy tulajdonos.” Akkor is, ha a hiba más, például megszakadt a kapcsolat.
- Az „Elfelejtett jelszó” oldal akkor is azt írja, hogy elküldtük a levelet, ha a kérés el sem
  jutott a szerverig.

**Teendő:** a hiba oka szerint megkülönböztetni az üzenetet; kapcsolati hibánál hibát mutatni.

### 10. Üres oldal, ha a „ki van belépve” kérés hibázik

A kezdőlap és a meghívó oldala semmit nem mutat, ha az `/api/me` kérésre hiba jön, például mert
a backend nem fut. A felhasználó fehér oldalt lát magyarázat nélkül. **Teendő:** hibaállapot
„Próbáld újra” gombbal; a `LoadError` komponens megvan hozzá.

### 11. A „nincs hozzáférés” oldal furcsán jelenik meg az új park címén

Ha egy olvasó jogú tag megnyitja a `/o/<cég>/parks/new` címet, a teljes oldalas „nem találjuk,
vagy nincs hozzáférésed” üzenet az alkalmazás keretén belül jelenik meg. Működik, de nem illik a
keretbe. **Teendő:** a keretbe illő változat.

### 12. Minden oldal címe „EnerEdge”

A böngészőfülön nem látszik, melyik oldalon vagyunk (Parkok, Beállítások, egy park neve). Több
nyitott fülnél és az előzményekben ez zavaró. **Teendő:** oldalanként saját cím.

### 13. Lekérdezési ütem látszik egy be nem kötött parknál

A park oldalán akkor is ott áll a „Lekérdezési ütem: 5 másodperc”, amikor a park még vázlat, és
semmi nem kérdezi le. Ez azt sugallja, hogy a lekérdezés már fut. **Teendő:** csak bekötött
parknál mutatni.

### 14. A lejárt link kártyájának címe új fióknál is „Új jelszó beállítása”

Ha valaki egy már felhasznált vagy lejárt jelszólinket nyit meg, a kártya címe mindig „Új jelszó
beállítása”, akkor is, ha a link egy új fiók első jelszavához tartozott. **Teendő:** semleges
cím.

### 15. Három szó egy dologra a kódban

Az `organization`, az `org` és a `company` ugyanazt jelenti; a felületen: cég. A README
elmagyarázza, de a kód következetlen maradt. **Teendő:** egy szóra egységesíteni. Ez sok fájlt
érintő átnevezés, ezért egy mérföldkő elején érdemes megcsinálni, nem menet közben.

### 16. A frontend kézzel írja újra a backend néhány válaszformáját

A tagok, a meghívók és a cégek típusa (`Member`, `Invitation`, `Company`) a frontend három
komponensében külön le van írva, nem a backendből jön. Ha a backend válasza megváltozik, a
fordító nem szól. **Teendő:** a típusokat a backend szerződéséből
(`apps/backend/src/contract.ts`), illetve a belépési könyvtár típusaiból venni.

### 17. Cég létrehozásakor nincs előzetes azonosító-ellenőrzés

A terv szerint az űrlap már gépelés közben megnézte volna, szabad-e a cég azonosítója. Most csak
beküldéskor derül ki („Ez az azonosító már foglalt”). Ez eltérés a tervtől, amelyet annak idején
nem jegyeztem fel. **Teendő:** ellenőrzés gépelés közben.

### 18. A cégek elszigetelése megállapodás, nem kikényszerített garancia

A szabály az, hogy a cégek adataihoz a kód csak a `packages/db/src/repositories/` függvényein át
nyúl, és ezek `OrgScope`-ot kérnek, amelyet csak a tagság ellenőrzése állít elő. Ezt a meglévő
kód betartja, és tesztek védik. A fordító viszont nem kényszeríti ki: az adatbázis-kapcsolat
közvetlenül is elérhető, és a platform-admin függvényei szándékosan nem kérnek `OrgScope`-ot.
Egy figyelmetlenül megírt új lekérdezés megkerülheti.

**Teendő, ha erősebb védelem kell:** lint-szabály, amely a `repositories/` mappán kívül tiltja a
közvetlen lekérdezést, vagy adatbázisszintű sorvédelem. Az M2 előtt érdemes eldönteni, mert
onnantól több adat és több kód lesz.

### 19. A böngészős próbák megszakításkor nem takarítanak maguk után

Ha a `bun run e2e` futását megszakítod (Ctrl-C), a háttérben elindított szerverek és az
eldobható adatbázis megmaradhatnak. A következő futás ilyenkor azt írja, hogy a port foglalt.
**Teendő:** megszakításkor is leállítani és törölni (`e2e/run.ts`).

### 20. A CI még soha nem futott, és három beállítása hiányzik

A GitHub-munkafolyamat (`.github/workflows/ci.yml`) még nem futott, mert az M1-ből semmi nincs
pusholva. Ezen felül:

- egy pull request ágán kétszer futna, mert a push és a pull request eseményre is indul;
- nincs időkorlátja, így egy beragadt futás sokáig fogyasztaná a keretet;
- a jogosultsága nincs leszűkítve.

**Teendő:** az első push után megnézni, zöld-e, és pótolni a három beállítást.

### 21. Két beállítás nincs dokumentálva

- `API_ORIGIN`: a frontend ebből tudja, hol érhető el a backend; alapértéke
  `http://localhost:3001`.
- `bun run start`: a két rész éles indítása.

Egyik sincs leírva a README-ben és az `.env.example`-ben. **Teendő:** két bekezdés.

### 22. A tesztek kimenete nem csendes

A `bun test` futása közben a belépési könyvtár figyelmeztetést ír minden olyan kérésre, amelynek
az elutasítását a teszt várja. A valódi hibák így nehezebben vehetők észre a kimenetben.
**Teendő:** tesztben elnémítani a könyvtár naplóját.

### 23. Egyidejű regisztráció ugyanarra a címre hibát naplóz

Ha ugyanarra az új címre egy pillanatban két regisztrációs kérés érkezik, a belépési könyvtár
hibát naplóz („Failed to create user”). A végeredmény jó: egy fiók jön létre, a levél kimegy;
erre teszt van. A napló viszont ijesztő, és a két kérés neve közül bármelyik megmaradhat. A
felületről ez nem idézhető elő, mert a gomb küldés közben le van tiltva. **Teendő:** címenként
sorba állítani a regisztrációs munkát.

## B. Úgy maradt, indokkal

Ezekről a felülvizsgáló nem mondott ítéletet. Úgy döntöttem, hogy az M1-ben így maradnak;
mindegyiknél ott áll, mibe kerül, ha tévedtem.

24. **Egy felhasználó akárhány céget létrehozhat, mindegyik 10 parkkal.** A korlát cégenkénti,
    és az M7-ig a rendszer meghívásos. Ára: egy meghívott sok parkot tarthat. A nyílt
    regisztráció előtt (M7) újra kell nézni.
25. **Nincs audit sor a tagokról, szerepekről, meghívókról, a cég átnevezéséről és az
    engedélyezett címekről.** A terv a park-műveletekre kért audit sort; a többi változás a
    belépési könyvtárban történik. Ára: utólag nem derül ki, ki kit távolított el vagy léptetett
    elő.
26. **Nincs felület a cégből kilépésre, a név és a jelszó módosítására, a munkamenetek
    listázására.** Az M1 a váz. Jelszót az „Elfelejtett jelszó” úton lehet cserélni; nevet
    egyáltalán nem lehet módosítani. Ára: ezek egy profiloldalig várnak.
27. **Biztonsági fejlécek, TLS, kéréskorlátozás.** A TLS az M4-ben jön a Caddy-vel. A fejlécek
    és a kéréskorlátozás eddig egyik tervben sem szerepeltek; a fő terv M4-es pontjába beírtam.
    Ide tartozik, hogy az új regisztrációs útvonalon (`/api/account/sign-up`) nincs korlát, és a
    belépési könyvtár beépített korlátja a saját útvonalainkat nem védi. Ára: az első nyilvános
    élesítésig nincs; ha a rendszer előbb kerülne ki a netre, korlátlanul lehetne vele levelet
    küldetni.
28. **Az élő adat (SSE) a frontenden át is működik-e.** Az M3 témája; a fő tervben szerepel,
    hogy élesben a Caddy közvetlenül a backendhez irányít. Ára: az M1-ben nincs.
29. **A levelek szövege a backendben van, nem a felület szótárában.** A backend nem importálhat
    a frontendből, és egy nyelv van. Ára: egy második nyelvnél a leveleknek is szótár kell.
30. **A levelek sima szövegűek.** Fióklevelekhez megfelel. A kézbesíthetőség (SPF, DKIM, DMARC)
    az M4-hez tartozik, amikor a valódi postafiók megvan. Ára: az M1-ben nincs.
31. **Jelszóerősség és kétlépcsős belépés.** A jelszó legalább 10 karakter, ahogy a terv kéri;
    erősségmérő, kiszivárgott jelszavak ellenőrzése és második lépcső nincs. Ára: hosszú, de
    gyenge jelszó lehetséges.
32. **A be nem fejezett regisztrációk fiókja megmarad.** Ilyen fiókba senki nem tud belépni, és
    újra felhasználódik, ha a cím ismét regisztrál. Takarítás nincs. Ára: halott sorok gyűlnek;
    időszakos törlés az M8-ba illik.
33. **A tagok látják egymás e-mail-címét és a függő meghívókat.** Egy cég kollégáiról van szó,
    az olvasó jogú tag csak olvassa. Ára: megismeri a kollégák címét.
34. **Egy tulajdonos az API-n át másik tulajdonost is meghívhat.** A felület csak tagot és
    admint kínál. A tulajdonos úgyis bárkit tulajdonossá tehet; admin nem tud ilyet (teszt van
    rá). Ára: nincs.
35. **Nincs lapozás.** A parkok száma cégenként korlátos, a tagok és a meghívók listája kicsi.
    Elsőként az admin céglistája fogja igényelni. Ára: lassú admin oldal több száz cégnél.
36. **A belépési könyvtár angol hibaoldala.** Csak olyan átirányításból érhető el, amelyet a
    linkjeink már nem használnak. Ára: aki kézzel ír be ilyen címet, angol oldalt lát.
37. **A meghívó nem működik, ha a meghívója közben kilépett a cégből.** A könyvtár viselkedése;
    a megmaradt vezetők egy kattintással újra meghívhatják. Ára: a meghívottnak újra kérnie
    kell.
38. **Bármely belépett felhasználó megtudhatja, foglalt-e egy cégazonosító.** Ez kell a szabad
    azonosító választásához, és az azonosító a címekben amúgy is látszik. Ára: a cégnevek
    kitapogathatók.
39. **„Nincs jelzés.” a Jelzések oldalon, mielőtt riasztás létezne.** Az M4 előtt egy park sem
    köthető be, és a szöveg alatt az áll, hogy a jelzések itt fognak megjelenni. Ára: nincs,
    amíg nincs élő park. Az M5-ben a helyére kerül.
40. **A látvány és a szövegek minősége.** A felülvizsgáló nem ítélte meg; képernyőképeken
    ellenőriztem. Ezt a tulajdonos dönti el. Ára: átstílusozás vagy átfogalmazás.

## C. A javítási kör döntései, amelyeknek ára lehet

A regisztráció újraírásakor hozott döntések közül ezeknek van olyan következménye, amelyről
érdemes tudni.

41. **Be nem fejezett regisztrációnál az utoljára beírt név marad.** Aki más címével regisztrál
    közvetlenül azelőtt, hogy a cím gazdája megnyitja a linkjét, az ő fiókjának megjelenő nevét
    állítja be. Nevet módosítani még nem lehet (26. pont).
42. **Már regisztrált címre értesítő megy belépő linkkel.** Bárki küldethet ilyen értesítőt egy
    fióktulajdonosnak, akárhányszor, amíg nincs kéréskorlátozás (27. pont).
43. **A jelszólink tartalmazza a fiók e-mail-címét**, hogy az oldal a jelszó beállítása után be
    tudjon léptetni. A cím így megjelenik a böngésző előzményeiben és a webszerver naplójában.
44. **A jelszólink 24 óráig érvényes** (a könyvtár alapértéke 1 óra), hogy a másnap reggel
    elolvasott levél is működjön. Egy más által is olvasható postafiókban a link egy napig
    használható.
45. **A szóközzel körülvett cégnevet az API elutasítja, nem vágja le.** A felület levágja küldés
    előtt; egy közvetlen API-hívó 400-at kap.
46. **A „regisztráció meghívásos” tájékoztatót kézzel ellenőriztem, nem automata teszttel**,
    mert a böngészős próbák rendszere nyílt módban fut. Ha a tájékoztató elromlik, a CI nem
    veszi észre.

## D. Nyitott döntések

- **Az `m1-vaz` ág sorsa:** helyben beolvasztás a `main`-be, pull request, vagy marad így. Az én
  javaslatom a pull request, mert a CI még soha nem futott.
- **Külön felülvizsgálat a regisztráció újraírására?** Ez jelentős új, biztonsági szempontból
  érzékeny kód, amelyet a független felülvizsgáló már nem látott. Tesztek védik.
- **A 2. pont (Origin-ellenőrzés) most vagy később?** Az élesítéstől független, kicsi változás.
- **A két mappa helye:** most `apps/frontend` és `apps/backend`. Ha a repó gyökerében legyenek
  (`frontend/`, `backend/`), az egy gyors átmozgatás.
- **A tulajdonos tervének 12. pontja** (`docs/eneredge-terv-v0.md`) még a régi mappaneveket írja
  (`apps/web`, `apps/api`). Nem nyúltam hozzá.
