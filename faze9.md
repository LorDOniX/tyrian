# Fáze 9: druhý level a poškozované vzducholodě

Přibyl level 2 „Vzdušný konvoj“ s vlastním seznamem vln a novým nepřítelem.
Po dokončení prvního levelu a jeho původního bosse pokračuje tlačítko
„Další level“ nebo Enter do konvoje. Původní konec po vlnách rozšiřuje [fáze 10](faze10.md): po vyřešení
nepřátel a jejich střel přichází Admirál konvoje z `newsht.shp.000000.png`.
Kampaň končí až po jeho poražení.

## 1. Jak druhý level funguje

Časová osa má 48 sekund, 23 nepřátelských lodí a čtyři vzducholodě:

- První vzducholoď přiletí v 1. sekundě středem a nese trojstřelu.
- Druhá přiletí v 16. sekundě na X = −3,5 a také nese trojstřelu.
- Závěrečná dvojice přiletí ve 34. sekundě na X = −3,5 a +3,5.
- Doprovod tvoří průletové lodě, stíhače, střelec, vějířové lodě a pulsar.
- Opravy nesou dvě průletové formace ve 12. a 30. sekundě.

Konvoj nemá pozemní věže. Prostředí dostalo vlastní odstíny podkladu a
konstrukcí. Herní plocha, ovládání a chování dekorativního terénu jsou stejné.
Konec časové osy ještě automaticky neznamená vítězství: hra počká na
zničení nebo odlet všech nepřátel a na odstranění nepřátelských střel.

## 2. Vzducholoď a změna vzhledu

Používáme přesně `Remastered Tyrian Graphics/newshi.shp.000000.png`.
Soubor obsahuje dvě celé velké varianty téhož trupu:

| Stav | Zdrojový výřez v pixelech |
| --- | --- |
| Nepoškozená | X = 0, Y = 0, šířka 96, výška 140 |
| Poškozená | X = 96, Y = 0, šířka 96, výška 140 |

Vzducholoď má 16 životů. Při 16 používá první výřez; po prvním zásahu,
při 15 až 1 životě, používá druhý. Poškozený stav zůstává až do zničení.
Nejde o animaci, která by se po čase vracela na nepoškozený obrázek.
Při nule životů loď zmizí a vzniknou tři exploze rozmístěné po trupu.
Za zničení se jednorázově přičte 1 000 bodů.

Předloha už míří dolů, takže se na rozdíl od menších lodí neotáčí o 180°.
Varianta se vybírá ze životů, nikoli z bočního pohybu či času.

## 3. Pohyb, výstřely a kolize

Vzducholoď přilétá rychlostí 2 jednotky/s, zastaví se na Y = 6 a vystřelí
tři salvy. Každá obsahuje dvojici střel mířených ze dvou bočních zbraní
na aktuální polohu hráče. Střely letí rychlostí 5 jednotek/s a dál už
nemění směr. Salvy dělí 1,8 s; před výstřelem se rozsvítí obě zbraně.
Potom vzducholoď odletí dolů. Nezničená loď nedá body, ale nezablokuje
konec mise navždy.

Dlouhý trup má tři kolizní kruhy podél osy Y. Všechny sdílejí jedny životy.
Jedna hráčova střela odebere nejvýše jeden život, i když protne několik
překrývajících se kruhů. Stále se testuje celá dráha mezi snímky.

Náraz do hráče vzducholoď automaticky nezničí. Hráči odebere život a zapne
běžnou krátkou nezranitelnost. Kolizní kruhy lze zobrazit stávajícím přepínačem.
Při zničení střelou ve stejném kroku se plánovaná salva už nevytvoří.

## 4. Větší obrázky ve společném atlasu

Atlas má nyní 512 × 512 pixelů a 49 snímků. Efekty a menší lodě si ponechaly
své pozice a velikosti. Dva nové výřezy mají vlastní oblasti 128 × 160
pod řadami malých snímků; nemuseli jsme zvětšit každou původní buňku.

`atlasRegion()` určuje cílový obdélník snímku. Používá se při přípravě
PNG i při výpočtu UV, takže obě části pracují se stejným rozložením.
Poměr stran vzducholodi se při vykreslení zachovává. Celý obraz zabírá
přibližně 4,8 × 7 světových jednotek v záběru vysokém 24 jednotek.

Zdrojový PNG zůstává beze změny. Příprava atlasu dál odstraňuje jen přesnou
barvu pozadí a kontroluje, zda se výřezy vejdou do svých oblastí.

## 5. Přechod a restart

Herní stav nově obsahuje index levelu a skóre uložené při jeho začátku.
Po dokončení levelu 1:

1. Enter nebo tlačítko přepne na level 2.
2. Nasbírané skóre se přenese a uloží jako výchozí skóre druhého levelu.
3. Hráč dostane tři životy a základní zbraň.
4. Zmizí předchozí střely, nepřátelé, efekty i bonusy; čas a vzdálenost letu začnou od nuly.

Při prohře ve druhém levelu se restartuje druhý level, nikoli celá kampaň.
Obnoví se tři životy a skóre ze začátku levelu; body z neúspěšného pokusu
se nezachovávají. Po závěrečném vítězství lze stejným tlačítkem druhý level
znovu odehrát. Obnovení stránky při běžném spuštění začíná od levelu 1.

Přechod používá stále jednu scénu a jedinou animační smyčku. Vykreslování
při změně levelu vyčistí mapy modelů, aby znovu použitá ID nezachovala
například model staršího nepřítele nebo bonusu.

## 6. Debug: start přímo ve druhém levelu

Nejjednodušší příkaz:

```sh
npm run dev:level2
```

Stejný výsledek:

```sh
npm run dev -- --mode level2
```

Ve vývojové hře je navíc vlevo dole tlačítko „Debug: start levelu 2“.
Funguje i nad pauzou nebo výsledkovým panelem. Připraví čistý level 2
se třemi životy, nulovým skóre a bez vylepšení. U tlačítka se při přítomnosti
vzducholodí zobrazují jejich životy a stav „celá / poškozená“.

Debug přeskakování i panel jsou dostupné pouze při vývoji. Produkční
sestavení vždy začíná levelem 1, i kdyby bylo sestavené v režimu `level2`.
Původní `npm run dev -- --mode boss` dál otevírá původního bosse levelu 1.

Pro prohlídku poškozeného trupu střílej krátkou dávkou a pak uvolni mezerník.
Druhá varianta zůstane viditelná i po skončení zásahového bliknutí.
Pauza zastaví životy, polohy i chystané výstřely.

## 7. Kód a ověření

- `src/level.ts`: dvě definice levelů a samostatné vlny konvoje.
- `src/game.ts`: výběr dat levelu, pokračování, checkpoint skóre a konečné výsledky.
- `src/enemies.ts`: typ vzducholodi, více kolizních kruhů a výběr poškozeného spritu.
- `src/sprite-clips.ts`: dvě velké varianty a jejich oblasti v atlasu.
- `src/main.ts`: HUD levelu, pokračování a vývojový panel.
- `src/start-mode.ts`: omezení přímého startu na vývojový režim.
- `tests/level2.test.ts`: druhý level, přechod, restart, poškození a konečnost konvoje.

Kontroly: `npm test` a `npm run build`. Nové testy ověřují také nepřekrývání
atlasových oblastí, zásahy přídě a zádi a jednorázovou odměnu za zničení.
Automatický průchod konvojem používá ochranu hráče jen jako testovací
pomůcku; běžná hra ji nemá.
