# Fáze 11 – třetí level a Ocelová pevnost

Třetí level navazuje na vítězství ve druhém. Enter přenese skóre do nové mise,
obnoví tři životy a základní zbraň. Restart vrací skóre na checkpoint začátku
aktuálního levelu. Kampaň je dokončená až po třetím bossovi.

## Nové lodě

Používáme dosud nevyužité řádky `newsh$.shp.000000.png`, každý se třemi
výřezy 24 × 28 px (x = 0, 48, 96). Modely se otáčejí dolů jako ostatní malé lodě.

| Typ | Výřez y | Životy | Útok | Body |
| --- | --- | --- | --- | --- |
| Weaver | 84 | 2 | Průlet s kličkováním a třemi samostatně mířenými střelami | 250 |
| Striker | 112 | 4 | Zastaví, vypálí třikrát čtyři střely z dvojitého vějíře a odletí | 450 |

Pohyb a střelba jsou v `src/enemies.ts`. Výstřely se vytvářejí po kolizích,
takže loď zničená v daném kroku už nevystřelí. Všechny typy opouštějí obrazovku,
aby přeživší nepřítel nezablokoval dokončení mise.

## Průběh levelu

`src/level.ts` obsahuje 56 sekund vln rozdělených na Průlom, Křížovou palbu
a Obranu pevnosti. Nové lodě doplňují interceptory, pulsary a jednu vzducholoď.
Tři pozemní věže přidávají další mířenou palbu. Některé lodě nesou opravu nebo
trojstřelu. Terén třetí mise má vlastní teplou ocelovou paletu.

Po konci časované části hra vyčká na odlet či zničení všech nepřátel, věží
a nepřátelských projektilů. Pak zobrazí varování a přiletí boss pod štítem.

## Boss z newsho

Celý trup je výřez `(0, 0, 192, 140)` z `newsho.shp.000000.png`. Atlas
pro něj rezervuje oblast 208 × 144 px na `(256, 256)`. Zdrojová grafika
zůstává zachována; zelené pozadí se při přípravě atlasu zprůhlední.
Na rozdíl od bosse konvoje tento zdroj neobsahuje druhý celý poškozený trup.
Druhou fázi signalizují červená světla na hlavních a HUD.

Boss má **110 životů**, pět kolizních kruhů a tři střídající se útoky:

1. **Mířené dvojice:** čtyři dvojice střel, každá znovu zamíří na aktuální polohu
   hráče. Už vystřelené střely nemění směr. Rozestup dvojic je 0,28 s.
2. **Clona:** dvě salvy po osmi střelách z obou hlavní, s rozestupem 0,55 s.
   Druhá salva pootočí vějíř o 12 stupňů.
3. **Rotující pulzy:** tři kruhy po deseti střelách. Každý další kruh pootočí
   mezery o 12 stupňů; rozestup je 0,35 s.

Po dosažení poloviny zdraví dokončí rozběhnutý útok a odpočinek. Potom
přejde jednou do druhé fáze: rychlejší střely a příprava, kratší odpočinek,
šest mířených dvojic, tři clony a čtyři pulzy. Mezi útoky mění vodorovnou pozici.
Pravidla jsou v `src/fortress-boss.ts`, vykreslení v `src/fortress-boss-model.ts`.

Zničení přidá jednou 7 500 bodů, odstraní nepřátelské projektily a zruší
chystanou salvu. Následuje 1,5sekundová série explozí a vítězství kampaně.

## Spuštění a ověření

```sh
npm run dev:level3   # začátek třetí mise
npm run dev:boss3    # přímo varování před finálním bossem
npm test
npm run build
```

Ve vývoji jsou také tlačítka pro třetí level a jeho bosse. Produkční build
vždy začíná prvním levelem, i pokud byl sestaven s debug názvem režimu.

Testy pokrývají návaznost kampaně a checkpoint, nové nepřátele a konečný odlet,
vzory bosse, přechod fází, zničení při současné palbě, pauzu a celý třetí level
s běžnou střelbou. Test průchodu používá ochranu hráče pro izolaci pravidel mise;
nenahrazuje ruční ladění obtížnosti. V prohlížeči bylo ověřeno vykreslení trupu,
nových lodí, střel a HUD bez chyb v konzoli.
