# Fáze 8: Tyrian lodě a rozšířená flotila

Běžné nepřátelské lodě nově používají celé sprite výřezy z Tyrianu.
Ve stejné 55sekundové časové ose je místo 28 celkem 50 lodí pěti typů.
Boss má zachovaný původní 3D model, životy, útoky i přechody fází.
Hráčova loď, terén a pozemní věže také zůstávají 3D.

## 1. Druhy nepřátel

| Typ | Vzhled | Počet ve vlnách | Životy | Body | Chování a útok |
| --- | --- | --- | --- | --- | --- |
| Průletová loď (`scout`) | Červená se dvěma dlouhými rameny | 19 | 1 | 100 | Letí rovně dolů, nestřílí. |
| Střelec (`gunner`) | Úzká tmavě modrá loď | 12 | 2 | 250 | Zastaví na Y = 7, třikrát jednotlivě zamíří na hráče a potom odletí. |
| Stíhač (`interceptor`) | Stříbrná šípovitá loď | 11 | 1 | 150 | Kličkuje během průletu; dvakrát vystřelí dvojici rovnoběžných střel dolů. |
| Vějířová loď (`spreader`) | Široká modrá trojúhelníková loď | 5 | 3 | 300 | Zastaví na Y = 6,5, vyšle dva vějíře po třech střelách a odletí. |
| Pulsar (`pulsar`) | Zelená loď | 3 | 3 | 400 | Zastaví na Y = 8, dvakrát vystřelí osm střel do kruhu a odletí. |

Počet je součet za celou úroveň, ne počet současně na obrazovce.
Každý střelec má omezený počet salv a konečný odlet. Zbývající lodě
ani jejich střely tak nemohou blokovat přílet bosse navždy.

## 2. Čtyři různé vzory střelby

**Míření:** střelec při každém výstřelu spočítá vektor k hráči. Střela letí
rychlostí 6 jednotek/s a dále už hráče nesleduje. Rozestup výstřelů je 0,8 s.

**Dvojice:** stíhač střílí ze dvou míst vzdálených 0,6 jednotky.
Obě střely míří přímo dolů rychlostí 7 jednotek/s. Salvy dělí 1,5 s.
Stíhač zároveň mění X podle sinusovky s amplitudou 1,5 jednotky.
Výsledná pozice je omezená na rozsah −7,5 až +7,5.

**Vějíř:** tři střely pod úhly −24°, 0° a +24° od směru dolů mají stejnou
rychlost 5,5 jednotky/s. Mezi střelami zůstávají mezery. Salvy dělí 1,25 s.

**Kruh:** osm střel po 45° vyletí od středu pulsaru rychlostí 4,5 jednotky/s.
Střely letící nahoru či do stran také normálně opouštějí herní plochu.
Salvy dělí 1,6 s. Nižší rychlost ponechává čas reagovat na více směrů.

Posledních nejvýše 0,5 s před výstřelem je u přídě vidět rostoucí jasný bod.
Je kreslený nad spritem, aby ho velká loď nezakryla. Příprava a útoky se
při pauze zastaví. Lodě při příletu mimo obraz nestřílejí.

## 3. Pestřejší průběh úrovně

Původní formace a pět nosičů bonusů zůstaly zachované. Přibyly:

- Stíhače v časech 4, 20, 39 a 46 s.
- Další průletová formace v 11 s.
- Vějířové lodě ve 14, 27 a 41 s.
- Jeden pulsar ve 34 s a dvojice pulsarů ve 48 s.

Typy se tedy představují postupně a až později se kombinují.
Zbývající nepřátelé po skončení časové osy doletí své útoky a odletí.
Přechod k bossovi dál čeká na odstranění všech aktivních hrozeb.

Bonusy stále padají pouze po sestřelení označených nosičů. Náraz do hráče
odměnu nevytvoří. Nové typy mohou technicky nést stejný `drop`, ale v těchto
vlnách zůstává původních pět odměn, aby se současně neměnilo jejich rozložení.

## 4. Celé sprite lodě místo částí obrázku

Používáme `Remastered Tyrian Graphics/newsh$.shp.000000.png`.
Každý snímek lodi je výřez 24 × 28 pixelů, tedy čtyři původní buňky
12 × 14. Pouhé vystřižení jedné původní buňky by zobrazilo jen část lodi.

| Klip | Zdrojové Y | Zdrojové X pro tři polohy |
| --- | --- | --- |
| `scoutShip` | 0 | 0, 48, 96 |
| `gunnerShip` | 28 | 0, 48, 96 |
| `interceptorShip` | 140 | 0, 48, 96 |
| `spreaderShip` | 56 | 0, 48, 96 |
| `pulsarShip` | 168 | 0, 48, 96 |

Poloha snímku odpovídá bočnímu pohybu: vlevo, rovně nebo vpravo.
Varianty se necyklují podle času. Model se otočí o 180° kolem Z,
protože předloha míří vzhůru a nepřátelé letí směrem dolů.

Atlas má nově 512 × 128 pixelů, buňky 32 × 32 a celkem 47 obsazených snímků.
Původní efekty i projektily mají stejnou velikost jako před změnou: parametr
`referenceCell` kompenzuje větší prázdný prostor atlasové buňky.
Textura, materiál i geometrie snímků se dál sdílejí.

Při kontrole atlasu byl také vynechán první snímek oranžového bonusu,
který obsahuje světlý neprůhledný obdélník. Jeho třífázová animace nově
používá sloupce 13, 14, 15; pravidla a časování bonusu se nemění.

## 5. Sprity nemění pravidla kolizí

Vykreslení lodi je plocha ve 3D scéně, ale kolize nadále počítáme pomocí
kruhů v XY. Náklon snímku nemění hitbox. Jeho poloměr je nastavený pro
konkrétní typ; přesné tvary lze zobrazit přepínačem kolizních kruhů.

Zásahy hráčových střel mají pořád přednost před výstřely nepřátel:
`updateEnemy()` pouze oznámí připravený útok. Po kolizích se přes
`enemyVolley()` vytvoří střely jen u přeživších lodí.
To platí i pro dvojici, celý vějíř nebo kruh: zničený nepřítel nevypustí
část salvy a body se přičtou jednou.

## 6. Rozdělení kódu a ověření

- `src/enemies.ts`: konfigurace pěti typů, pohyb, příprava a výpočty salv.
- `src/level.ts`: rozšířená časová osa padesáti lodí.
- `src/game.ts`: vznik lodí, kolize, odměny a odložené vytvoření projektilů.
- `src/sprite-clips.ts`: celé výřezy a varianty náklonu.
- `scripts/prepare-sprites.ts`: centrování různých velikostí výřezů a kontrola kapacity atlasu.
- `src/scene.ts`: sprite trupy, signalizace výstřelu a bezpečný úklid sdílených prostředků.
- `tests/enemies.test.ts`: vlny, směry a počty střel, rychlosti, kličkování, zničení a pauza.

Projdou `npm test` a `npm run build`. Test celé mise dál ověřuje napojení
vln na bosse a vítězství; trvalá ochrana hráče v tomto testu slouží jen
k ověření konečnosti simulace, ne jako posouzení obtížnosti.

Ve hře zkus nejprve nepřátele pozorovat bez střelby, potom s trojstřelou.
Sleduj, jak se liší mířený útok, rovnoběžné střely, vějíř a kruh.
Pro samostatné ladění původního bosse dál funguje
`npm run dev -- --mode boss`.
