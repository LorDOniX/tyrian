# Fáze 19 – dvojité kanóny a padající kameny z newshd

Ve třetím a čtvrtém levelu přibyly další pozemní kanóny a rozstřelitelné
kameny ze souboru `Remastered Tyrian Graphics/newshd.shp.000000.png`.

## Dva nové typy pozemních kanónů

Původní kanóny z `newshs` zůstávají ve hře. Vedle nich jsou nově:

| Varianta | Zdrojové výřezy | Palba |
| --- | --- | --- |
| Ocelová dvojitá věž | x = 96, 120, 144; y = 196; 24 × 28 px | Dvě souběžné střely |
| Zlatá dvojitá věž | x = 24, 48, 72; y = 56; 24 × 28 px | Dvě souběžné střely |

Hlava kanónu se otáčí k hráči nad pevnou základnou. Tři snímky slouží pro
klid a postupné rozsvícení před výstřelem. Signalizace se zobrazuje na obou
hlavních a jejich umístění odpovídá počátečním polohám projektilů.

Obě střely v páru mají **stejný směr a rychlost 6 jednotek za sekundu**.
Jsou od sebe vzdálené 0,44 jednotky kolmo ke směru palby; nejde o vějíř.
Ústí hlavní je nejvýše 1,05 jednotky před středem věže. Při střelbě zblízka
se dopředná vzdálenost zkrátí, aby střely nepřeskočily hráče.

Původní kanóny nadále střílejí jednu střelu. Všechny typy mají dva body
zdraví, interval palby 1,5 sekundy a odměnu 200 bodů i kreditů. Zničení
věže před vytvořením salvy zruší i oba připravené výstřely.

### Rozmístění

Třetí mise má nyní pět pozemních věží, z toho dvě nové dvojité varianty.
Čtvrtá mise má devět věží, z toho čtyři dvojité. Kanóny byly přidané navíc
mezi původní pozice. Datové události zůstávají seřazené podle vzdálenosti
v mapě. První mise a vzdušný konvoj si zachovávají původní pozemní cíle.

Definice variant a výpočet salvy jsou v `src/ground-weapons.ts`. Pozemní
cíl nese vlastnost `weapon`; chybějící hodnota znamená původní jednostřelový
kanón. `src/level.ts` určuje rozmístění a `src/game.ts` vytváří projektily
po vyhodnocení kolizí. `src/scene.ts` používá odpovídající sprite i počet
signalizačních záblesků.

## Padající kameny

Kameny padají shora dolů a plynule se otáčejí. Malý má dva body zdraví
s rychlostí pádu 4,5; velký čtyři body zdraví s rychlostí 3,5.
Zásahy lodi je poškozují a poslední potřebná střela je zničí explozí.

Při kontaktu s hráčem kámen poškodí štít podle dosavadních pravidel
životů a zmizí. Pokud jej hráč ve stejném kroku nejprve rozstřelí,
ke kolizi a poškození hráče už nedojde. Kámen, který proletí celou
obrazovkou, se odstraní. Kameny nikdy nestřílejí.

**Za kameny nejsou žádné body ani kredity a nevydávají bonusy.**
To platí pro rozstřelení i náraz; oprávnění nést bonus se při jejich
vytvoření potlačí. Jde o překážky, nikoli zdroj peněz pro hangár.

| Kámen | Výřez (x, y, šířka, výška) | Životy | Odměna |
| --- | --- | --- | --- |
| Malý | 48, 0, 24, 28 | 2 | 0 |
| Velký | 48, 28, 24, 28 | 4 | 0 |

Ve třetím levelu přibylo devět kamenů, ve čtvrtém patnáct. Čtvrtá mise
má tedy 39 lodí a 15 kamenů v časovaných vlnách plus devět pozemních věží.
Kameny používají společné swept kolize s nepřáteli. Před příchodem bosse
se vyčká na jejich zničení nebo odlet mimo obrazovku.

Typy `rockSmall` a `rockLarge` jsou v `src/enemies.ts`, vlny v `src/level.ts`
a vzhledy ve `src/sprite-clips.ts`. Pohyb i otáčení respektují pauzu.

## Atlas a ověření

Přibylo šest snímků kanónů a dva snímky kamenů. Sdílený atlas má nyní
**118 snímků**, stále při rozměru 512 × 512 px. Byl znovu připraven
příkazem `npm run assets:prepare`.

Prošlo **123 testů** a produkční sestavení včetně kontroly TypeScriptu.
Nové testy v `tests/ground-hazards.test.ts` ověřují souběžné dvojice,
bezpečné míření zblízka, zrušení palby zničeného kanónu, rozmístění variant,
výdrž kamenů, nulové odměny, kontakt s hráčem, odstraňování a čekání na
vyřešení překážek před bossem. Dosavadní průchody třetím a čtvrtým levelem
nadále dosáhnou závěrečného vítězství.

V prohlížeči byl ověřen otočený dvojitý kanón, jeho pár souběžných střel
a padající kameny na mapě bez chyb v konzoli.

```sh
npm run dev:level3
npm run dev:level4
npm test
npm run build
```
