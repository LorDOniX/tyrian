# Fáze 13 – štíty, životy a mezimisení hangár

Loď má nově dvě vrstvy ochrany: obnovitelný štít a životy trupu. Po dokončení
každé mise lze získané body utratit za trvalá vylepšení výzbroje, štítu a trupu.
Výběr sprite vzhledu z fáze 12 zůstává kosmetický a funguje se všemi vylepšeními.

## Menší základní útok

Základní střela je vizuálně kratší a užší: velikost klipu `playerShot`
se změnila z 1 na 0,75 a poměr šířky z 0,35 na 0,28. Kolizní poloměr
hráčových střel klesl z 0,09 na 0,065. Každá střela stále ubírá jeden bod
zdraví nepřítele a letí rychlostí 22 jednotek za sekundu.

Základní zbraň nyní střílí jednou za 0,22 sekundy. Zakoupené úrovně výzbroje
zvyšují počet paprsků a zrychlují kadenci. Dočasný bonus trojstřely funguje
nadále: po dobu 12 sekund dá trojstřelu i slabší výzbroji. Po vypršení se
vrátí zakoupený stupeň; efekty se nesčítají do více než tří střel v salvě.

## Ochrana lodi

Základní loď začíná se **6 body štítu a 3 životy**.

1. Zásah nejprve ubere jeden bod štítu. I částečně obnovený štít absorbuje
   zásah a zbytek klesne na nulu; tentýž zásah zároveň nepoškodí trup.
2. Při nulovém štítu zásah ubere jeden život.
3. Ztráta posledního života okamžitě znamená konec hry. Oprava již zničenou
   loď neoživí a automatická obnova štítu po konci hry neběží.

Po zásahu zůstává jedna sekunda ochrany proti opakovanému poškození. Více
střel nebo kontaktů v jednom okamžiku tedy neodečte celou zásobu ochrany.
Spotřebované nepřátelské projektily se odstraní i během této ochrany.

Štít se začne obnovovat po **3 sekundách bez poškození**, rychlostí **1 bod
za sekundu**, nejvýše do zakoupené kapacity. Nový zásah čekání obnoví.
Pauza zastaví obnovu i časování zásahů.

Kolem lodi se vykresluje slabý modrý obrys. Při zásahu štít výrazně blikne;
při jeho vyčerpání má záblesk červený odstín. Během závěrečného odletu se
obrys skrývá. Bonus opravy doplňuje jeden život až do aktuálně zakoupeného
maxima trupu. Při plném trupu stále dává 150 bodů místo opravy.

## Přístrojový panel

Na pravé straně je panel inspirovaný rozložením klasických stříleček:

- modrý segmentovaný ukazatel štítu a číselná hodnota;
- čas do začátku obnovy, případně zpráva o probíhající obnově;
- červený segmentovaný ukazatel životů a jejich maximum;
- dostupné kredity a úrovně tří částí výbavy.

Skóre zůstává vlevo u průběhu mise. Při zlomkové energii štítu se číselná
hodnota zaokrouhluje nahoru, zatímco délka ukazatele odpovídá přesné energii.
Na menších oknech se panel přesune dolů, aby nepřekrýval nadpis mise.

## Body a kredity

Každý skutečně získaný bod skóre přidá také jeden kredit. Platí to pro
nepřátele, věže, bosse i opravu při plném trupu. Skóre představuje celkový
výsledek; nákupy snižují pouze kreditový zůstatek.

Skóre ani kredity se znovu nepřipisují pouhým zobrazením výsledků. Při
restartu po prohře se obě hodnoty vracejí na checkpoint začátku aktuální
mise. Již zakoupená výbava zůstává zachovaná. Tak se z neúspěšných pokusů
nedají opakovaně přičítat stejné odměny.

## Hangár po každé misi

Po explozi bosse a závěrečném odletu se na výsledkové obrazovce zobrazí
hangár. Nákup není povinný; lze rovnou pokračovat do další mise. Každá
část výbavy má základní stupeň a dvě zakoupitelná vylepšení:

| Systém | První nákup | Cena | Druhý nákup | Cena |
| --- | --- | --- | --- | --- |
| Výzbroj | Dvojitý přímý paprsek, interval 0,18 s | 2 500 | Trvalá trojstřela, interval 0,14 s | 5 000 |
| Generátor štítu | Kapacita 6 → 9 | 2 000 | Kapacita 9 → 12 | 4 000 |
| Pancéřování | Životy 3 → 4 | 2 500 | Životy 4 → 5 | 5 000 |

Obchod ukazuje aktuální stupeň, účinek příštího nákupu a jeho cenu. Při
nedostatku kreditů nebo dosažení maxima je tlačítko nedostupné. Herní
pravidla nákup odmítnou také mimo vítěznou obrazovku.

Při přechodu do další mise se přenesou vylepšení, zbývající kredity i skóre.
Loď začne s plným štítem a plným počtem životů podle zakoupené výbavy.
Dočasná trojstřela se do další mise nepřenáší.

Hangár je dostupný i po třetí misi. Nakoupená vylepšení a kreditový zůstatek
se použijí při opakování posledního levelu. Volby a postup se zatím drží
v paměti aktuální stránky; obnovení stránky spustí novou hru.

## Rozdělení kódu

- `src/upgrades.ts`: ceny, stupně výbavy, maximální ochrana a kadence zbraní.
- `src/game.ts`: poškození, obnova štítu, kredity, nákupy a checkpointy.
- `src/bonuses.ts`: střelecké vzory a opravy podle zakoupeného maxima.
- `src/scene.ts`: obrys a záblesky štítu kolem vybraného sprite trupu.
- `src/main.ts`, `index.html`, `src/style.css`: panel systémů a hangár.
- `tests/shields-shop.test.ts`: nové testy ochrany a ekonomiky.

Při dokončení prošlo **99 testů**, kontrola TypeScriptu a produkční build.
Testy pokrývají vyčerpání štítu a trupu, konec hry, zpožděnou regeneraci,
souběžné zásahy, pauzu, nákupní omezení, přenos výbavy a rozpočtu, opravy
vylepšeného trupu a všechny tři stupně palby. Původní testy poškození trupu
explicitně používají vyčerpaný štít.

V prohlížeči byl ověřen nákup dvojitého paprsku a většího štítu, odečtení
kreditů a použití zakoupené výbavy při opakování mise bez chyb v konzoli.
Číselné ceny a obtížnost jsou výchozí nastavení pro další ladění hraním.

```sh
npm run dev:shop     # vývojový náhled hangáru s 9 000 kredity
npm run dev         # běžná hra od prvního levelu
npm test
npm run build
```

Vývojový režim obsahuje také tlačítko **Debug: hangár**. Ukázkové kredity
a přeskočení mise jsou dostupné jen ve vývoji; produkční hra je nevytváří.
